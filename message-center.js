(function(global){
  'use strict';
  const PAGE_SIZE=30;
  async function inbox(client,offset=0){
    const {data,error}=await client.rpc('mimo_inbox',{page_size:PAGE_SIZE,page_offset:offset});
    if(error||!Array.isArray(data))throw error||new Error('Inbox unavailable');
    return data;
  }
  function readTracker({client,userId,conversationId,visible,onError=()=>{},onSuccess=()=>{}}){
    const pending=new Set();let running=false,disposed=false;
    async function flush(){
      if(disposed||running||!visible()||!pending.size)return;
      running=true;
      try{
        while(!disposed&&visible()&&pending.size){
          const ids=Array.from(pending).slice(0,200);
          const {data,error}=await client.rpc('mimo_mark_read',{chat_id:conversationId,message_ids:ids});
          if(error||typeof data!=='number')throw error||new Error('Receipt unavailable');
          if(disposed)return;
          ids.forEach(id=>pending.delete(id));onSuccess();
        }
      }catch(error){if(!disposed)onError(error);}
      finally{running=false;}
    }
    return {queue(messages){if(disposed)return;for(const m of messages){if(m.id&&m.sender_id!==userId&&m.is_read!==true)pending.add(m.id);}return flush();},flush,dispose(){disposed=true;pending.clear();}};
  }
  function safeAvatar(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
  function renderInbox(document,rows){
    const fragment=document.createDocumentFragment();
    for(const row of rows){
      const link=document.createElement('a');link.className='conversation';link.href='chat.html?host='+encodeURIComponent(row.contact_id);
      const avatar=document.createElement('img');avatar.className='avatar';avatar.alt='';const url=safeAvatar(row.avatar_url);if(url)avatar.src=url;else avatar.hidden=true;
      const info=document.createElement('div');info.className='info';
      const name=document.createElement('div');name.className='name';name.textContent=row.display_name||row.username||'Mimo member';
      const preview=document.createElement('div');preview.className='preview';preview.textContent=row.last_content||(row.last_type==='image'?'Photo':'Start a conversation');
      info.append(name,preview);const meta=document.createElement('div');meta.className='meta';
      const date=document.createElement('time');const value=new Date(row.activity_at);date.textContent=Number.isNaN(value.getTime())?'':value.toLocaleDateString(undefined,{month:'short',day:'numeric'});meta.append(date);
      const unread=Number(row.unread_count);if(unread>0){const badge=document.createElement('span');badge.className='unread';badge.textContent=unread>99?'99+':String(unread);badge.setAttribute('aria-label',unread+' unread messages');meta.append(badge);}
      if(global.MimoMessagingUI){const UI=global.MimoMessagingUI;const shell=UI.avatar(document,row.avatar_url,name.textContent);const unread=Number(row.unread_count);link.classList.toggle('has-unread',unread>0);if(unread>0)preview.textContent=(unread>99?'99+':String(unread))+' new messages · '+(row.last_type==='image'?'Photo':row.last_content||'Open conversation');date.textContent=UI.relative(row.activity_at);date.dateTime=Number.isNaN(value.getTime())?'':value.toISOString();link.append(shell,info,meta);}else link.append(avatar,info,meta);fragment.append(link);
    }
    return fragment;
  }
  global.MimoMessages={inbox,readTracker,renderInbox,PAGE_SIZE};
})(window);
