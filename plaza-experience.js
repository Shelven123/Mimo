(function(global){
'use strict';
function create({el,getUser,canAct,mutate,onClose,removeComment}){
 const dialog=el('commentDialog');let row=null,generation=0,pages=1,replyTo=null;
 function clearReply(){replyTo=null;el('replyLabel').hidden=true;el('commentBody').placeholder='Add a comment…';}
 function close(force=false){if(!force&&!canAct())return;generation++;row=null;clearReply();dialog.close?.();dialog.removeAttribute('open');el('discussion').hidden=true;el('comments').replaceChildren();el('commentForm').reset();el('commentStatus').textContent='';onClose();}
 function show(post){if(!canAct())return;generation++;row=post;pages=1;clearReply();el('commentForm').reset();el('commentStatus').textContent='';el('discussion').hidden=false;el('selectedBody').textContent=post.content||'';if(!dialog.open){if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');}}
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
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
 return {show,refresh,close,clearReply,parent:()=>replyTo,dispose:()=>close(true)};
}
global.MimoPlazaExperience={create};
})(window);
