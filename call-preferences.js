(function(global){
  'use strict';
  const keys=['microphone_enabled','camera_enabled','speaker_enabled'];
  function normalize(row){
    const preferences={};
    for(const key of keys){
      if(row&&typeof row[key]!=='boolean')throw new Error('Invalid call preference');
      preferences[key]=row?row[key]:true;
    }
    return preferences;
  }
  async function load(client,userId,timeoutMs=8000){
    if(!userId)throw new Error('Sign in required');
    const controller=new global.AbortController();let timer;
    try{
      const request=client.from('call_settings').select(keys.join(',')).eq('user_id',userId).abortSignal(controller.signal).maybeSingle();
      const timeout=new Promise((_,reject)=>{timer=global.setTimeout(()=>{controller.abort();reject(new Error('Call settings request timed out'));},timeoutMs);});
      const {data,error}=await Promise.race([request,timeout]);
      if(error)throw error;
      return normalize(data);
    }finally{global.clearTimeout(timer);}
  }
  global.MimoCallPreferences={keys,normalize,load};
})(window);
