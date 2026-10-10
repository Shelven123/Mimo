(function(global){
 'use strict';
 function format(value){
  if(typeof value!=='string'||!/^[-]?\d+$/.test(value))throw Error('Invalid diamond amount');
  const negative=value.startsWith('-'),digits=(negative?value.slice(1):value).replace(/^0+(?=\d)/,'');
  return (negative&&digits!=='0'?'-':'')+digits.replace(/\B(?=(\d{3})+(?!\d))/g,',');
 }
 async function balance(client){const {data,error}=await client.rpc('mimo_wallet_balance');if(error||data?.length!==1)throw error||Error('Wallet unavailable');format(data[0].diamonds);return data[0].diamonds;}
 async function history(client,offset=0){const {data,error}=await client.rpc('mimo_wallet_history',{page_size:30,page_offset:offset});if(error||!Array.isArray(data))throw error||Error('History unavailable');return data;}
 function render(document,rows){const f=document.createDocumentFragment();for(const row of rows){const card=document.createElement('article');card.className='transaction';
  const title=document.createElement('h2');title.textContent=row.description||row.transaction_type||'Transaction';
  const amount=document.createElement('p');amount.textContent='Amount: '+format(row.amount_diamonds)+' diamonds';
  const balances=document.createElement('p');balances.textContent='Balance: '+format(row.balance_before)+' → '+format(row.balance_after);
  const time=document.createElement('time');time.textContent=new Date(row.created_at).toLocaleString();card.append(title,amount,balances,time);f.append(card);
 }return f;}
 global.MimoWallet={format,balance,history,render};
})(window);
