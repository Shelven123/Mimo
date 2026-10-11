/* Feed-only playback: visibility selects one player; sound always requires a tap. */
(function(global){
'use strict';
function create(root, alive=()=>true, blocked=()=>false){
 const doc=root.ownerDocument, records=new Map();let active=null,disposed=false,external=false;
 function stop(video){video.muted=true;if(!video.paused)video.pause();}
 function eligible(){return !disposed&&alive()&&!doc.hidden&&!blocked()&&!external;}
 function label(record){record.sound.textContent=record.video.muted?'♬ Sound off':'♬ Sound on';record.sound.setAttribute('aria-label',record.video.muted?'Turn sound on':'Mute video');record.sound.setAttribute('aria-pressed',String(!record.video.muted));}
 function play(record){const video=record.video;record.play.hidden=true;try{const promise=video.play();promise?.then(()=>{if(active!==video||!eligible())stop(video);},()=>{if(active===video&&!disposed)record.play.hidden=false;});}catch{record.play.hidden=false;}}
 function choose(){let best=null,score=0; if(eligible())for(const [video,r] of records){if(video.isConnected&&r.ratio>=.5&&r.ratio>score){best=video;score=r.ratio;}}
  if(best===active)return;const previous=active;active=best;if(previous)stop(previous);if(best){best.muted=true;label(records.get(best));play(records.get(best));}}
 function toggleSound(record){if(active!==record.video||!eligible())return;record.video.muted=!record.video.muted;label(record);if(record.video.paused)play(record);}
 const observer=typeof global.IntersectionObserver==='function'?new global.IntersectionObserver(entries=>{for(const entry of entries){const r=records.get(entry.target);if(r)r.ratio=entry.isIntersecting?entry.intersectionRatio:0;}choose();},{threshold:[0,.25,.5,.65,.8,1],rootMargin:'-64px 0px -72px 0px'}):null;
 function sync(){if(disposed)return;for(const [video,r] of records)if(!root.contains(video)){observer?.unobserve(video);stop(video);video.removeEventListener('click',r.tap);video.removeEventListener('loadeddata',r.ready);r.sound.remove();r.play.remove();records.delete(video);if(active===video)active=null;}
  for(const video of root.querySelectorAll('video'))if(!records.has(video)){video.muted=true;video.playsInline=true;video.loop=true;video.preload='metadata';if(!observer)continue;video.controls=false;const sound=doc.createElement('button'),playButton=doc.createElement('button');sound.type=playButton.type='button';sound.className='reel-sound';playButton.className='reel-play';playButton.textContent='▶ Play';playButton.hidden=true;const r={video,sound,play:playButton,ratio:0,tap:()=>toggleSound(r)};r.ready=()=>{if(active===video&&eligible()&&video.paused)play(r);};records.set(video,r);video.addEventListener('click',r.tap);video.addEventListener('loadeddata',r.ready);sound.onclick=r.tap;playButton.onclick=()=>{if(active===video&&eligible())play(r);};video.parentNode.append(sound,playButton);label(r);observer.observe(video);}choose();}
 const dialogs=new global.MutationObserver(()=>choose());dialogs.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['open']});
 const mutations=new global.MutationObserver(sync);mutations.observe(root,{childList:true,subtree:true});
 function visibility(){if(doc.hidden){external=false;for(const video of records.keys())stop(video);active=null;}choose();}
 function otherPlay(event){if(event.target.tagName==='VIDEO'&&!root.contains(event.target)){external=true;choose();}}
 function otherPause(event){if(event.target.tagName==='VIDEO'&&!root.contains(event.target)){external=Array.from(doc.querySelectorAll('video')).some(v=>!root.contains(v)&&!v.paused);choose();}}
 doc.addEventListener('visibilitychange',visibility);doc.addEventListener('play',otherPlay,true);doc.addEventListener('pause',otherPause,true);doc.addEventListener('ended',otherPause,true);sync();
 return {sync,refresh:choose,dispose(){disposed=true;observer?.disconnect();mutations.disconnect();dialogs.disconnect();doc.removeEventListener('visibilitychange',visibility);doc.removeEventListener('play',otherPlay,true);doc.removeEventListener('pause',otherPause,true);doc.removeEventListener('ended',otherPause,true);for(const [video,r] of records){stop(video);video.removeEventListener('click',r.tap);video.removeEventListener('loadeddata',r.ready);r.sound.remove();r.play.remove();}records.clear();active=null;}};
}
global.MimoReelPlayback={create};
})(window);
