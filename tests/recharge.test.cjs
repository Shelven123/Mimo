const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite'),{JSDOM}=require('jsdom'),root=path.join(__dirname,'..');
const A='10000000-0000-4000-8000-000000000001',B='20000000-0000-4000-8000-000000000002',P='30000000-0000-4000-8000-000000000003',K='40000000-0000-4000-8000-000000000004';
test('Recharge foundation enforces server prices, receipt uniqueness and atomic credit',async t=>{
 const db=new PGlite();await db.exec(`create role authenticated;create role anon;create role service_role bypassrls;create schema auth;create schema mimo_private;grant usage on schema mimo_private,auth to authenticated,anon;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table wallets(user_id uuid primary key,diamonds bigint);insert into wallets values('${A}',10),('${B}',0);
 create table recharges(id uuid primary key default gen_random_uuid(),user_id uuid not null,diamonds bigint not null,amount numeric not null,currency text default 'MYR',payment_provider text,payment_reference text,status text default 'pending',created_at timestamptz default now(),paid_at timestamptz);
 alter table recharges enable row level security;grant select,insert on recharges to authenticated;
 create policy recharges_select_own on recharges for select using(user_id=auth.uid());create policy recharges_insert_own on recharges for insert with check(user_id=auth.uid());
 create table wallet_transactions(id uuid primary key default gen_random_uuid(),user_id uuid,transaction_type text,amount_diamonds bigint,balance_before bigint,balance_after bigint,related_id uuid,description text,created_at timestamptz default now());`);
 await db.exec(fs.readFileSync(root+'/supabase/migrations/20261010125500_mimo_recharge_foundation.sql','utf8'));
 await db.exec(fs.readFileSync(root+'/supabase/migrations/20261010130500_mimo_recharge_receipt_policy.sql','utf8'));
 await db.exec(`insert into recharge_packages(id,name,diamonds,amount_minor,provider,is_active) values('${P}','Test package',100,399,'testpay',true)`);
 const actor=async(id,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role);};
 const create=async(key=K,packageId=P)=>(await db.query('select mimo_create_recharge($1,$2) as id',[packageId,key])).rows[0].id;
 const settle=async(id,ref,amount='399',provider='testpay',currency='MYR')=>(await db.query('select mimo_confirm_recharge($1,$2,$3,$4,$5) as credited',[id,provider,ref,amount,currency])).rows[0].credited;
 let order,second;
 await t.test('Only configured package prices enter orders; retries preserve their original snapshot',async()=>{
  await actor(A);order=await create();assert.equal(await create(),order);const row=(await db.query('select * from recharges')).rows[0];assert.equal(row.diamonds,100);assert.equal((await db.query('select amount=3.99 as exact from recharges')).rows[0].exact,true);assert.equal(row.status,'pending');
  await db.exec('reset role');await db.exec(`update recharge_packages set amount_minor=999,is_active=false where id='${P}'`);await actor(A);assert.equal(await create(),order);await assert.rejects(create(B),e=>e.code==='22023');await assert.rejects(create(K,B),e=>e.code==='22023');
 });
 await t.test('Clients cannot forge raw orders/paid state or call service-only settlement',async()=>{
  await actor(A);await assert.rejects(db.exec(`insert into recharges(user_id,diamonds,amount,status) values('${A}',999,0,'paid')`),e=>e.code==='42501');await assert.rejects(settle(order,'receipt-1'),e=>e.code==='42501');
  await assert.rejects(db.exec(`update recharge_packages set amount_minor=1 where id='${P}'`),e=>e.code==='42501');
  await assert.rejects(db.query('select * from mimo_private.recharge_receipts'),e=>e.code==='42501');
  await actor(B);assert.equal((await db.query('select * from mimo_recharge_history()')).rows.length,0);await actor(null,'anon');await assert.rejects(create(),e=>e.code==='42501');await assert.rejects(settle(order,'receipt-1'),e=>e.code==='42501');
  await actor(null);await assert.rejects(create(),e=>e.code==='42501');
 });
 await t.test('Mismatched amount/provider/currency never credits; duplicate valid receipt credits once',async()=>{
  await actor(null,'service_role');await assert.rejects(settle(order,'receipt-1','398'),e=>e.code==='22023');await assert.rejects(settle(order,'receipt-1','399','other'),e=>e.code==='22023');await assert.rejects(settle(order,'receipt-1','399','testpay','USD'),e=>e.code==='22023');
  assert.equal(await settle(order,'receipt-1'),true);assert.equal(await settle(order,'receipt-1'),false);await assert.rejects(settle(order,'different'),e=>e.code==='22023');await db.exec('reset role');assert.equal((await db.query(`select diamonds from wallets where user_id='${A}'`)).rows[0].diamonds,110);assert.equal((await db.query('select * from wallet_transactions')).rows.length,1);
 });
 await t.test('Receipt reused for another order rejects atomically; missing wallet retains pending order',async()=>{
  await db.exec('reset role');await db.exec(`update recharge_packages set amount_minor=399,is_active=true where id='${P}'`);await actor(A);second=await create(B);await actor(null,'service_role');await assert.rejects(settle(second,'receipt-1'),e=>e.code==='22023');
  await db.exec('reset role');assert.equal((await db.query(`select status from recharges where id='${second}'`)).rows[0].status,'pending');await db.exec(`delete from wallets where user_id='${A}'`);await actor(null,'service_role');await assert.rejects(settle(second,'receipt-2'),e=>e.code==='22023');
  await db.exec('reset role');assert.equal((await db.query("select * from mimo_private.recharge_receipts where reference='receipt-2'")).rows.length,0);await db.exec(`insert into wallets values('${A}',110)`);
 });
 await t.test('Overflow rolls back receipt/ledger/order; terminal and legacy orders cannot be settled',async()=>{
  await db.exec('reset role');await db.exec(`update wallets set diamonds=9223372036854775807 where user_id='${A}'`);await actor(null,'service_role');await assert.rejects(settle(second,'overflow'),e=>e.code==='22003');await db.exec('reset role');assert.equal((await db.query("select * from mimo_private.recharge_receipts where reference='overflow'")).rows.length,0);
  await db.exec(`update wallets set diamonds=110 where user_id='${A}';update recharges set status='cancelled' where id='${second}'`);await actor(null,'service_role');await assert.rejects(settle(second,'cancelled'),e=>e.code==='22023');
  await db.exec('reset role');const legacy=(await db.query(`insert into recharges(user_id,diamonds,amount,status) values('${A}',100,3.99,'paid') returning id`)).rows[0].id;await actor(null,'service_role');await assert.rejects(settle(legacy,'legacy'),e=>e.code==='22023');
 });
 await t.test('Ledger failure after wallet update rolls back every payment side effect',async()=>{
  await actor(A);const third=await create(P);await db.exec('reset role');await db.exec('alter table wallet_transactions add constraint test_ledger_failure check(false) not valid');
  await actor(null,'service_role');await assert.rejects(settle(third,'ledger-failure'),e=>e.code==='23514');await db.exec('reset role');assert.equal((await db.query(`select diamonds from wallets where user_id='${A}'`)).rows[0].diamonds,110);assert.equal((await db.query(`select status from recharges where id='${third}'`)).rows[0].status,'pending');assert.equal((await db.query("select * from mimo_private.recharge_receipts where reference='ledger-failure'")).rows.length,0);await db.exec('alter table wallet_transactions drop constraint test_ledger_failure');
 });
 await t.test('Rollback disables APIs but retains funds, records and client forgery protection',async()=>{
  await db.exec('reset role');await db.exec(fs.readFileSync(root+'/database/rollback-recharge-foundation.sql','utf8'));assert.equal((await db.query(`select diamonds from wallets where user_id='${A}'`)).rows[0].diamonds,110);assert.equal((await db.query('select * from mimo_private.recharge_receipts')).rows.length,1);assert.equal((await db.query("select has_table_privilege('authenticated','recharges','INSERT') as allowed")).rows[0].allowed,false);
 });await db.close();
});
function helper(){const dom=new JSDOM('',{runScripts:'outside-only'});dom.window.eval(fs.readFileSync(root+'/wallet.js','utf8'));dom.window.eval(fs.readFileSync(root+'/recharge.js','utf8'));return {dom,api:dom.window.MimoRecharge};}
test('Recharge prices retain exact cents and arbitrary-size strings without float rounding',()=>{
 const {dom,api}=helper();assert.equal(api.minor('399'),'3.99');assert.equal(api.minor('1'),'0.01');assert.equal(api.minor('9007199254740993'),'90,071,992,547,409.93');assert.equal(api.decimal('3.9900000000000000'),'3.99');assert.throws(()=>api.minor(399),/Invalid/);dom.window.close();
});
test('Recharge rendering escapes records and never enables purchase buttons or claims checkout',()=>{
 const {dom,api}=helper();dom.window.document.body.append(api.renderPackages(dom.window.document,[{name:'<img onerror=bad>',diamonds:'100',amount_minor:'399',currency:'MYR'}]));assert.equal(dom.window.document.querySelector('img'),null);assert.equal(dom.window.document.querySelector('button').disabled,true);dom.window.close();
});
test('Recharge page clears stale records after logout during history request',async()=>{
 const dom=new JSDOM(fs.readFileSync(root+'/recharge.html','utf8'),{runScripts:'outside-only',url:'https://mimo.test/recharge.html'}),w=dom.window;let auth,release;
 w.MimoRecharge={packages:async()=>[],history:()=>new Promise(r=>release=r),renderPackages(){throw Error('Stale render');}};
 w.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:A}}}),onAuthStateChange(fn){auth=fn;return {data:{subscription:{unsubscribe(){}}}};}}})};
 w.eval(Array.from(w.document.scripts).find(s=>s.textContent.includes('async function init')).textContent);await new Promise(r=>setImmediate(r));auth('SIGNED_OUT',null);release([{id:B}]);await new Promise(r=>setImmediate(r));assert.equal(w.document.querySelector('#orders').children.length,0);assert.equal(w.document.querySelector('#refresh').disabled,true);dom.window.close();
});
