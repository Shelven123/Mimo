(function(global){
'use strict';
const bucket='mimo-support-images',base='https://zhhgiwqehwuwzxnqbnth.supabase.co',uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',pattern=new RegExp('^'+uuid+'/'+uuid+'/'+uuid+'\\.jpg$');
function valid(path){return typeof path==='string'&&pattern.test(path);}
async function upload(client,state,file,path,alive=()=>true){
 if(!valid(path)||path.split('/')[2]!==state.id+'.jpg')throw Error('Invalid support image path.');
 if(!alive())throw Error('Session changed.');
 if(!state.imageBlob){state.imageBlob=await MimoMedia.image(file);if(!alive())throw Error('Session changed.');}
 if(!state.imageUploaded){const {error}=await client.storage.from(bucket).upload(path,state.imageBlob,{contentType:'image/jpeg',upsert:false,cacheControl:'300'});if(error&&String(error.statusCode)!=='409'&&!/already exists|duplicate/i.test(error.message||''))throw Error(error.message||'Image upload failed.');if(!alive())throw Error('Session changed.');state.imageUploaded=true;}
 return path;
}
async function show(client,node,path,alive=()=>true){
 if(!valid(path)){node.alt='Image unavailable';return;}
 try{const {data,error}=await client.storage.from(bucket).createSignedUrl(path,300);if(error||!data?.signedUrl)throw Error('Image unavailable');const url=new URL(data.signedUrl);if(url.origin!==base||url.username||url.password||url.pathname!=='/storage/v1/object/sign/'+bucket+'/'+path)throw Error('Invalid image URL');if(alive()&&node.isConnected)node.src=url.href;}
 catch{if(alive()&&node.isConnected){node.removeAttribute('src');node.alt='Image unavailable. Refresh to retry.';}}
}
global.MimoSupportImages={bucket,valid,upload,show};
})(window);
