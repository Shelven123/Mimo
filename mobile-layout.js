(function(global){
'use strict';
// Restrict only page scaling gestures on touch devices. Single-finger scrolling,
// text editing, native media controls and keyboard/browser zoom stay untouched.
if(global.MimoMobileLayout)return;
const doc=global.document;let attached=false;
function touchDevice(){return global.matchMedia?global.matchMedia('(any-pointer: coarse)').matches:Number(global.navigator.maxTouchPoints)>0;}
function preventScale(event){if(!touchDevice()||!event.cancelable)return;if(event.type==='touchstart'||event.type==='touchmove'){if(event.touches?.length>1)event.preventDefault();}else event.preventDefault();}
const options={capture:true,passive:false};
function attach(){if(attached)return;attached=true;for(const type of ['touchstart','touchmove','gesturestart','gesturechange'])doc.addEventListener(type,preventScale,options);}
function detach(){if(!attached)return;attached=false;for(const type of ['touchstart','touchmove','gesturestart','gesturechange'])doc.removeEventListener(type,preventScale,options);}
function show(event){if(event.persisted)attach();}
attach();global.addEventListener('pagehide',detach);global.addEventListener('pageshow',show);
global.MimoMobileLayout={dispose(){detach();global.removeEventListener('pagehide',detach);global.removeEventListener('pageshow',show);}};
})(window);
