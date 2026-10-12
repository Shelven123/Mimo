/* Presentation adapters. No new data reads/writes, permissions or media-player mutations. */
(function(){'use strict';const d=document,page=d.body.dataset.mimoPage;let observers=[],alive=true;const cleanup=()=>{alive=false;for(const o of observers)o.disconnect();observers=[];};window.addEventListener('pagehide',cleanup,{once:true});
if(page==='profile'){
 const voice=d.getElementById('referenceVoiceCall'),video=d.getElementById('referenceVideoCall'),existing=d.getElementById('profileCall');
 const sync=()=>{voice.disabled=video.disabled=existing.disabled;};const o=new MutationObserver(sync);o.observe(existing,{attributes:true,attributeFilter:['disabled']});observers.push(o);sync();voice.onclick=()=>existing.click();
 video.onclick=async()=>{const id=new URLSearchParams(location.search).get('id');if(video.disabled||!MimoHosts.uuid(id))return;video.disabled=true;try{if(await MimoContacts.allow(supabaseClient,id,'call')&&alive)location.href='call.html?user='+encodeURIComponent(id)+'&type=video';}catch(e){if(alive)d.getElementById('profileStatus').textContent=e.message||'Call unavailable';}finally{if(alive)sync();}};
}
if(page==='plaza'){
 const feed=d.getElementById('feed'),stories=d.getElementById('referenceStories');let signature='';
 const refresh=()=>{const rows=[...feed.querySelectorAll(':scope>.post')];const authors=new Map();for(const row of rows){const id=row.dataset.author,name=row.querySelector('.author-name'),avatar=row.querySelector('.avatar img');if(id&&name&&!authors.has(id))authors.set(id,{name:name.textContent,href:name.getAttribute('href'),src:avatar?.getAttribute('src')});}const values=[...authors.values()].slice(0,8),key=JSON.stringify(values);if(key===signature)return;signature=key;stories.replaceChildren();const add=d.createElement('button');add.type='button';add.className='reference-story-add';add.innerHTML='<span>＋</span><small>发布动态</small>';add.onclick=()=>{const composer=d.getElementById('composer');if(composer.hidden){location.href='login.html';return;}composer.scrollIntoView({block:'start',behavior:'smooth'});d.getElementById('postBody').focus({preventScroll:true});};stories.append(add);for(const a of values){const link=d.createElement('a');link.className='reference-story';if(a.href)link.href=a.href;const circle=d.createElement('span');if(a.src){const img=d.createElement('img');img.src=a.src;img.alt='';circle.append(img);}else circle.textContent=a.name.slice(0,1);const label=d.createElement('small');label.textContent=a.name;link.append(circle,label);stories.append(link);}};
 const o=new MutationObserver(refresh);o.observe(feed,{childList:true,subtree:true});observers.push(o);refresh();
}
if(page==='chat'){
 // Preserve voice and tool handlers; update icon presentation only.
 const plus=d.getElementById('chatPlus');if(plus)plus.title='Photos, videos and more';
}
})();
