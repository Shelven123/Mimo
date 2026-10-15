/* Keep four authenticated main destinations alive without sharing controller globals. */
(function(global){
'use strict';
const pages=['index','plaza','messages','me'];
function start(w,client){
 const d=w.document,root=d.body?.dataset.mimoPage;if(!pages.includes(root)||!client?.auth?.getUser||w.MimoTabs)return null;
 const directory=new URL('.',w.location.href),entries=new Map([[root,{win:w,ready:true,loaded:true,title:d.title}]]),mutedRoot=new Map(),bound=new WeakSet();
 let alive=true,enabled=false,owner=null,observed,epoch=0,active=root,pending=null,subscription=null,warmTimer=null;
 const layer=d.createElement('div');layer.className='mimo-tab-layer';layer.hidden=true;layer.setAttribute('aria-label','主页面');d.body.append(layer);
 const style=d.createElement('style');style.textContent='.mimo-tab-layer{position:fixed;z-index:1002;overflow:hidden;background:#090a13;box-sizing:border-box}.mimo-tab-layer[hidden]{display:none!important}.mimo-tab-layer iframe{display:block;border:0;width:100%;height:100%;background:#090a13}.mimo-tab-layer iframe[hidden]{display:none!important}';d.head.append(style);
 function route(href){try{const url=new URL(href,directory);const key=url.pathname.slice(directory.pathname.length).replace(/\.html$/,'');if(url.origin!==directory.origin||!url.pathname.startsWith(directory.pathname)||!pages.includes(key)||url.hash||[...url.searchParams.keys()].some(k=>k!=='v'))return null;return key;}catch{return null;}}
 function geometry(){const r=d.body.getBoundingClientRect();Object.assign(layer.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',borderRadius:w.getComputedStyle(d.body).borderRadius});}
 function visible(entry,value){if(!entry?.win)return;try{entry.win.MimoTabVisible=value;if(!value)for(const media of entry.win.document.querySelectorAll('video,audio'))if(!media.paused)media.pause();entry.win.dispatchEvent(new entry.win.Event('mimo:tab-visibility'));}catch{}}
 function rootAccess(hide){if(hide){for(const el of d.body.children){if(el===layer||el.id==='incomingCall'||['SCRIPT','STYLE','LINK'].includes(el.tagName)||el.classList.contains('mimo-notice'))continue;if(!mutedRoot.has(el))mutedRoot.set(el,{inert:el.inert,aria:el.getAttribute('aria-hidden')});el.inert=true;el.setAttribute('aria-hidden','true');}}else{for(const[el,state]of mutedRoot){el.inert=state.inert;if(state.aria===null)el.removeAttribute('aria-hidden');else el.setAttribute('aria-hidden',state.aria);}mutedRoot.clear();}}
 function activate(key,push){if(!alive||!enabled)return;const entry=entries.get(key);if(!entry?.ready)return;
  visible(entries.get(active),false);active=key;pending=null;
  for(const[k,e]of entries)if(e.frame){e.frame.hidden=k!==key;e.frame.setAttribute('aria-hidden',String(k!==key));}
  rootAccess(key!==root);layer.hidden=key===root;geometry();visible(entry,true);
  if(push){const url=new URL(key+'.html',directory);w.history.pushState({mimoTab:key},'',url.href);}
  d.title=entry.title||entry.win.document.title;try{entry.win.focus();}catch{}
 }
 function ready(key){const e=entries.get(key);if(!e||!e.loaded)return;e.ready=!!e.win.document.querySelector('.mimo-unified-nav');if(e.ready&&pending?.key===key)activate(key,pending.push);}
 function ensure(key){if(entries.has(key))return entries.get(key);const frame=d.createElement('iframe');frame.title={index:'首页',plaza:'广场',messages:'消息',me:'我'}[key];frame.hidden=true;frame.setAttribute('aria-hidden','true');frame.setAttribute('allow','autoplay');const e={frame,win:null,ready:false,loaded:false};entries.set(key,e);
  frame.addEventListener('load',()=>{if(!alive||!entries.has(key))return;try{const url=frame.contentWindow.location.href;if(route(url)!==key){exit(url);return;}e.win=frame.contentWindow;e.title=e.win.document.title;e.loaded=true;bind(e.win);visible(e,active===key);ready(key);}catch{frame.remove();entries.delete(key);if(pending?.key===key){pending=null;w.location.assign(new URL(key+'.html',directory).href);}}});
  frame.src=new URL(key+'.html?v=20261016-tabs4',directory).href;layer.append(frame);return e;
 }
 function navigate(href,push=true){if(!enabled||!alive)return false;const key=route(href);if(!key)return false;if(key===active){pending=null;return true;}const e=ensure(key);if(!e.ready)return false;activate(key,push);return true;}
 function exit(href){try{const url=new URL(href,directory);if(url.origin!==directory.origin)return;w.location.assign(url.href);}catch{}}
 function bind(view){if(bound.has(view))return;bound.add(view);
  view.document.addEventListener('click',event=>{if(!alive||!enabled||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;const link=event.target.closest?.('a[href]');if(!link||link.hasAttribute('download')||link.target&&link.target!=='_self')return;
   if(link.closest('.mimo-unified-nav')&&!link.classList.contains('neon-nav-publish')&&navigate(link.href)){event.preventDefault();return;}
   // Existing handler may still cancel this navigation, e.g. the Plaza composer.
   if(view!==w&&/^https?:/.test(link.href))link.target='_top';
  });
  view.addEventListener('mimo:page-ready',()=>{const key=route(view.location.href);if(key)ready(key);});
 }
 function register(view){for(const[key,e]of entries)if(e.frame?.contentWindow===view){e.win=view;bind(view);visible(e,active===key);ready(key);return true;}return false;}
 function warm(){if(!alive||!enabled)return;const next=pages.find(key=>!entries.has(key));if(next){ensure(next);warmTimer=w.setTimeout(warm,600);}}
 function purge(){pending=null;enabled=false;epoch++;for(const[key,e]of entries)if(e.frame){visible(e,false);try{e.win?.dispatchEvent(new e.win.Event('pagehide'));}catch{}e.frame.remove();entries.delete(key);}layer.hidden=true;rootAccess(false);visible(entries.get(root),false);}
 function changed(){purge();d.body.style.visibility='hidden';w.location.reload();}
 async function authenticate(){const ticket=++epoch;try{const result=await client.auth.getUser();if(!alive||ticket!==epoch||result.error||!result.data?.user)return;owner=result.data.user.id;if(observed!==undefined&&observed!==owner)return;enabled=true;visible(entries.get(root),true);warmTimer=w.setTimeout(warm,1200);}catch{/* Standard links remain available if verification fails. */}}
 function pop(){if(!navigate(w.location.href,false)&&enabled)w.location.reload();}
 function dispose(){if(!alive)return;alive=false;w.clearTimeout(warmTimer);subscription?.unsubscribe();purge();w.removeEventListener('resize',geometry);w.visualViewport?.removeEventListener('resize',geometry);w.removeEventListener('popstate',pop);}
 const api={navigate,register,exit,dispose,isActive:key=>active===key,get active(){return active;}};w.MimoTabs=api;w.MimoTabVisible=true;bind(w);
 subscription=client.auth.onAuthStateChange((event,session)=>{const next=session?.user?.id||null;if(event==='SIGNED_OUT'||(owner&&next!==owner)||(observed!==undefined&&next!==observed)){observed=next;changed();return;}observed=next;}).data.subscription;
 w.addEventListener('resize',geometry);w.visualViewport?.addEventListener('resize',geometry);w.addEventListener('popstate',pop);w.addEventListener('pagehide',dispose,{once:true});authenticate();return api;
}
global.MimoTabRuntime={start};
try{if(global.parent!==global&&global.parent.MimoTabs){global.parent.MimoTabs.register(global);return;}}catch{return;}
const client=typeof sb!=='undefined'?sb:typeof supabaseClient!=='undefined'?supabaseClient:null;
start(global,client);
})(window);
