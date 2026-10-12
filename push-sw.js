'use strict';
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{};}catch{}
 const title=typeof data.title==='string'?data.title.slice(0,80):'Mimo notification';
 event.waitUntil(self.registration.showNotification(title,{body:'Open Mimo to view.',icon:'./mimo-app-icon-192.png',badge:'./mimo-app-icon-192.png',tag:typeof data.tag==='string'?data.tag.slice(0,80):'mimo-notification',data:{url:safeTarget(data.url)},silent:false}));
});
function safeTarget(value){try{const u=new URL(value,self.location.origin+'/Mimo/');if(u.origin===self.location.origin&&/^\/Mimo\/(index|plaza|support|chat|profile|appointments)\.html$/.test(u.pathname)&&!u.username&&!u.password){const allowed={plaza:'post',support:'ticket',chat:'host',profile:'id'},key=allowed[u.pathname.split('/').pop().split('.')[0]];if(key){const id=u.searchParams.get(key);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||''))throw Error();u.search='?'+key+'='+id;}else u.search='';u.hash='';return u.href;}}catch{}return self.location.origin+'/Mimo/index.html';}
self.addEventListener('notificationclick',event=>{event.notification.close();const target=safeTarget(event.notification.data?.url);event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows)if(client.url===target){await client.focus();return;}await self.clients.openWindow(target);})());});
// No fetch/cache interception: authenticated pages and accepted call/media behavior stay unchanged.
