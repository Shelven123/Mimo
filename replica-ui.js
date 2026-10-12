/* DOM presentation bindings for the approved composition. No media/player reconstruction. */
(()=>{'use strict';const d=document,page=d.body.dataset.mimoPage;let alive=true;const observers=[];const by=id=>d.getElementById(id);const icon=(kind)=>({sound:'M3 9h4l5-4v14l-5-4H3ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14',mic:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8',video:'M3 6h12v12H3ZM15 10l6-4v12l-6-4',keyboard:'M2 5h20v14H2ZM5 9h.1M9 9h.1M13 9h.1M17 9h.1M5 13h.1M9 13h.1M13 13h.1M17 13h.1M7 16h10',more:'M4 12h.1M12 12h.1M20 12h.1',heart:'M12 21S2 15 2 8a5 5 0 0 1 10-2A5 5 0 0 1 22 8c0 7-10 13-10 13Z',bell:'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Zm5 3h4'}[kind]);const svg=kind=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icon(kind)}"/></svg>`;
function observe(node,fn,options={childList:true,subtree:true}){if(!node)return;const o=new MutationObserver(()=>{if(alive)fn();});o.observe(node,options);observers.push(o);fn();}
for(const button of d.querySelectorAll('[data-search-target]'))button.onclick=()=>{const target=by(button.dataset.searchTarget),wrap=target?.closest('label');if(wrap){wrap.classList.toggle('replica-hidden');if(!wrap.classList.contains('replica-hidden'))target.focus({preventScroll:true});}};
if(page==='index'){for(const b of d.querySelectorAll('button[aria-label="Search hosts"]'))b.onclick=()=>{d.body.classList.toggle('replica-search-open');if(d.body.classList.contains('replica-search-open'))by('searchInput').focus({preventScroll:true});};observe(by('hostList'),()=>{for(const b of d.querySelectorAll('.follow-action .action-icon'))if(!b.querySelector('svg'))b.innerHTML=svg('heart');});}
if(page==='chat'){
 by('replicaContactProfile').onclick=()=>by('chatProfile').click();
 const holds=new Set();
 observe(by('chatArea'),()=>{for(const row of d.querySelectorAll('#chatArea .message-row')){
  if(!row.dataset.replicaMenu){row.dataset.replicaMenu='1';const bubble=row.querySelector('.message');if(bubble){let timer=null,start=null;const cancel=()=>{if(timer){clearTimeout(timer);holds.delete(timer);timer=null;}};const open=()=>row.querySelector('.message-options')?.click();bubble.addEventListener('contextmenu',e=>{if(row.querySelector('.message-options')){e.preventDefault();open();}});bubble.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,a,audio,video'))return;start=[e.clientX,e.clientY];timer=setTimeout(()=>{holds.delete(timer);timer=null;if(alive&&row.isConnected)open();},550);holds.add(timer);});bubble.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start[0],e.clientY-start[1])>12)cancel();});for(const event of ['pointerup','pointercancel','pointerleave'])bubble.addEventListener(event,cancel);}}
  const button=row.querySelector('.voice-bubble-play');if(button&&!button.querySelector('.waveform')){const duration=button.querySelector('strong');if(!duration)continue;const seconds=parseInt(duration.textContent,10)||0;duration.textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');const wave=d.createElement('span');wave.className='waveform';wave.setAttribute('aria-hidden','true');wave.innerHTML=[7,12,18,8,14,20,11,5,12,17,9,13,5,10].map(h=>'<i style="--h:'+h+'px"></i>').join('');duration.before(wave);const play=button.querySelector('svg');if(play)play.innerHTML='<path d="M8 5v14l11-7Z" fill="currentColor"/>';button.style.minWidth='0';}
 }});window.addEventListener('pagehide',()=>{for(const timer of holds)clearTimeout(timer);holds.clear();},{once:true});

 const more=by('chatMore');if(more)more.innerHTML=svg('more');
 by('replicaChatPhoto').onclick=()=>{const plus=by('chatPlus');if(plus.disabled)return;plus.click();const photo=[...by('chatToolPanel').querySelectorAll('button')].find(b=>b.textContent==='Send a photo');photo?.click();};
 by('replicaChatGift').onclick=()=>{if(by('chatPlus').disabled)return;const dialog=by('chatTools'),panel=by('chatToolPanel');by('chatToolTitle').textContent='礼物';panel.replaceChildren();const p=d.createElement('p');p.textContent='礼物发送暂未开放';panel.append(p);dialog.showModal?.();};
 observe(by('inputMode'),()=>{const b=by('inputMode'),mode=d.body.dataset.inputMode==='voice'?'keyboard':'sound';if(b.dataset.replicaIcon!==mode||!b.querySelector('svg')){b.dataset.replicaIcon=mode;b.innerHTML=svg(mode);}},{childList:true,attributes:true,attributeFilter:['aria-pressed']});
 observe(by('chatMore'),()=>{if(!more.querySelector('svg'))more.innerHTML=svg('more');});
 const voice=by('voiceCall'),video=by('videoCall');observe(d.querySelector('.chat-toolbar'),()=>{if(voice.textContent!=='语音通话')voice.textContent='语音通话';if(video.textContent!=='视频通话')video.textContent='视频通话';});
}
if(page==='profile'){
 observe(by('hostName'),()=>{by('replicaHostName').textContent=by('hostName').textContent;});
 const follow=by('profileFollow');observe(follow,()=>{const label=follow.classList.contains('following')?'已关注':'＋ 关注';if(follow.textContent!==label)follow.textContent=label;},{childList:true,attributes:true,attributeFilter:['class']});
 by('replicaTagsTab').onclick=()=>{for(const b of d.querySelectorAll('.host-profile-tabs button')){b.classList.toggle('active',b===by('replicaTagsTab'));b.setAttribute('aria-selected',String(b===by('replicaTagsTab')));}by('aboutPanel').hidden=false;by('postsPanel').hidden=true;by('profileDetails').hidden=true;by('meetHost').hidden=true;};
 for(const b of d.querySelectorAll('[data-tab]'))b.addEventListener('click',()=>{by('profileDetails').hidden=false;by('meetHost').hidden=false;});
}
if(page==='plaza'){
 const feed=by('feed'),main=feed.closest('main'),tabs=d.querySelector('.tabs'),categories=d.querySelector('.media-tabs');main.before(tabs,categories);let sorting='latest';for(const tab of tabs.querySelectorAll('[data-mode]'))tab.addEventListener('click',()=>{sorting=tab.dataset.sort||'latest';});
 observe(feed,()=>{for(const post of feed.children){const actions=post.querySelector('.actions');if(!actions||actions.querySelector('.replica-post-more'))continue;const b=d.createElement('button');b.type='button';b.className='replica-post-more';b.setAttribute('aria-label','更多动态操作');b.innerHTML=svg('more');b.onclick=()=>post.querySelector('.post-head .icon-action')?.click();actions.append(b);}const ordered=[...feed.children].sort((a,b)=>sorting==='hot'?Number(b.dataset.likes)-Number(a.dataset.likes):new Date(b.dataset.createdAt)-new Date(a.dataset.createdAt));if(ordered.some((n,i)=>n!==feed.children[i]))for(const row of ordered)feed.append(row);});
 for(const b of d.querySelectorAll('.replica-category'))b.onclick=()=>{for(const x of categories.querySelectorAll('button'))x.classList.toggle('active',x===b);window.alert(b.dataset.replicaCategory+'分类将在后续配置。');};
}
if(page==='notifications'){
 const list=by('list');let filter=0;
 function decorate(){for(const row of list.children){if(row.classList.contains('notification')&&!row.querySelector('.notice-copy')){const content=d.createElement('div');content.className='notice-copy';for(const node of [...row.children])content.append(node);const avatar=d.createElement('span');avatar.className='system-avatar';avatar.innerHTML=svg('bell');row.append(avatar,content);if(row.classList.contains('unread')){const dot=d.createElement('button');dot.className='unread-dot';dot.setAttribute('aria-label','标为已读');dot.onclick=e=>{e.stopPropagation();content.querySelector('.actions button')?.click();};row.append(dot);}row.tabIndex=0;row.setAttribute('role','link');const open=()=>{const link=content.querySelector('.actions a');if(link)link.click();else content.querySelector('.actions button')?.click();};row.onclick=e=>{if(!e.target.closest('button,a'))open();};row.onkeydown=e=>{if(e.key==='Enter')open();};}const type=row.dataset.noticeType||'',show=filter===0||filter===1&&['message','like','comment','follow','activity','gift','interest'].includes(type)||filter===2&&!['message','like','comment','follow','activity','gift','interest','live'].includes(type)||filter===3&&type==='live';row.hidden=!show;}}
 observe(list,decorate);for(const b of d.querySelectorAll('[data-notice-filter]'))b.onclick=()=>{filter=Number(b.dataset.noticeFilter);for(const x of d.querySelectorAll('[data-notice-filter]'))x.classList.toggle('active',x===b);decorate();};
}
for(const b of d.querySelectorAll('[data-replica-pending]'))b.onclick=()=>{const dialog=d.createElement('dialog');dialog.className='replica-info';const text=d.createElement('p');text.textContent=b.dataset.replicaPending+'：此项将在后续配置。';const close=d.createElement('button');close.type='button';close.textContent='关闭';close.onclick=()=>{dialog.close();dialog.remove();};dialog.append(text,close);d.body.append(dialog);dialog.showModal?.();};
if(page==='call'){
 observe(d.querySelector('.controls'),()=>{for(const [id,kind]of [['muteButton','mic'],['speakerButton','sound'],['cameraButton','video']]){const b=by(id);if(!b.querySelector('svg'))b.innerHTML=svg(kind);}const top=d.querySelector('.replica-call-sound');if(top&&top.disabled!==by('speakerButton').disabled)top.disabled=by('speakerButton').disabled;const labels=[['muteText','麦克风'],['speakerText','扬声器']];for(const [id,label]of labels){const t=by(id);if(t.textContent!==label)t.textContent=label;}},{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
}

if(page==='me'||page==='settings'){
 const client=typeof supabaseClient!=='undefined'?supabaseClient:null;let userId=null,subscription=null,epoch=0,observedId;
 function clearAccount(){if(page==='settings'){by('replicaSettingsName').textContent='个人资料';by('replicaSettingsId').textContent='';d.querySelector('.replica-settings-avatar')?.querySelector('img')?.remove();}else for(const n of d.querySelectorAll('[data-me-count] strong'))n.textContent='—';}
 async function identity(){if(!client)return;try{
  subscription=client.auth.onAuthStateChange((event,session)=>{const next=session?.user?.id||null;if(event==='SIGNED_OUT'||observedId!==undefined&&next!==observedId){epoch++;userId=null;clearAccount();}observedId=next;}).data.subscription;
  const ticket=epoch;const result=await client.auth.getUser();if(!alive||ticket!==epoch||result.error||!result.data?.user)return;const requested=result.data.user.id;userId=requested;
  if(page==='settings'){
   const result=await client.from('profiles').select('id,username,display_name,avatar_url').eq('id',requested).maybeSingle();if(!alive||userId!==requested||result.error||!result.data)return;
   by('replicaSettingsName').textContent=result.data.display_name||result.data.username||'Mimo User';by('replicaSettingsId').textContent=result.data.username?'ID: '+result.data.username:'';
   try{const url=new URL(result.data.avatar_url);if(url.protocol==='https:'&&!url.username&&!url.password){const img=d.createElement('img');img.src=url.href;img.alt='';img.onerror=()=>img.remove();d.querySelector('.replica-settings-avatar').append(img);}}catch{}
  }else{
   const specs=[['following','follows','follower_id'],['followers','follows','following_id'],['posts','posts','author_id']];
   await Promise.allSettled(specs.map(async([key,table,field])=>{const result=await client.from(table).select(field,{count:'exact',head:true}).eq(field,requested);if(!alive||userId!==requested)return;if(!result.error&&Number.isSafeInteger(result.count)){const target=d.querySelector('[data-me-count='+key+']');target.querySelector('strong').textContent=String(result.count);target.title='当前账号可见统计';}}));
  }
 }catch{clearAccount();}}
 identity();window.addEventListener('pagehide',()=>{subscription?.unsubscribe();userId=null;},{once:true});
}

window.addEventListener('pagehide',()=>{alive=false;observers.forEach(o=>o.disconnect());},{once:true});
})();
