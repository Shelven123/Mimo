const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const root=path.join(__dirname,'..');
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',C='00000000-0000-4000-8000-000000000003';
test('Contact RLS migration on isolated PostgreSQL with audited baseline policies',async t=>{
  const db=new PGlite();await db.exec(fs.readFileSync(path.join(__dirname,'contact-policy-fixture.sql'),'utf8'));
  await db.exec(fs.readFileSync(root+'/supabase/migrations/20261009233713_mimo_contact_permissions.sql','utf8'));
  await db.exec(`insert into profiles values('${A}','user'),('${B}','host'),('${C}','user');`);
  const actor=async(id,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role);};
  const admin=async sql=>{await db.exec('reset role');await db.exec(sql);};
  const deny=async sql=>assert.rejects(db.exec(sql),e=>e.code==='42501');
  const perms=async target=>(await db.query('select mimo_contact_permissions($1) as p',[target])).rows[0].p;
  await t.test('Normal contact works while own identity and User-to-Host rule remain enforced',async()=>{
    await actor(A);assert.equal((await perms(B)).call,true);
    await db.exec(`insert into follows values('${A}','${B}');insert into conversations(user_one_id,user_two_id) values('${A}','${B}');insert into calls(caller_id,callee_id,status,call_type) values('${A}','${B}','ringing','video')`);
    await deny(`insert into follows values('${C}','${B}')`);
    await actor(B);assert.equal((await perms(A)).call,false);await deny(`insert into calls(caller_id,callee_id,status) values('${B}','${A}','ringing')`);
  });
  await t.test('Nobody/following protects new chats with the correct follow direction; existing chats continue',async()=>{
    await admin(`insert into privacy_settings(user_id,message_permission,follow_permission) values('${B}','nobody','nobody')`);
    await actor(C);assert.equal((await perms(B)).start_chat,false);await deny(`insert into conversations(user_one_id,user_two_id) values('${C}','${B}')`);await deny(`insert into follows values('${C}','${B}')`);
    await actor(A);assert.equal((await perms(B)).message,true);
    await db.exec(`insert into messages(conversation_id,sender_id,content) select id,'${A}','existing chat' from conversations where user_one_id='${A}'`);
    await admin(`update privacy_settings set message_permission='following' where user_id='${B}'`);
    await actor(C);assert.equal((await perms(B)).start_chat,false);
    await admin(`insert into follows values('${B}','${C}')`);await actor(C);assert.equal((await perms(B)).start_chat,true);
    await db.exec(`insert into conversations(user_one_id,user_two_id) values('${C}','${B}')`);
  });
  await t.test('Either-direction blocks reject direct messages, follow, calls and acceptance; history/cleanup remain usable',async()=>{
    await admin(`insert into blocked_users values('${B}','${A}')`);
    await actor(A);for(const action of ['follow','message','call','start_chat'])assert.equal((await perms(B))[action],false);
    await deny(`insert into messages(conversation_id,sender_id,content) select id,'${A}','blocked' from conversations where user_one_id='${A}'`);
    await deny(`insert into calls(caller_id,callee_id,status) values('${A}','${B}','ringing')`);
    assert.equal((await db.query('select * from messages')).rows.length,1);
    await db.exec(`delete from follows where follower_id='${A}'`);
    await actor(B);assert.equal((await perms(A)).message,false);await deny(`update calls set status='accepted' where caller_id='${A}'`);
    await db.exec(`update calls set status='declined' where caller_id='${A}'`);
    await db.exec(`delete from blocked_users where blocker_id='${B}'`);
    await actor(A);assert.equal((await perms(B)).message,true);
    await admin(`insert into blocked_users values('${A}','${B}')`);await actor(B);assert.equal((await perms(A)).message,false);
    await admin('delete from blocked_users');
  });
  await t.test('Anonymous users cannot see members-only profiles or use contact RPC; signed-in users can view profiles',async()=>{
    await admin(`update privacy_settings set profile_visibility='authenticated' where user_id='${B}'`);
    await actor(null,'anon');assert.equal((await db.query('select * from profiles where id=$1',[B])).rows.length,0);
    await deny(`select mimo_contact_permissions('${B}')`);
    await actor(A);assert.equal((await db.query('select * from profiles where id=$1',[B])).rows.length,1);
  });
  await t.test('Profile-view opt-out and hidden cross-user settings remain enforced',async()=>{
    await actor(A);assert.equal((await db.query('select * from privacy_settings')).rows.length,0);
    await admin(`update privacy_settings set show_profile_views=false where user_id='${B}'`);
    await actor(A);await deny(`insert into profile_views values('${A}','${B}')`);
    await admin(`update privacy_settings set show_profile_views=true where user_id='${B}';insert into privacy_settings(user_id,show_profile_views) values('${A}',false)`);
    await actor(A);await deny(`insert into profile_views values('${A}','${B}')`);
    await admin(`update privacy_settings set show_profile_views=true where user_id='${A}'`);await actor(A);await db.exec(`insert into profile_views values('${A}','${B}')`);
  });
  await t.test('Roles and message/call participants cannot be forged; only recipient accepts ringing calls',async()=>{
    await actor(A);await deny(`update profiles set role='admin' where id='${A}'`);await db.exec(`update profiles set role='user' where id='${A}'`);
    await deny(`update messages set conversation_id=gen_random_uuid() where sender_id='${A}'`);
    await db.exec(`update messages set content='legitimate edit' where sender_id='${A}'`);
    await deny(`update calls set callee_id='${C}' where caller_id='${A}'`);
    await deny(`insert into calls(caller_id,callee_id,status,call_type) values('${A}','${B}','accepted','video')`);
    await db.exec(`insert into calls(caller_id,callee_id,status,call_type) values('${A}','${B}','ringing','video')`);
    await deny(`update calls set status='accepted' where caller_id='${A}' and status='ringing'`);
    await actor(B);await db.exec(`update calls set status='accepted' where caller_id='${A}' and status='ringing'`);
  });
  await t.test('Rollback removes only the new controls and restores the baseline',async()=>{
    await admin(fs.readFileSync(root+'/database/rollback-contact-permissions.sql','utf8'));
    assert.equal((await db.query("select count(*)::int as n from pg_policies where policyname like 'mimo_%'")).rows[0].n,0);
    assert.equal((await db.query("select to_regprocedure('public.mimo_contact_permissions(uuid)') as f")).rows[0].f,null);
    await actor(C);await db.exec(`insert into follows values('${C}','${B}')`);
  });
  await db.close();
});
