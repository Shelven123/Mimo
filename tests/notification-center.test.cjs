const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite'),{JSDOM}=require('jsdom'),root=path.join(__dirname,'..');
const migration=fs.readFileSync(root+'/supabase/migrations/20261010105927_mimo_notification_center.sql','utf8');
const A='10000000-0000-4000-8000-000000000001',B='20000000-0000-4000-8000-000000000002',C='30000000-0000-4000-8000-000000000003';
test('Notification generation and own read state enforce settings and authorization',async t=>{
 const db=new PGlite();await db.exec(fs.readFileSync(__dirname+'/contact-policy-fixture.sql','utf8'));
 await db.exec(`alter table messages add message_type text default 'text';
 create table notification_settings(user_id uuid primary key,private_messages boolean default true,calls boolean default true,new_followers boolean default true);
 create table notifications(id uuid default gen_random_uuid() primary key,user_id uuid,notification_type text,title text,content text,related_user_id uuid,related_id uuid,is_read boolean default false,created_at timestamptz default now());
 alter table notifications enable row level security;grant select,update on notifications to authenticated;
 create policy notifications_select_own on notifications for select using(user_id=auth.uid());
 create policy notifications_update_own on notifications for update using(user_id=auth.uid()) with check(user_id=auth.uid());`);
 await db.exec(fs.readFileSync(root+'/supabase/migrations/20261009233713_mimo_contact_permissions.sql','utf8'));await db.exec(migration);
 await db.exec(`insert into profiles(id,role) values('${A}','user'),('${B}','host'),('${C}','user');insert into conversations(id,user_one_id,user_two_id) values('${C}','${A}','${B}');`);
 const actor=async(id,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role);};
 await t.test('Message, ringing call and follow create only recipient notifications',async()=>{
  await actor(A);await db.exec(`insert into messages(conversation_id,sender_id,content) values('${C}','${A}','hello');insert into calls(caller_id,callee_id,status,call_type) values('${A}','${B}','ringing','video');insert into follows values('${A}','${B}');`);
  assert.equal((await db.query('select * from notifications')).rows.length,0);await actor(B);const rows=(await db.query('select * from notifications')).rows;assert.equal(rows.length,3);assert.ok(rows.every(r=>r.related_user_id===A&&!r.is_read));
 });
 await t.test('Owner may mark read but cannot rewrite identity, content or forge notices',async()=>{
  await actor(B);await db.exec('update notifications set is_read=true');await assert.rejects(db.exec("update notifications set title='forged'"),e=>e.code==='42501');await assert.rejects(db.exec(`insert into notifications(user_id,title,notification_type) values('${B}','forged','system')`),e=>e.code==='42501');
  await actor(C);assert.equal((await db.query('select * from notifications')).rows.length,0);assert.equal((await db.query('update notifications set is_read=false returning id')).rows.length,0);
  await actor(null,'anon');await assert.rejects(db.query('select * from notifications'),e=>e.code==='42501');
 });
 await t.test('Disabled categories suppress new notices and retain old history',async()=>{
  await db.exec('reset role');await db.exec(`insert into notification_settings values('${B}',false,false,false)`);await actor(A);
  await db.exec(`insert into messages(conversation_id,sender_id,content) values('${C}','${A}','silent');insert into calls(caller_id,callee_id,status,call_type) values('${A}','${B}','ringing','voice');delete from follows;insert into follows values('${A}','${B}');`);
  await actor(B);assert.equal((await db.query('select * from notifications')).rows.length,3);
 });
 await t.test('Read state updates do not duplicate notices; rollback keeps history',async()=>{
  await db.exec('reset role');await db.exec('update messages set content=content');assert.equal((await db.query('select * from notifications')).rows.length,3);
  await db.exec(fs.readFileSync(root+'/database/rollback-notification-center.sql','utf8'));assert.equal((await db.query('select * from notifications')).rows.length,3);
 });await db.close();
});
test('Notification renderer escapes content and never answers historical calls',()=>{
 const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window;w.eval(fs.readFileSync(root+'/notification-center.js','utf8'));const api=w.MimoNotifications;
 w.document.body.append(api.render(w.document,[{id:C,notification_type:'call',related_user_id:A,title:'<script>bad</script>',content:'<img onerror=bad>',created_at:'invalid'}],()=>{}));assert.equal(w.document.querySelector('script'),null);assert.equal(w.document.querySelector('h2').textContent,'<script>bad</script>');assert.equal(w.document.querySelector('a').getAttribute('href'),'profile.html?id='+A);assert.equal(api.destination({notification_type:'message',related_user_id:'javascript:bad'}),null);dom.window.close();
});
test('Marking notices uses explicit batches and only changes read state',async()=>{
 const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window;w.eval(fs.readFileSync(root+'/notification-center.js','utf8'));const batches=[];
 await w.MimoNotifications.mark({from(table){assert.equal(table,'notifications');return {update(payload){assert.equal(JSON.stringify(payload),' {"is_read":true}'.trim());return this;},eq(k,v){assert.equal(k,'user_id');assert.equal(v,A);return this;},in(k,ids){assert.equal(k,'id');batches.push(ids);return Promise.resolve({});}};}},A,Array.from({length:201},(_,i)=>String(i)));assert.deepEqual(batches.map(b=>b.length),[200,1]);dom.window.close();
});
test('Logout during pending notifications read clears rows and rejects stale response',async()=>{
 const dom=new JSDOM(fs.readFileSync(root+'/notifications.html','utf8'),{runScripts:'outside-only',url:'https://mimo.test/notifications.html'}),w=dom.window;let auth,release;
 w.MimoNotifications={list:()=>new Promise(r=>release=r),unread:async()=>1,render(){throw Error('Must not render');}};
 w.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:A}}}),onAuthStateChange(fn){auth=fn;return {data:{subscription:{unsubscribe(){}}}};}}})};
 w.eval(Array.from(w.document.scripts).find(s=>s.textContent.includes('async function init')).textContent);await new Promise(r=>setImmediate(r));auth('SIGNED_OUT',null);release([{id:C}]);await new Promise(r=>setImmediate(r));assert.equal(w.document.querySelector('#list').children.length,0);assert.equal(w.document.querySelector('#read').disabled,true);dom.window.close();
});
