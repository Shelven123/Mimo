const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite'),{JSDOM}=require('jsdom'),root=path.join(__dirname,'..'),A='10000000-0000-4000-8000-000000000001',B='20000000-0000-4000-8000-000000000002';
test('Wallet reads preserve exact amounts and only expose the authenticated owner',async t=>{
 const db=new PGlite();await db.exec(`create role authenticated;create role anon;create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;
 create table wallets(user_id uuid primary key,diamonds bigint);create table wallet_transactions(id uuid default gen_random_uuid(),user_id uuid,transaction_type text,amount_diamonds bigint,balance_before bigint,balance_after bigint,description text,created_at timestamptz default now());
 alter table wallets enable row level security;alter table wallet_transactions enable row level security;grant select on wallets,wallet_transactions to authenticated;
 create policy wallet_own on wallets for select to authenticated using(user_id=auth.uid());create policy history_own on wallet_transactions for select to authenticated using(user_id=auth.uid());
 insert into wallets values('${A}',9007199254740993),('${B}',7);
 insert into wallet_transactions(user_id,transaction_type,amount_diamonds,balance_before,balance_after) values('${A}','recharge',9007199254740993,0,9007199254740993),('${B}','recharge',7,0,7);`);
 await db.exec(fs.readFileSync(root+'/supabase/migrations/20261010114500_mimo_wallet_reads.sql','utf8'));
 const actor=async(id,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role);};
 await t.test('Balance and ledger exact text, pagination and foreign-row exclusion',async()=>{
  await actor(A);assert.equal((await db.query('select * from mimo_wallet_balance()')).rows[0].diamonds,'9007199254740993');const rows=(await db.query('select * from mimo_wallet_history()')).rows;assert.equal(rows.length,1);assert.equal(rows[0].balance_after,'9007199254740993');assert.equal((await db.query('select * from mimo_wallet_history(30,1)')).rows.length,0);
 });
 await t.test('Anonymous functions denied; authenticated role without user sees no wallet',async()=>{
  await actor(null,'anon');await assert.rejects(db.query('select * from mimo_wallet_balance()'),e=>e.code==='42501');await assert.rejects(db.query('select * from mimo_wallet_history()'),e=>e.code==='42501');await actor(null);assert.equal((await db.query('select * from mimo_wallet_balance()')).rows.length,0);assert.equal((await db.query('select * from mimo_wallet_history()')).rows.length,0);
 });
 await t.test('Read API rollback leaves balances and transactions unchanged',async()=>{
  await db.exec('reset role');await db.exec(fs.readFileSync(root+'/database/rollback-wallet-reads.sql','utf8'));assert.equal((await db.query(`select diamonds::text as n from wallets where user_id='${A}'`)).rows[0].n,'9007199254740993');assert.equal((await db.query('select count(*) as n from wallet_transactions')).rows[0].n,2);
 });await db.close();
});
function helper(){const dom=new JSDOM('',{runScripts:'outside-only'});dom.window.eval(fs.readFileSync(root+'/wallet.js','utf8'));return {dom,api:dom.window.MimoWallet};}
test('Wallet formats arbitrary bigint strings without Number rounding and rejects unsafe numeric input',()=>{
 const {dom,api}=helper();assert.equal(api.format('9007199254740993'),'9,007,199,254,740,993');assert.equal(api.format('-123456'),'-123,456');assert.equal(api.format('0'),'0');assert.throws(()=>api.format(9007199254740993),/Invalid/);dom.window.close();
});
test('Missing or failed wallet read never becomes zero; ledger content is rendered safely',async()=>{
 const {dom,api}=helper();await assert.rejects(api.balance({rpc:async()=>({data:[]})}),/unavailable/);await assert.rejects(api.balance({rpc:async()=>({error:Error('offline')})}),/offline/);dom.window.document.body.append(api.render(dom.window.document,[{description:'<img onerror=bad>',amount_diamonds:'1',balance_before:'0',balance_after:'1',created_at:'2026-10-10'}]));assert.equal(dom.window.document.querySelector('img'),null);dom.window.close();
});
test('Wallet clears private rows and suppresses late balance after logout',async()=>{
 const dom=new JSDOM(fs.readFileSync(root+'/wallet.html','utf8'),{runScripts:'outside-only',url:'https://mimo.test/wallet.html'}),w=dom.window;let auth,release;
 w.MimoWallet={balance:()=>new Promise(r=>release=r),history(){throw Error('Must not load');}};
 w.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:A}}}),onAuthStateChange(fn){auth=fn;return {data:{subscription:{unsubscribe(){}}}};}}})};
 w.eval(Array.from(w.document.scripts).find(s=>s.textContent.includes('async function init')).textContent);await new Promise(r=>setImmediate(r));auth('SIGNED_OUT',null);release('100');await new Promise(r=>setImmediate(r));assert.equal(w.document.querySelector('#balance').textContent,'Unavailable');assert.equal(w.document.querySelector('#list').children.length,0);dom.window.close();
});
test('Me wallet uses exact balance and clears it when accounts change or a read fails',async()=>{
 const dom=new JSDOM(fs.readFileSync(root+'/me.html','utf8'),{runScripts:'outside-only',url:'https://mimo.test/me.html'}),w=dom.window;let listener,fail=false;
 w.eval(fs.readFileSync(root+'/wallet.js','utf8'));w.supabase={createClient:()=>({rpc:async()=>fail?{error:Error('offline')}:{data:[{diamonds:'9007199254740993'}]},auth:{getUser:async()=>({data:{user:{id:A}}}),onAuthStateChange(fn){listener=fn;return {data:{subscription:{unsubscribe(){}}}};}}})};
 w.eval(Array.from(w.document.scripts).find(s=>s.textContent.includes('async function loadWallet')).textContent.replace(/init\(\);\s*$/,'')+'\nwindow.readWallet=loadWallet;');await w.readWallet(A);assert.equal(w.document.querySelector('#diamond').textContent,'9,007,199,254,740,993');listener('SIGNED_IN',{user:{id:B}});assert.equal(w.document.querySelector('#diamond').textContent,'Unavailable');fail=true;await w.readWallet(A);assert.equal(w.document.querySelector('#diamond').textContent,'Unavailable');w.dispatchEvent(new w.Event('pagehide'));dom.window.close();
});
