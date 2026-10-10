const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite'),{JSDOM}=require('jsdom'),root=path.join(__dirname,'..');
const A='10000000-0000-4000-8000-000000000001',B='20000000-0000-4000-8000-000000000002',C='30000000-0000-4000-8000-000000000003';
test('Appointments enforce role, ownership, transitions, time and single accepted start slot',async t=>{
 const db=new PGlite();await db.exec(fs.readFileSync(__dirname+'/contact-policy-fixture.sql','utf8'));await db.exec(fs.readFileSync(root+'/supabase/migrations/20261009233713_mimo_contact_permissions.sql','utf8'));
 await db.exec(`create table appointments(id uuid default gen_random_uuid() primary key,user_id uuid,host_id uuid,appointment_time timestamptz,status text default 'pending',note text,created_at timestamptz default now(),updated_at timestamptz default now());
 alter table appointments enable row level security;grant select,insert,update,truncate on appointments to authenticated;
 create policy appointments_select on appointments for select using(user_id=auth.uid() or host_id=auth.uid());
 create policy appointments_insert on appointments for insert with check(user_id=auth.uid() and exists(select 1 from profiles where id=host_id and role='host'));
 create policy appointments_update on appointments for update using(user_id=auth.uid() or host_id=auth.uid()) with check(user_id=auth.uid() or host_id=auth.uid());
 create table notification_settings(user_id uuid primary key,appointments boolean default true);
 create table notifications(id uuid default gen_random_uuid(),user_id uuid,notification_type text,title text,content text,related_user_id uuid,related_id uuid);
 insert into profiles(id,role) values('${A}','user'),('${B}','host'),('${C}','user');`);
 await db.exec(fs.readFileSync(root+'/supabase/migrations/20261010113500_mimo_appointments.sql','utf8'));
 const actor=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
 let first,second;
 await t.test('Only actual Users may request a Host, in future, with bounded notes and pending status',async()=>{
  await actor(A);first=(await db.query(`insert into appointments(user_id,host_id,appointment_time,note) values('${A}','${B}',now()+interval '1 day','hello') returning *`)).rows[0];
  await assert.rejects(db.exec(`insert into appointments(user_id,host_id,appointment_time,status) values('${A}','${B}',now()+interval '1 day','accepted')`),e=>e.code==='42501');
  await assert.rejects(db.exec(`insert into appointments(user_id,host_id,appointment_time) values('${A}','${B}',now()-interval '1 day')`),e=>e.code==='42501');
  await assert.rejects(db.exec(`insert into appointments(user_id,host_id,appointment_time,note) values('${A}','${B}',now()+interval '1 day',repeat('x',501))`),e=>e.code==='42501');
  await actor(B);await assert.rejects(db.exec(`insert into appointments(user_id,host_id,appointment_time) values('${B}','${B}',now()+interval '1 day')`),e=>e.code==='42501');
  await actor(C);second=(await db.query(`insert into appointments(user_id,host_id,appointment_time) values('${C}','${B}','${first.appointment_time.toISOString()}') returning *`)).rows[0];
 });
 await t.test('Requester cannot accept; Host cannot complete before time; identity is immutable',async()=>{
  await actor(A);await assert.rejects(db.exec(`update appointments set status='accepted' where id='${first.id}'`),e=>e.code==='42501');await assert.rejects(db.exec(`update appointments set user_id='${C}' where id='${first.id}'`),e=>e.code==='42501');await assert.rejects(db.exec('truncate appointments'),e=>e.code==='42501');
  await actor(B);await db.exec(`update appointments set status='accepted' where id='${first.id}'`);await assert.rejects(db.exec(`update appointments set status='completed' where id='${first.id}'`),e=>e.code==='42501');await assert.rejects(db.exec(`update appointments set status='accepted' where id='${second.id}'`),e=>e.code==='23505');
 });
 await t.test('Participants can cancel; unrelated users cannot see/update; terminal states cannot reopen',async()=>{
  await actor(C);assert.equal((await db.query(`select * from appointments where id='${first.id}'`)).rows.length,0);assert.equal((await db.query(`update appointments set status='cancelled' where id='${first.id}' returning id`)).rows.length,0);
  await actor(A);await db.exec(`update appointments set status='cancelled' where id='${first.id}'`);await actor(B);await assert.rejects(db.exec(`update appointments set status='accepted' where id='${first.id}'`),e=>e.code==='42501');await db.exec(`update appointments set status='accepted' where id='${second.id}'`);
 });
 await t.test('Appointment notifications follow settings; blocks prevent new requests and acceptance',async()=>{
  await db.exec('reset role');assert.equal((await db.query(`select * from notifications where user_id='${B}'`)).rows.length,3);
  await db.exec(`insert into notification_settings values('${B}',false)`);await actor(A);await db.exec(`insert into appointments(user_id,host_id,appointment_time) values('${A}','${B}',now()+interval '2 days')`);
  await db.exec('reset role');assert.equal((await db.query(`select * from notifications where user_id='${B}'`)).rows.length,3);await db.exec(`insert into blocked_users values('${B}','${A}')`);await actor(A);await assert.rejects(db.exec(`insert into appointments(user_id,host_id,appointment_time) values('${A}','${B}',now()+interval '3 days')`),e=>e.code==='42501');
  await actor(B);await assert.rejects(db.exec(`update appointments set status='accepted' where user_id='${A}' and status='pending'`),e=>e.code==='42501');
 });
 await t.test('Only Host completes after the scheduled time and completion is terminal',async()=>{
  await db.exec('reset role');await db.exec(`update appointments set appointment_time=now()-interval '1 minute' where id='${second.id}'`);
  await actor(C);await assert.rejects(db.exec(`update appointments set status='completed' where id='${second.id}'`),e=>e.code==='42501');
  await actor(B);await db.exec(`update appointments set status='completed' where id='${second.id}'`);await assert.rejects(db.exec(`update appointments set status='cancelled' where id='${second.id}'`),e=>e.code==='42501');
 });
 await t.test('Rollback retains rows and notification history',async()=>{
  await db.exec('reset role');const n=(await db.query('select count(*) n from appointments')).rows[0].n;await db.exec(fs.readFileSync(root+'/database/rollback-appointments.sql','utf8'));assert.equal((await db.query('select count(*) n from appointments')).rows[0].n,n);
 });await db.close();
});
function helper(){const dom=new JSDOM('',{runScripts:'outside-only'});dom.window.eval(fs.readFileSync(root+'/appointments.js','utf8'));return {dom,api:dom.window.MimoAppointments};}
test('Appointment request converts local datetime to ISO and rejects invalid time, self and long notes',()=>{
 const {dom,api}=helper(),now=Date.now();assert.equal(api.request(A,B,new Date(now+10000),'hello',now).status,'pending');for(const date of ['invalid',new Date(now-1),new Date(now+91*86400000)])assert.throws(()=>api.request(A,B,date,'',now),/future time/);assert.throws(()=>api.request(A,A,new Date(now+10000)),/another host/);assert.throws(()=>api.request(A,B,new Date(now+10000),'x'.repeat(501)),/500/);dom.window.close();
});
test('Appointment actions respect participant, role and time and safe rendering',()=>{
 const {dom,api}=helper(),row={id:C,user_id:A,host_id:B,status:'pending',appointment_time:new Date(Date.now()+86400000),note:'<img onerror=bad>'};assert.deepEqual(Array.from(api.actions(row,A)),['cancelled']);assert.deepEqual(Array.from(api.actions(row,B)),['cancelled','accepted','rejected']);assert.equal(api.actions(row,C).length,0);dom.window.document.body.append(api.render(dom.window.document,[row],A,()=>{}));assert.equal(dom.window.document.querySelector('img'),null);dom.window.close();
});
test('Concurrent appointment status changes produce a refresh error rather than false success',async()=>{
 const {dom,api}=helper(),row={id:C,user_id:A,host_id:B,status:'pending',appointment_time:new Date(Date.now()+86400000)};let expected;
 const client={from:()=>({update(){return this;},eq(k,v){if(k==='status')expected=v;return this;},select:async()=>({data:[]})})};await assert.rejects(api.change(client,row,'accepted',B),/changed/);assert.equal(expected,'pending');dom.window.close();
});
test('Signed-out appointment page shows login guidance and cannot submit',async()=>{
 const dom=new JSDOM(fs.readFileSync(root+'/appointments.html','utf8'),{runScripts:'outside-only',url:'https://mimo.test/appointments.html'}),w=dom.window;
 w.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
 w.eval(Array.from(w.document.scripts).find(s=>s.textContent.includes('async function init')).textContent);await new Promise(r=>setImmediate(r));assert.equal(w.document.querySelector('#status a').getAttribute('href'),'login.html');assert.equal(w.document.querySelector('#submit').disabled,true);w.dispatchEvent(new w.Event('pagehide'));dom.window.close();
});
test('Logout during appointment query prevents rendering previous account bookings',async()=>{
 const dom=new JSDOM(fs.readFileSync(root+'/appointments.html','utf8'),{runScripts:'outside-only',url:'https://mimo.test/appointments.html'}),w=dom.window;let auth,release;
 w.MimoAppointments={list:()=>new Promise(r=>release=r),render(){throw Error('Stale render');}};
 w.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:A}}}),onAuthStateChange(fn){auth=fn;return {data:{subscription:{unsubscribe(){}}}};}}})};
 w.eval(Array.from(w.document.scripts).find(s=>s.textContent.includes('async function init')).textContent);await new Promise(r=>setImmediate(r));auth('SIGNED_OUT',null);release([{id:C}]);await new Promise(r=>setImmediate(r));assert.equal(w.document.querySelector('#list').children.length,0);assert.equal(w.document.querySelector('#submit').disabled,true);dom.window.close();
});
