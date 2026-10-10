(function(global){
  'use strict';
  const PAGE_SIZE=30,fields='id,notification_type,title,content,related_user_id,related_id,is_read,created_at';
  async function list(client,userId,offset=0){
    const {data,error}=await client.from('notifications').select(fields).eq('user_id',userId).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+PAGE_SIZE-1);
    if(error||!Array.isArray(data))throw error||Error('Notifications unavailable');return data;
  }
  async function unread(client,userId){
    const {count,error}=await client.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',userId).eq('is_read',false);
    if(error||typeof count!=='number')throw error||Error('Unread count unavailable');return count;
  }
  async function mark(client,userId,ids){
    for(let i=0;i<ids.length;i+=200){
      const {error}=await client.from('notifications').update({is_read:true}).eq('user_id',userId).in('id',ids.slice(i,i+200));
      if(error)throw error;
    }
  }
  function destination(row){
    const id=row.related_user_id;
    if(!id||!/^[0-9a-f-]{36}$/i.test(id))return null;
    if(row.notification_type==='message')return 'chat.html?host='+encodeURIComponent(id);
    if(['call','follow','interest','gift'].includes(row.notification_type))return 'profile.html?id='+encodeURIComponent(id);
    return null;
  }
  function render(document,rows,onRead){
    const fragment=document.createDocumentFragment();
    for(const row of rows){
      const card=document.createElement('article');card.className='notification'+(row.is_read?'':' unread');
      const title=document.createElement('h2');title.textContent=row.title||'Notification';
      const body=document.createElement('p');body.textContent=row.content||'';
      const time=document.createElement('time'),date=new Date(row.created_at);time.textContent=Number.isNaN(date.getTime())?'':date.toLocaleString();
      const actions=document.createElement('div');actions.className='actions';const target=destination(row);
      if(target){const link=document.createElement('a');link.href=target;link.textContent='Open';actions.append(link);}
      if(!row.is_read){const button=document.createElement('button');button.type='button';button.textContent='Mark read';button.onclick=()=>onRead([row.id]);actions.append(button);}
      card.append(title,body,time,actions);fragment.append(card);
    }return fragment;
  }
  global.MimoNotifications={PAGE_SIZE,list,unread,mark,destination,render};
})(window);
