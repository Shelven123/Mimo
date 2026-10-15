const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('me.html','utf8'),tick=()=>new Promise(r=>setImmediate(r));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
function env(){
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://mimo.test/me.html'}),w=dom.window,d=w.document,auth=deferred(),profile=deferred(),wallet=deferred(),vip=deferred(),started=[],listeners=[];
 let authRead=()=>auth.promise,customRead=null;
 const client={auth:{getUser:()=>authRead(),onAuthStateChange(fn){listeners.push(fn);return{data:{subscription:{unsubscribe(){}}}};}},from(table){started.push(table);return{select(){return this;},eq(field,id){this.owner=id;return this;},maybeSingle(){return customRead?customRead(table,this.owner):table==='profiles'?profile.promise:vip.promise;}}}};
 w.supabase={createClient:()=>client};w.MimoWallet={balance:()=>{started.push('wallet');return wallet.promise;},format:v=>String(v)};
 const code=[...d.scripts].find(s=>s.textContent.includes('async function init()')).textContent;
 w.eval(code+'\nwindow.runInit=init;');
 return{w,d,dom,auth,profile,wallet,vip,started,setAuthRead(fn){authRead=fn;},setRead(fn){customRead=fn;},change(event,session){listeners.forEach(fn=>fn(event,session));}};
}
test('Me shell is already visible while auth waits; profile does not wait for slow wallet or VIP',async()=>{
 const e=env();assert.notEqual(e.d.getElementById('content').style.display,'none');assert.equal(e.d.getElementById('loading').hidden,true);assert.equal(e.d.querySelectorAll('.neon-me-tabs').length,1);assert.equal(e.started.length,0);
 e.auth.resolve({data:{user:{id:'owner-a'}}});await tick();assert.deepEqual(e.started,['profiles','wallet','user_vip']);
 e.profile.resolve({data:{id:'owner-a',display_name:'Actual profile',username:'actual'}});await tick();assert.equal(e.d.getElementById('displayName').textContent,'Actual profile');assert.equal(e.d.getElementById('diamond').textContent,'—');assert.equal(e.d.getElementById('loading').hidden,true);
 e.wallet.resolve('42');e.vip.resolve({data:{level:2}});await tick();assert.equal(e.d.getElementById('diamond').textContent,'42');assert.equal(e.d.getElementById('content').getAttribute('aria-busy'),'false');e.dom.window.close();
});
test('Logout clears Me immediately and late profile, wallet and VIP responses cannot restore it',async()=>{
 const e=env();e.auth.resolve({data:{user:{id:'owner-a'}}});await tick();e.change('SIGNED_OUT',null);
 e.profile.resolve({data:{display_name:'Old private name',username:'old',avatar_url:'https://example.test/old.png'}});e.wallet.resolve('99');e.vip.resolve({data:{level:9}});await tick();assert.equal(e.d.getElementById('displayName').textContent.trim(),'—');assert.equal(e.d.getElementById('username').textContent,'');assert.equal(e.d.getElementById('diamond').textContent,'Unavailable');assert.equal(e.d.getElementById('vipLevel').textContent,'VIP —');assert.match(e.d.getElementById('avatar').src,/avatar-placeholder/);e.dom.window.close();
});
test('Account switch while initial identity waits rejects the old identity; auth error offers inline retry',async()=>{
 const e=env();e.change('SIGNED_IN',{user:{id:'owner-b'}});e.auth.resolve({data:{user:{id:'owner-a'}}});await tick();assert.equal(e.started.length,0);assert.equal(e.d.getElementById('displayName').textContent.trim(),'—');e.dom.window.close();
 const f=env();f.auth.resolve({error:Error('offline'),data:{user:null}});await tick();assert.equal(f.d.getElementById('loading').hidden,false);assert.equal(f.d.querySelector('#loading button').textContent,'重试');assert.notEqual(f.d.getElementById('content').style.display,'none');f.dom.window.close();
});

test('Initial and repeated SIGNED_IN for the same account never erase its pending profile or loaded identity',async()=>{const e=env();e.change('SIGNED_IN',{user:{id:'owner-a'}});e.auth.resolve({data:{user:{id:'owner-a'}}});await tick();e.profile.resolve({data:{id:'owner-a',display_name:'Actual owner',username:'actual',avatar_url:'https://example.test/owner.png'}});e.wallet.resolve('42');e.vip.resolve({data:{level:2}});await tick();assert.equal(e.d.getElementById('displayName').textContent,'Actual owner');assert.equal(e.d.getElementById('avatar').src,'https://example.test/owner.png');assert.equal(e.d.getElementById('diamond').textContent,'42');e.change('SIGNED_IN',{user:{id:'owner-a'}});await tick();assert.equal(e.d.getElementById('displayName').textContent,'Actual owner');assert.equal(e.d.getElementById('avatar').src,'https://example.test/owner.png');assert.equal(e.d.getElementById('diamond').textContent,'42');e.dom.window.close();});

test('A genuine account switch clears the old identity and reinitializes the new account outside the auth callback',async()=>{const e=env();e.auth.resolve({data:{user:{id:'owner-a'}}});await tick();e.profile.resolve({data:{id:'owner-a',display_name:'Owner A',avatar_url:'https://example.test/a.png'}});e.wallet.resolve('42');e.vip.resolve({data:{level:1}});await tick();assert.equal(e.d.getElementById('displayName').textContent,'Owner A');e.setAuthRead(async()=>({data:{user:{id:'owner-b'}}}));e.setRead(async(table,id)=>({data:table==='profiles'?{id,display_name:'Owner B',avatar_url:'https://example.test/b.png'}:{level:3}}));e.change('SIGNED_IN',{user:{id:'owner-b'}});assert.equal(e.d.getElementById('displayName').textContent.trim(),'—');await new Promise(r=>setTimeout(r,15));assert.equal(e.d.getElementById('displayName').textContent,'Owner B');assert.equal(e.d.getElementById('avatar').src,'https://example.test/b.png');e.dom.window.close();});
