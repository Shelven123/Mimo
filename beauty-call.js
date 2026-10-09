// Video-call adapter. Owns only the processing source and captured output, never the camera/audio.
import {createBeautyEngine} from "./beauty-engine.js?v=20261010-v272-call1";
export async function createCallBeautyPipeline(rawStream, settings, onFailure, dependencies = {}) {
  const makeEngine=dependencies.makeEngine||createBeautyEngine;
  const source=dependencies.makeVideo?dependencies.makeVideo():document.createElement("video");
  source.muted=true;source.autoplay=true;source.playsInline=true;
  source.setAttribute("playsinline","");source.srcObject=rawStream;
  if(source.style){
    source.style.cssText="position:fixed;left:-2px;top:-2px;width:1px;height:1px;opacity:0;pointer-events:none";
    source.setAttribute("aria-hidden","true");document.body.appendChild(source);
  }
  let engine=null,output=null,watch=null,disposed=false,failed=false;
  const dispose=()=>{
    if(disposed)return;disposed=true;
    if(watch!==null)clearInterval(watch);
    engine?.dispose();source.pause();source.srcObject=null;source.remove?.();
  };
  try {
    let timeout;
    try {
      await Promise.race([source.play(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error("Beauty source timed out")),1500);})]);
    } finally {clearTimeout(timeout);}
    if(!source.videoWidth||source.readyState<2)throw new Error("Beauty source is not ready");
    engine=makeEngine(source,settings);output=engine.start(24);
    const track=output.getVideoTracks()[0];
    if(!track||!engine.canvas.width||!engine.canvas.height)throw new Error("Beauty output unavailable");
    const Stream=dependencies.Stream||MediaStream;
    const stream=new Stream([...rawStream.getAudioTracks(),track]);
    const fail=reason=>{if(disposed||failed)return;failed=true;onFailure(reason);};
    watch=setInterval(()=>{
      if(disposed||document.hidden||!rawStream.getVideoTracks()[0]?.enabled)return;
      const debug=engine.getDebug();
      if(track.readyState==="ended")fail("Beauty output ended");
      else if(debug.processingError||debug.trackingStatus==="unavailable")fail(debug.processingError||"Beauty tracking unavailable");
      else if(Number.isFinite(debug.lastRenderTime)&&performance.now()-debug.lastRenderTime>2000)fail("Beauty rendering stalled");
    },1000);
    return {stream,track,dispose,setCameraEnabled(enabled){track.enabled=enabled;}};
  } catch(error) {dispose();throw error;}
}
