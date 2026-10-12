import webpush from 'npm:web-push@3.6.7';
import {createHandler} from './core.mjs';
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
async function rpc(name:string,args:unknown){const r=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Database unavailable');return r.status===204?null:r.json();}
async function getUser(token:string){const r=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});if(!r.ok)return null;const user=await r.json();return user?.id||null;}
Deno.serve(createHandler({rpc,getUser,generateKeys:()=>webpush.generateVAPIDKeys(),randomSecret:()=>crypto.randomUUID()+crypto.randomUUID(),requestDetails:(subscription:unknown,payload:string,options:unknown)=>webpush.generateRequestDetails(subscription,payload,options),fetchPush:fetch}));
