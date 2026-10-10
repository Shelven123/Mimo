(function(global){
 'use strict';
 const PAGE_SIZE=30;
 function request(userId,hostId,time,note='',now=Date.now()){
  const date=new Date(time);if(!userId||!hostId||userId===hostId)throw Error('Choose another host.');
  if(!Number.isFinite(date.getTime())||date.getTime()<=now||date.getTime()>now+90*86400000)throw Error('Choose a future time within 90 days.');
  if(note.length>500)throw Error('Note must be 500 characters or fewer.');
  return {user_id:userId,host_id:hostId,appointment_time:date.toISOString(),note,status:'pending'};
 }
 function actions(row,userId,now=Date.now()){
  const result=[];if(![row.user_id,row.host_id].includes(userId))return result;
  if(['pending','accepted'].includes(row.status))result.push('cancelled');
  if(row.host_id===userId&&row.status==='pending'){if(new Date(row.appointment_time).getTime()>now)result.push('accepted');result.push('rejected');}
  if(row.host_id===userId&&row.status==='accepted'&&new Date(row.appointment_time).getTime()<=now)result.push('completed');return result;
 }
 async function list(client,userId,offset=0){
  const {data,error}=await client.from('appointments').select('id,user_id,host_id,appointment_time,status,note').or('user_id.eq.'+userId+',host_id.eq.'+userId).order('appointment_time',{ascending:false}).order('id',{ascending:false}).range(offset,offset+PAGE_SIZE-1);
  if(error||!Array.isArray(data))throw error||Error('Appointments unavailable');return data;
 }
 async function change(client,row,status,userId){
  if(!actions(row,userId).includes(status))throw Error('Action unavailable. Refresh appointments.');
  const {data,error}=await client.from('appointments').update({status}).eq('id',row.id).eq('status',row.status).select('id');
  if(error)throw error;if(!data?.length)throw Error('Appointment changed. Refresh to see its status.');
 }
 function render(document,rows,userId,onChange){
  const f=document.createDocumentFragment(),labels={accepted:'Accept',rejected:'Reject',cancelled:'Cancel',completed:'Complete'};
  for(const row of rows){const card=document.createElement('article');card.className='appointment';
   const title=document.createElement('h2');title.textContent=row.status.charAt(0).toUpperCase()+row.status.slice(1);
   const time=document.createElement('p');time.textContent=new Date(row.appointment_time).toLocaleString();
   const note=document.createElement('p');note.textContent=row.note||'No note';
   const contact=document.createElement('a');contact.href='profile.html?id='+encodeURIComponent(row.user_id===userId?row.host_id:row.user_id);contact.textContent=row.user_id===userId?'View host':'View requester';
   const buttons=document.createElement('div');buttons.className='actions';buttons.append(contact);
   for(const status of actions(row,userId)){const b=document.createElement('button');b.textContent=labels[status];b.onclick=()=>onChange(row,status);buttons.append(b);}card.append(title,time,note,buttons);f.append(card);
  }return f;
 }
 global.MimoAppointments={PAGE_SIZE,request,actions,list,change,render};
})(window);
