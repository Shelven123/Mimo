const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),migration=fs.readFileSync(root+'/supabase/migrations/20261010072856_mimo_message_center.sql','utf8');
const A='10000000-0000-4000-8000-000000000001',B='20000000-0000-4000-8000-000000000002',C='30000000-0000-4000-8000-000000000003';
test('Inbox and acknowledgement enforce production-style RLS and receipt integrity',async t=>{
 const db=new PGlite();await db.exec(fs.readFileSync(__dirname+'/contact-policy-fixture.sql','utf8'));
 await db.exec(`alter table profiles add display_name text,add username text,add avatar_url text;
 alter table conversations add created_at timestamptz default now();
 alter table messages add message_type text default 'text',add created_at timestamptz default now(),add is_read boolean not null default false;`);
 await db.exec(fs.readFileSync(root+'/supabase/migrations/20261009233713_mimo_contact_permissions.sql','utf8'));await db.exec(migration);
 await db.exec(`insert into profiles(id,role,display_name) values('${A}','user','A'),('${B}','host','B'),('${C}','user','C');
 insert into conversations(user_one_id,user_two_id) values('${A}','${B}'),('${B}','${C}');`);
 const cs=(await db.query('select * from conversations')).rows,ab=cs.find(c=>c.user_one_id===A).id,bc=cs.find(c=>c.user_one_id===B).id;
 const m1=(await db.query(`insert into messages(conversation_id,sender_id,content,created_at) values('${ab}','${B}','incoming','2026-10-10T01:00Z') returning id`)).rows[0].id;
 const own=(await db.query(`insert into messages(conversation_id,sender_id,content,created_at) values('${ab}','${A}','outgoing','2026-10-10T02:00Z') returning id`)).rows[0].id;
 const foreign=(await db.query(`insert into messages(conversation_id,sender_id,content) values('${bc}','${B}','private') returning id`)).rows[0].id;
 const actor=async(id,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role);};
 const ack=async(chat,ids)=>(await db.query('select mimo_mark_read($1,$2::uuid[]) as n',[chat,ids])).rows[0].n;
 const inbox=async()=>(await db.query('select * from mimo_inbox()')).rows;
 await t.test('Only own conversations appear; latest preview and inbound unread count are exact',async()=>{
  await actor(A);const rows=await inbox();assert.equal(rows.length,1);assert.equal(rows[0].contact_id,B);assert.equal(rows[0].last_content,'outgoing');assert.equal(Number(rows[0].unread_count),1);
  assert.equal((await db.query('select * from mimo_inbox(1,1)')).rows.length,0);
 });
 await t.test('Recipient marks only supplied incoming IDs; sender and third party cannot acknowledge',async()=>{
  await actor(A);assert.equal(await ack(ab,[own,foreign]),0);assert.equal(await ack(ab,[m1,own,foreign]),1);assert.equal(await ack(ab,[m1]),0);
  assert.equal(Number((await inbox())[0].unread_count),0);
  await actor(C);await assert.rejects(ack(ab,[own]),e=>e.code==='42501');
  await actor(B);assert.equal(await ack(ab,[own]),1);
 });
 await t.test('New messages after a snapshot stay unread; a block still permits reading history',async()=>{
  await db.exec('reset role');const late=(await db.query(`insert into messages(conversation_id,sender_id,content) values('${ab}','${B}','late arrival') returning id`)).rows[0].id;
  await db.exec(`insert into blocked_users values('${B}','${A}')`);await actor(A);await ack(ab,[m1]);assert.equal(Number((await inbox())[0].unread_count),1);assert.equal(await ack(ab,[late]),1);
 });
 await t.test('Senders cannot forge insert/update receipts but legitimate content edits work',async()=>{
  await actor(B);await assert.rejects(db.exec(`update messages set is_read=false where id='${m1}'`),e=>e.code==='42501');await db.exec(`update messages set content='edit preserved' where id='${m1}'`);
  await db.exec('reset role');await db.exec('delete from blocked_users');await actor(A);
  await assert.rejects(db.exec(`insert into messages(conversation_id,sender_id,content,is_read) values('${ab}','${A}','forged',true)`),e=>e.code==='42501');
  await assert.rejects(ack(ab,Array(1001).fill(m1)),e=>e.code==='22023');
 });
 await t.test('Anonymous execution denied; authenticated role without UID cannot acknowledge',async()=>{
  await actor(null,'anon');await assert.rejects(inbox(),e=>e.code==='42501');await assert.rejects(ack(ab,[m1]),e=>e.code==='42501');
  await actor(null);assert.equal((await inbox()).length,0);await assert.rejects(ack(ab,[m1]),e=>e.code==='42501');
 });
 await t.test('Rollback preserves existing contact controls and stored receipts',async()=>{
  await db.exec('reset role');await db.exec(fs.readFileSync(root+'/database/rollback-message-center.sql','utf8'));
  assert.equal((await db.query("select to_regprocedure('public.mimo_mark_read(uuid,uuid[])') as f")).rows[0].f,null);
  assert.ok((await db.query("select to_regprocedure('public.mimo_contact_permissions(uuid)') as f")).rows[0].f);
  assert.equal((await db.query('select is_read from messages where id=$1',[m1])).rows[0].is_read,true);
 });await db.close();
});
function helper(){const dom=new JSDOM('',{runScripts:'outside-only'});dom.window.eval(fs.readFileSync(root+'/message-center.js','utf8'));return {dom,api:dom.window.MimoMessages};}
test('Hidden chat defers incoming acknowledgements; errors retain IDs for an explicit retry',async()=>{
 const {dom,api}=helper();let visible=false,fail=true,errors=0;const calls=[];
 const tracker=api.readTracker({userId:A,conversationId:'chat',visible:()=>visible,client:{rpc:async(_,p)=>{calls.push(p);return fail?{error:new Error('offline')}:{data:1};}},onError:()=>errors++});
 await tracker.queue([{id:'incoming',sender_id:B,is_read:false},{id:'own',sender_id:A},{id:'read',sender_id:B,is_read:true}]);assert.equal(calls.length,0);
 visible=true;await tracker.flush();assert.equal(errors,1);fail=false;await tracker.flush();assert.equal(calls.length,2);assert.deepEqual(Array.from(calls[1].message_ids),['incoming']);await tracker.flush();assert.equal(calls.length,2);
 tracker.dispose();dom.window.close();
});
test('Concurrent incoming messages are serialized and disposal suppresses late callbacks',async()=>{
 const {dom,api}=helper();let resolve,success=0;const calls=[];
 const tracker=api.readTracker({userId:A,conversationId:'chat',visible:()=>true,client:{rpc:async(_,p)=>{calls.push(p);if(calls.length===1)return new Promise(r=>resolve=r);return {data:1};}},onSuccess:()=>success++});
 const first=tracker.queue([{id:'one',sender_id:B}]);await tracker.queue([{id:'two',sender_id:B}]);resolve({data:1});await first;assert.equal(calls.length,2);assert.deepEqual(Array.from(calls[1].message_ids),['two']);
 let release;const second=api.readTracker({userId:A,conversationId:'chat',visible:()=>true,client:{rpc:()=>new Promise(r=>release=r)},onSuccess:()=>success++});const pending=second.queue([{id:'late',sender_id:B}]);second.dispose();release({data:1});await pending;assert.equal(success,2);dom.window.close();
});
test('Inbox renders safe names/previews/avatars, unread counts and correct contact links',()=>{
 const {dom,api}=helper(),d=dom.window.document;d.body.append(api.renderInbox(d,[{contact_id:'a&b',display_name:'<img onerror=alert(1)>',last_content:'<script>bad</script>',avatar_url:'javascript:bad',unread_count:120,activity_at:'2026-10-10'}]));
 assert.equal(d.querySelector('.name').textContent,'<img onerror=alert(1)>');assert.equal(d.querySelector('script'),null);assert.equal(d.querySelector('.avatar').getAttribute('src'),null);assert.equal(d.querySelector('.unread').textContent,'99+');assert.equal(d.querySelector('a').getAttribute('href'),'chat.html?host=a%26b');dom.window.close();
});
test('Real chat rendering deduplicates messages and handles receipt updates without changing content',()=>{
 const dom=new JSDOM(fs.readFileSync(root+'/chat.html','utf8'),{runScripts:'outside-only',url:'https://mimo.test/chat.html?host='+B}),w=dom.window;
 w.supabase={createClient:()=>({})};const script=Array.from(w.document.querySelectorAll('script')).find(s=>s.textContent.includes('function addMessageToScreen')).textContent.replace(/init\(\);\s*$/,'');
 w.eval(script+`\ncurrentUser={id:'${A}'};addMessageToScreen({id:'out',sender_id:'${A}',content:'hello',is_read:false});addMessageToScreen({id:'out',sender_id:'${A}',content:'hello'});updateReceipt({id:'out',sender_id:'${A}',is_read:true});`);
 assert.equal(w.document.querySelectorAll('.message-row').length,1);assert.equal(w.document.querySelector('.receipt').textContent,'Seen');assert.equal(w.document.querySelector('.message').textContent,'hello');dom.window.close();
});
test('Signed-out inbox provides login guidance without rendering conversations',async()=>{
 const dom=new JSDOM(fs.readFileSync(root+'/messages.html','utf8'),{runScripts:'outside-only',url:'https://mimo.test/messages.html'}),w=dom.window;
 w.eval(fs.readFileSync(root+'/message-center.js','utf8'));
 w.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
 w.eval(Array.from(w.document.querySelectorAll('script')).find(s=>s.textContent.includes('async function init')).textContent);await new Promise(r=>setImmediate(r));
 assert.equal(w.document.querySelector('#status a').getAttribute('href'),'login.html');assert.equal(w.document.querySelectorAll('.conversation').length,0);w.dispatchEvent(new w.Event('pagehide'));dom.window.close();
});
test('Logout during inbox RPC prevents private rows being rendered by a late response',async()=>{
 const dom=new JSDOM(fs.readFileSync(root+'/messages.html','utf8'),{runScripts:'outside-only',url:'https://mimo.test/messages.html'}),w=dom.window;let resolve,authListener,removed=0;
 w.eval(fs.readFileSync(root+'/message-center.js','utf8'));
 w.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:A}}}),onAuthStateChange(fn){authListener=fn;return {data:{subscription:{unsubscribe(){removed++;}}}};}},rpc:()=>new Promise(r=>resolve=r)})};
 w.eval(Array.from(w.document.querySelectorAll('script')).find(s=>s.textContent.includes('async function init')).textContent);await new Promise(r=>setImmediate(r));authListener('SIGNED_OUT',null);
 resolve({data:[{conversation_id:'secret',contact_id:B,last_content:'private'}]});await new Promise(r=>setImmediate(r));assert.equal(w.document.querySelectorAll('.conversation').length,0);assert.equal(w.document.querySelector('#refresh').disabled,true);assert.equal(removed,1);dom.window.close();
});
