(function(g){'use strict';
// Best-effort visit recording; privacy/blocking consent is enforced by existing RLS.
// Called only after a real, visible Host profile has loaded, never in review fixtures.
const inFlight=new Set();
g.MimoProfileVisits={async record(client,target){if(!/^[0-9a-f-]{36}$/i.test(target||'')||inFlight.has(target))return;inFlight.add(target);try{const {data,error}=await client.auth.getUser();const actor=data?.user?.id;if(error||!actor||actor===target)return;const key='mimo-profile-visit/'+actor+'/'+target;let last=0;try{last=Number(sessionStorage.getItem(key)||0);}catch{}if(Date.now()-last<300000)return;const result=await client.from('profile_views').insert({viewer_user_id:actor,viewed_user_id:target});if(!result.error)try{sessionStorage.setItem(key,String(Date.now()));}catch{}}catch{/* A denied visit never prevents opening a profile. */}finally{inFlight.delete(target);}}};
})(window);
