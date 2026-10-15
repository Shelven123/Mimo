(function(){
'use strict';
const d=document,nav=d.querySelector('.mimo-unified-nav');if(!nav)return;
const client=typeof sb!=='undefined'?sb:typeof supabaseClient!=='undefined'?supabaseClient:null;
let alive=true,epoch=0,observed,subscription=null;
const publish=d.createElement('a');publish.className='neon-nav-publish';publish.href='plaza.html?compose=1';publish.setAttribute('aria-label','发布动态');publish.innerHTML='<span aria-hidden="true">＋</span>';
publish.addEventListener('click',event=>{if(d.body.dataset.mimoPage==='plaza'){event.preventDefault();window.MimoPlazaDesign?.openComposer();}});
function hide(){publish.remove();nav.classList.remove('neon-nav-host');}
function show(){if(!alive)return;const messages=nav.querySelector('a[href="messages.html"]');messages.before(publish);nav.classList.add('neon-nav-host');d.dispatchEvent(new CustomEvent('mimo:host-navigation'));}
async function refresh(ticket){try{const result=await client.auth.getUser();if(!alive||ticket!==epoch||result.error||!result.data?.user){if(ticket===epoch)hide();return;}const id=result.data.user.id;const row=await client.from('profiles').select('id,role').eq('id',id).maybeSingle();if(!alive||ticket!==epoch)return;if(!row.error&&row.data?.id===id&&row.data.role==='host')show();else hide();}catch{if(alive&&ticket===epoch)hide();}}
hide();if(client?.auth?.getUser&&client?.from){subscription=client.auth.onAuthStateChange((event,session)=>{const next=session?.user?.id||null;if(event==='SIGNED_OUT'||next!==observed){observed=next;const ticket=++epoch;hide();if(next)setTimeout(()=>{if(alive&&ticket===epoch)refresh(ticket);},0);}}).data.subscription;refresh(epoch);}
window.addEventListener('pagehide',()=>{alive=false;epoch++;hide();subscription?.unsubscribe();},{once:true});
})();
