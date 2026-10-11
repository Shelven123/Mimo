/* Viewer-only gestures and timeline. Vertical panning remains native scrolling. */
(function(global){
'use strict';
function time(value){value=Math.max(0,Math.floor(Number.isFinite(value)?value:0));return Math.floor(value/60)+':'+String(value%60).padStart(2,'0');}
function attach(record,{isActive,resume}){
 const video=record.video,doc=video.ownerDocument,button=record.pauseButton;let disposed=false,timer=null,pointer=null,holding=false,wasPlaying=false,suppressUntil=0,scrubbing=false;
 const timeline=doc.createElement('div');timeline.className='reel-timeline';const slider=doc.createElement('input');slider.type='range';slider.min='0';slider.max='0';slider.step='.1';slider.value='0';slider.disabled=true;slider.setAttribute('aria-label','Video playback position');const stamp=doc.createElement('span');stamp.className='reel-time';timeline.append(slider,stamp);video.parentNode.append(timeline);
 function update(){if(disposed)return;const duration=Number.isFinite(video.duration)&&video.duration>0?video.duration:0;slider.max=String(duration);slider.disabled=!duration;if(!scrubbing)slider.value=String(Math.min(video.currentTime||0,duration));const current=scrubbing?Number(slider.value):video.currentTime;const text=time(current)+' / '+time(duration);if(stamp.textContent!==text)stamp.textContent=text;slider.setAttribute('aria-valuetext',text);timeline.style.setProperty('--reel-progress',duration?Math.min(100,(current||0)/duration*100)+'%':'0%');const paused=video.paused||record.manualPaused||holding;button.textContent=paused?'▶':'Ⅱ';button.setAttribute('aria-label',paused?'Resume video':'Pause video');button.classList.toggle('is-paused',!!paused);}
 function finish(allowResume=true){clearTimeout(timer);timer=null;pointer=null;if(holding){holding=false;record.holding=false;suppressUntil=Date.now()+700;if(allowResume&&wasPlaying&&!record.manualPaused&&isActive())resume();}wasPlaying=false;update();}
 function down(event){if(disposed||!isActive()||event.isPrimary===false||(event.button!==undefined&&event.button!==0)||pointer)return;suppressUntil=0;pointer={id:event.pointerId,x:event.clientX||0,y:event.clientY||0};timer=setTimeout(()=>{timer=null;if(!pointer||!isActive())return;holding=true;record.holding=true;wasPlaying=!video.paused&&!record.manualPaused;video.pause();update();},200);}
 function move(event){if(!pointer||event.pointerId!==pointer.id)return;if(Math.hypot((event.clientX||0)-pointer.x,(event.clientY||0)-pointer.y)>12){suppressUntil=Date.now()+700;finish();}}
 function up(event){if(pointer&&event.pointerId===pointer.id)finish();if(scrubbing){seek();endSeek();}}
 function visibility(){if(doc.hidden)finish(false);}
 function seek(){if(slider.disabled||!isActive())return;const value=Math.max(0,Math.min(Number(slider.value),video.duration));if(!Number.isFinite(value))return;try{video.currentTime=value;}catch{return;}update();}
 function endSeek(){scrubbing=false;update();}
 const targets=[video,button],context=event=>event.preventDefault();for(const target of targets){target.addEventListener('pointerdown',down);target.addEventListener('contextmenu',context);}
 doc.addEventListener('pointermove',move,{passive:true});doc.addEventListener('pointerup',up);doc.addEventListener('pointercancel',up);doc.addEventListener('visibilitychange',visibility);
 for(const name of ['timeupdate','loadedmetadata','durationchange','play','pause','seeked','error'])video.addEventListener(name,update);
 slider.addEventListener('pointerdown',()=>{scrubbing=true;});slider.addEventListener('input',seek);slider.addEventListener('change',endSeek);slider.addEventListener('pointercancel',endSeek);slider.addEventListener('blur',endSeek);update();
 return {update,suppressTap:()=>{if(holding)return true;const suppress=Date.now()<suppressUntil;suppressUntil=0;return suppress;},cancel:()=>finish(false),dispose(){disposed=true;finish(false);for(const target of targets){target.removeEventListener('pointerdown',down);target.removeEventListener('contextmenu',context);}doc.removeEventListener('pointermove',move);doc.removeEventListener('pointerup',up);doc.removeEventListener('pointercancel',up);doc.removeEventListener('visibilitychange',visibility);for(const name of ['timeupdate','loadedmetadata','durationchange','play','pause','seeked','error'])video.removeEventListener(name,update);timeline.remove();}};
}
global.MimoReelControls={attach,time};
})(window);
