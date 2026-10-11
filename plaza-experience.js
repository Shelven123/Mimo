(function(global){
'use strict';
function create({el,getUser,canAct,mutate,onClose,removeComment,present=()=>false}){
 const dialog=el('commentDialog');let row=null,generation=0,pages=1,replyTo=null;
 const handle=el('commentHandle');let drag=null,dragClickUntil=0;
 function resetDrag(){drag=null;dialog.style.transform='';dialog.classList.remove('is-dragging');}
 function down(event){if(event.isPrimary===false||event.button>0||!dialog.hasAttribute('open')||!canAct())return;dragClickUntil=0;drag={id:event.pointerId,y:event.clientY,x:event.clientX,distance:0};handle.setPointerCapture?.(event.pointerId);event.preventDefault();}
 function move(event){if(!drag||drag.id!==event.pointerId)return;if(Math.abs(event.clientX-drag.x)>40&&Math.abs(event.clientY-drag.y)<30){resetDrag();return;}drag.distance=Math.max(0,event.clientY-drag.y);dialog.classList.add('is-dragging');dialog.style.transform='translateY('+Math.min(drag.distance,400)+'px)';event.preventDefault();}
 function up(event){if(!drag||drag.id!==event.pointerId)return;const dismiss=drag.distance>=64;if(drag.distance>4)dragClickUntil=Date.now()+700;resetDrag();if(dismiss)close();}
 function cancel(){if(drag)dragClickUntil=Date.now()+700;resetDrag();}
 handle?.addEventListener('pointerdown',down);handle?.addEventListener('pointermove',move);handle?.addEventListener('pointerup',up);handle?.addEventListener('pointercancel',cancel);handle?.addEventListener('lostpointercapture',cancel);if(handle)handle.onclick=()=>{if(Date.now()>=dragClickUntil)close();};
 function clearReply(){replyTo=null;el('replyLabel').hidden=true;el('commentBody').placeholder='Add a comment…';}
 function close(force=false){if(!force&&!canAct())return;generation++;resetDrag();row=null;clearReply();dialog.close?.();dialog.removeAttribute('open');el('discussion').hidden=true;el('comments').replaceChildren();el('commentForm').reset();el('commentStatus').textContent='';onClose();}
 function show(post){if(!canAct())return;generation++;row=post;pages=1;clearReply();el('commentForm').reset();el('commentStatus').textContent='';el('discussion').hidden=false;el('selectedBody').textContent=post.content||'';if(!dialog.open){if(present(dialog,post)){if(dialog.show)dialog.show();else dialog.setAttribute('open','');}else if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');}}
 function reply(comment){if(!canAct())return;replyTo=comment.parent_id||comment.id;el('replyLabel').hidden=false;el('replyName').textContent='Replying to '+comment.author_name;el('commentBody').placeholder='Reply to '+comment.author_name+'…';el('commentBody').focus();}
 const handlers={reply,like:comment=>mutate(()=>global.mimoPlazaClient.rpc('mimo_comment_like',{target_comment:comment.id,liked:!comment.liked}).then(({error})=>{if(error)throw error;})),expand:async(comment,article,button)=>{
  if(!canAct()||!row)return;const existing=article.querySelector('.comment-thread');if(existing){existing.remove();button.textContent='View replies ('+comment.replies+')';return;}
  const token=generation,owner=getUser(),post=row.id;button.disabled=true;const thread=document.createElement('div');thread.className='comment-thread';let offset=0;
  async function more(){button.disabled=true;try{const replies=await MimoPlaza.comments(global.mimoPlazaClient,post,offset,comment.id);if(token!==generation||owner!==getUser()||!article.isConnected)return;thread.querySelector('.thread-more')?.remove();thread.append(MimoPlaza.renderComments(document,replies,owner,removeComment,handlers));offset+=replies.length;if(replies.length===30){const next=document.createElement('button');next.className='thread-more';next.textContent='More replies';next.onclick=()=>{if(canAct())more();};thread.append(next);}button.textContent='Hide replies';if(!thread.isConnected)article.append(thread);}catch{if(token===generation){button.textContent='Unable to load replies · retry';}}finally{button.disabled=!canAct();}}
  await more();
 }};
 async function refresh(){if(!row)return;const post=row.id,token=++generation,owner=getUser(),rows=[],seen=new Set();let batch=[];for(let page=0;page<pages;page++){batch=await MimoPlaza.comments(global.mimoPlazaClient,post,page*30);if(token!==generation||owner!==getUser())return;for(const item of batch)if(!seen.has(item.id)){seen.add(item.id);rows.push(item);}if(batch.length<30)break;}el('comments').replaceChildren(MimoPlaza.renderComments(document,rows,owner,removeComment,handlers));el('emptyComments').hidden=rows.length>0;el('moreComments').hidden=batch.length<30;el('commentTitle').textContent='Comments';}
 el('moreComments').onclick=()=>{if(canAct()){pages++;refresh().catch(()=>{el('emptyComments').textContent='Unable to load comments. Retry.';el('emptyComments').hidden=false;});}};
 el('closeDiscussion').onclick=()=>close();el('cancelReply').onclick=clearReply;
 for(const emoji of el('commentEmoji').querySelectorAll('button'))emoji.onclick=()=>{if(!canAct())return;const input=el('commentBody'),start=input.selectionStart||0,end=input.selectionEnd||0;if(input.value.length-(end-start)+emoji.textContent.length>1000)return;input.setRangeText(emoji.textContent,start,end,'end');input.focus();};
 dialog.addEventListener('cancel',event=>{event.preventDefault();event.stopPropagation();close();});dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
 return {show,refresh,close,clearReply,parent:()=>replyTo,dispose(){close(true);handle?.removeEventListener('pointerdown',down);handle?.removeEventListener('pointermove',move);handle?.removeEventListener('pointerup',up);handle?.removeEventListener('pointercancel',cancel);handle?.removeEventListener('lostpointercapture',cancel);if(handle)handle.onclick=null;}};
}
global.MimoPlazaExperience={create};
})(window);
