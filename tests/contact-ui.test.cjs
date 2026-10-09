const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');const root=path.join(__dirname,'..');
function helper(){const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window;const notices=[];w.alert=m=>notices.push(m);w.console.warn=()=>{};w.eval(fs.readFileSync(root+'/contact-permissions.js','utf8'));return {dom,w,notices};}
test('Contact UI denies blocked/privacy actions and permission errors instead of assuming permission',async()=>{
  const f=helper();assert.equal(await f.w.MimoContacts.allow({rpc:async()=>({data:{message:false}})},'target','message'),false);
  assert.equal(await f.w.MimoContacts.allow({rpc:async()=>({error:{message:'not deployed'}})},'target','call'),false);
  assert.equal(await f.w.MimoContacts.allow({rpc:async()=>({data:{follow:true}})},'target','follow'),true);assert.equal(f.notices.length,2);f.dom.window.close();
});
test('Block and unblock use authenticated owner filters and idempotent inserts',async()=>{
  const f=helper(),ops=[];const client={from(table){assert.equal(table,'blocked_users');return {upsert(payload,options){ops.push({payload,options});return Promise.resolve({});},delete(){ops.push('delete');return this;},eq(k,v){ops.push([k,v]);return this;},then(resolve){resolve({});}};}};
  await f.w.MimoContacts.setBlocked(client,'actor','target',true);assert.equal(ops[0].options.ignoreDuplicates,true);assert.equal(ops[0].payload.blocker_id,'actor');
  await f.w.MimoContacts.setBlocked(client,'actor','target',false);assert.equal(ops[2][0],'blocker_id');assert.equal(ops[3][0],'blocked_id');await assert.rejects(f.w.MimoContacts.setBlocked(client,'actor','actor',true));f.dom.window.close();
});
test('Blocked list renders text safely and permits unblock when a profile is unavailable',async()=>{
  const dom=new JSDOM(fs.readFileSync(root+'/blocked-users.html','utf8'),{runScripts:'outside-only'}),w=dom.window;const deleted=[];
  w.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'actor'}}})},from(table){return {select(){return this;},eq(k,v){if(table==='blocked_users'&&k==='blocked_id')deleted.push(v);return this;},in(){return this;},delete(){return this;},then(resolve){resolve({data:table==='blocked_users'?[{blocked_id:'target'},{blocked_id:'missing'}]:[{id:'target',display_name:'<img src=x onerror=alert(1)>',avatar_url:'javascript:alert(1)'}]});}};}})};
  const script=Array.from(w.document.querySelectorAll('script')).find(s=>s.textContent.includes('async function load')).textContent;w.eval(script);await new Promise(r=>setImmediate(r));
  assert.equal(w.document.querySelectorAll('.person').length,2);assert.equal(w.document.querySelector('.name').textContent,'<img src=x onerror=alert(1)>');assert.equal(w.document.querySelector('.avatar').getAttribute('src'),null);
  await w.document.querySelectorAll('.unblock')[1].onclick();assert.equal(deleted[0],'missing');dom.window.close();
});
