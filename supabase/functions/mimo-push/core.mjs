const APP='https://shelven123.github.io/Mimo/';
const endpoints=new Set(['web.push.apple.com','fcm.googleapis.com','updates.push.services.mozilla.com']);
export function allowedEndpoint(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&endpoints.has(u.hostname)&&value.length<=2048;}catch{return false;}}
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v||'');
export function payload(job){let path='index.html';if(['activity','like','comment'].includes(job.notification_type)&&uuid(job.related_id))path='plaza.html?post='+job.related_id;else if(job.notification_type==='support'&&uuid(job.related_id))path='support.html?ticket='+job.related_id;else if(job.notification_type==='message'&&uuid(job.related_user_id))path='chat.html?host='+job.related_user_id;else if(job.notification_type==='appointment')path='appointments.html';else if(['call','follow'].includes(job.notification_type)&&uuid(job.related_user_id))path='profile.html?id='+job.related_user_id;const titles={activity:'New update from a Host you follow',like:'Someone liked your update',comment:'New comment or reply',message:'New message',call:'Incoming call',follow:'New follower',support:'Support update',appointment:'Appointment update'};return {title:titles[job.notification_type]||'Mimo notification',body:'Open Mimo to view.',url:APP+path,tag:'mimo-'+job.job_id};}
export function createHandler({rpc,getUser,generateKeys,randomSecret,requestDetails,fetchPush}){
 const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'https://shelven123.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'}});
 return async req=>{
  if(req.method==='OPTIONS')return response({});
  if(req.method!=='POST')return response({error:'Method unavailable'},405);
  try{if(Number(req.headers.get('content-length')||0)>4096)return response({error:'Request too large'},413);const reader=req.body?.getReader(),decoder=new TextDecoder();let text='',size=0;if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return response({error:'Request too large'},413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();const input=JSON.parse(text),token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
   if(input.action==='config'){
    if(!token||!await getUser(token))return response({error:'Sign in required'},401);
    let config=await rpc('mimo_push_config',{});if(!config){const keys=generateKeys();config=await rpc('mimo_push_config',{p_public:keys.publicKey,p_secret:JSON.stringify({privateKey:keys.privateKey,cronSecret:randomSecret()})});}
    return response({publicKey:config.publicKey});
   }
   if(input.action!=='dispatch')return response({error:'Invalid action'},400);
   const config=await rpc('mimo_push_config',{});if(!config||!token||token!==config.secret.cronSecret)return response({error:'Unauthorized'},401);
   const jobs=await rpc('mimo_claim_push',{});let processed=0;
   await Promise.all(jobs.map(async job=>{
    let outcome='retry';try{
     if(!allowedEndpoint(job.endpoint))outcome='gone';else{
      const details=requestDetails({endpoint:job.endpoint,keys:{p256dh:job.p256dh,auth:job.auth_key}},JSON.stringify(payload(job)),{TTL:60,urgency:'high',vapidDetails:{subject:APP,publicKey:config.publicKey,privateKey:config.secret.privateKey}});
      const result=await fetchPush(details.endpoint,{method:'POST',headers:details.headers,body:details.body,redirect:'error',signal:AbortSignal.timeout(8000)});
      outcome=result.status===404||result.status===410?'gone':result.ok?'sent':'retry';
     }
    }catch{/* Retain queue lease for bounded retry; never log endpoints or keys. */}
    await rpc('mimo_finish_push',{p_job:job.job_id,p_result:outcome});processed++;
   }));return response({processed});
  }catch{return response({error:'Push unavailable. Retry later.'},503);}
 };
}
