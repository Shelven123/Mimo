const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=require('node:path').join(__dirname,'..');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
class Track {constructor(kind){this.kind=kind;this.enabled=true;this.readyState='live';this.stops=0;}stop(){this.stops++;this.readyState='ended';}}
class Stream {constructor(tracks){this.tracks=tracks;}getTracks(){return this.tracks;}getVideoTracks(){return this.tracks.filter(t=>t.kind==='video');}getAudioTracks(){return this.tracks.filter(t=>t.kind==='audio');}addTrack(t){this.tracks.push(t);}removeTrack(t){this.tracks=this.tracks.filter(x=>x!==t);}}
async function adapter(config={}){
  let monitor,cleared=0,disposed=0;
  const raw=new Stream([new Track('audio'),new Track('video')]),out=new Track('video');
  const video={videoWidth:120,readyState:4,setAttribute(){},play:async()=>{if(config.fail)throw Error('play failed');},pause(){}};
  const debug={trackingStatus:'ready',processingError:'',lastRenderTime:100};
  const sandbox={document:{hidden:false},MediaStream:Stream,setTimeout,clearTimeout,setInterval:f=>(monitor=f,1),clearInterval:()=>cleared++,performance:{now:()=>100},createBeautyEngine:()=>({canvas:{width:120,height:160},start:()=>new Stream([out]),dispose(){disposed++;out.stop();},getDebug:()=>debug})};
  const source=fs.readFileSync(root+'/beauty-call.js','utf8').replace(/^import .*;$/m,'').replace('export async function','async function');
  vm.createContext(sandbox);vm.runInContext(source+'\nthis.build=createCallBeautyPipeline;',sandbox);
  const failures=[];
  const build=()=>sandbox.build(raw,{enabled:true},reason=>failures.push(reason),{makeVideo:()=>video,Stream});
  return {raw,out,debug,video,failures,build,monitor:()=>monitor(),counts:()=>({cleared,disposed})};
}
test('Call pipeline shares original audio, owns only captured output, and honors camera off',async()=>{
  const f=await adapter(),p=await f.build();assert.equal(p.stream.getAudioTracks()[0],f.raw.getAudioTracks()[0]);
  p.setCameraEnabled(false);assert.equal(f.out.enabled,false);p.dispose();p.dispose();
  assert.deepEqual(f.counts(),{cleared:1,disposed:1});assert.equal(f.out.stops,1);
  for(const t of f.raw.getTracks())assert.equal(t.stops,0);
  assert.equal(f.video.srcObject,null);
});
test('Call source startup failure does not stop original microphone or camera',async()=>{
  const f=await adapter({fail:true});await assert.rejects(f.build(),/play failed/);
  for(const t of f.raw.getTracks())assert.equal(t.stops,0);assert.equal(f.video.srcObject,null);
});
test('Call watchdog requests one raw fallback on model failure',async()=>{
  const f=await adapter(),p=await f.build();f.debug.trackingStatus='unavailable';f.monitor();f.monitor();
  assert.equal(f.failures.length,1);p.dispose();
});
async function call(config={}){
  const dom=new JSDOM(fs.readFileSync(root+'/call.html','utf8'),{url:'https://mimo.test/call.html?type=video',runScripts:'outside-only'}),w=dom.window;
  Object.defineProperty(w.HTMLMediaElement.prototype,'readyState',{get:()=>4});
  Object.defineProperty(w.HTMLVideoElement.prototype,'videoWidth',{get:()=>120});w.HTMLMediaElement.prototype.play=async()=>{};
  const raw=new Stream([new Track('audio'),new Track('video')]);
  const initialCamera=raw.getVideoTracks()[0];
  const state={pipelines:[],replacements:[],queries:0,opening:0,rejectOutput:false};
  const sender={track:raw.getVideoTracks()[0],async replaceTrack(t){state.replacements.push(t);if(state.rejectOutput&&t!==raw.getVideoTracks()[0])throw Error('replace rejected');this.track=t;}};
  const pc={getSenders:()=>[sender],addTrack(){},close(){}};
  w.console.warn=()=>{};w.console.error=()=>{};
  w.RTCPeerConnection=function(){return pc;};w.MediaStream=Stream;
  Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:async()=>{state.opening++;assert.equal(initialCamera.readyState,'ended');return new Stream([new Track('video')]);}}});
  w.supabase={createClient:()=>({from:()=>({select(){state.queries++;return this;},eq(){return this;},maybeSingle:async()=>({data:{enabled:true,slim_face:25}})})})};
  const module={async createCallBeautyPipeline(stream,settings,failure){
    if(config.fail)throw Error('capture unsupported');
    if(config.gate)await config.gate;
    const track=new Track('video');const p={stream:new Stream([...stream.getAudioTracks(),track]),track,failure,updates:[],update(s){this.updates.push(s);},getDebug:()=>({faceDetected:true,landmarkCount:478,trackingStatus:'ready'}),disposed:0,dispose(){this.disposed++;track.stop();},setCameraEnabled(v){track.enabled=v;}};
    state.pipelines.push(p);return p;
  }};
  w.testSetup={raw,pc,module,type:config.voice?'voice':'video'};
  const source=Array.from(dom.window.document.querySelectorAll('script')).find(s=>s.textContent.includes('async function prepareMedia')).textContent.replace(/\ninit\(\);/,'');
  w.eval(source+`\nlocalStream=testSetup.raw;peerConnection=testSetup.pc;callRecord={call_type:testSetup.type};currentUser={id:'me'};beautyModule=testSetup.module;
window.testing={openCallBeautyPanel,closeCallBeautyPanel,initializeCallBeauty,startCallBeauty,toggleCallBeauty,toggleCamera,switchCamera,createPeerConnection,disposeCallBeauty,stopCallBeauty,get:()=>({beautyOutputStream,beautyPipeline,localStream,cameraEnabled,currentFacingMode}),end(){ended=true;disposeCallBeauty();}};`);
  return {dom,w,t:w.testing,state,raw,sender};
}
test('Saved Beauty sends processed video; off restores raw; camera off disables both tracks',async()=>{
  const f=await call();await f.t.initializeCallBeauty();const p=f.state.pipelines[0];
  assert.equal(f.sender.track,p.track);assert.equal(f.t.get().localStream,f.raw);assert.equal(p.stream.getAudioTracks()[0],f.raw.getAudioTracks()[0]);
  f.t.toggleCamera();assert.equal(p.track.enabled,false);assert.equal(f.raw.getVideoTracks()[0].enabled,false);
  await f.t.toggleCallBeauty();assert.equal(f.sender.track,f.raw.getVideoTracks()[0]);assert.equal(f.sender.track.enabled,false);assert.equal(p.disposed,1);assert.equal(f.raw.getAudioTracks()[0].stops,0);f.dom.window.close();
});
test('Failed capture or replaceTrack keeps raw video and original microphone',async()=>{
  for(const fail of [true,false]){
    const f=await call({fail});f.state.rejectOutput=!fail;await f.t.initializeCallBeauty();
    assert.equal(f.sender.track,f.raw.getVideoTracks()[0]);assert.equal(f.t.get().beautyOutputStream,null);assert.equal(f.raw.getAudioTracks()[0].stops,0);
    if(!fail)assert.equal(f.state.pipelines[0].disposed,1);f.dom.window.close();
  }
});
test('Camera flip disposes old processing, releases camera, and rebuilds on the new track',async()=>{
  const f=await call();await f.t.initializeCallBeauty();const old=f.state.pipelines[0],camera=f.raw.getVideoTracks()[0];
  await f.t.switchCamera();await flush();
  assert.equal(old.disposed,1);assert.equal(camera.stops,1);assert.equal(f.state.opening,1);assert.equal(f.t.get().currentFacingMode,'environment');
  assert.equal(f.sender.track,f.state.pipelines[1].track);assert.equal(f.raw.getAudioTracks()[0].stops,0);f.t.end();f.dom.window.close();
});
test('Hangup during Beauty initialization disposes late output without replacing the sender',async()=>{
  let release;const gate=new Promise(r=>release=r),f=await call({gate});const loading=f.t.initializeCallBeauty();await flush();f.t.end();release();await loading;
  assert.equal(f.state.pipelines[0].disposed,1);assert.equal(f.state.replacements.length,0);assert.equal(f.t.get().beautyPipeline,null);f.dom.window.close();
});
test('Runtime Beauty failure restores raw camera without touching microphone',async()=>{
  const f=await call();await f.t.initializeCallBeauty();const p=f.state.pipelines[0];p.failure('model failed');await flush();
  assert.equal(f.sender.track,f.raw.getVideoTracks()[0]);assert.equal(p.disposed,1);assert.equal(f.raw.getAudioTracks()[0].stops,0);f.dom.window.close();
});
test('Voice peer creation never queries or initializes Beauty',async()=>{
  const f=await call({voice:true});await f.t.createPeerConnection();await flush();assert.equal(f.state.queries,0);assert.equal(f.state.pipelines.length,0);f.dom.window.close();
});

test('Turning Beauty off while startup is pending disposes late output',async()=>{
  let release;const gate=new Promise(r=>release=r),f=await call({gate});const loading=f.t.initializeCallBeauty();await flush();
  await f.t.toggleCallBeauty();release();await loading;
  assert.equal(f.state.pipelines[0].disposed,1);assert.equal(f.sender.track,f.raw.getVideoTracks()[0]);assert.equal(f.t.get().beautyOutputStream,null);f.dom.window.close();
});

test('Rejected raw restoration retains a live output and can be retried',async()=>{
  const f=await call();await f.t.initializeCallBeauty();const p=f.state.pipelines[0],replace=f.sender.replaceTrack;
  f.sender.replaceTrack=async()=>{throw Error('temporary RTC failure');};await f.t.toggleCallBeauty();
  assert.equal(f.sender.track,p.track);assert.equal(p.disposed,0);
  f.sender.replaceTrack=replace;await f.t.toggleCallBeauty();
  assert.equal(f.sender.track,f.raw.getVideoTracks()[0]);assert.equal(p.disposed,1);f.dom.window.close();
});

test('Watchdog detects stalled rendering but does not fail a disabled camera',async()=>{
  const f=await adapter(),p=await f.build();f.debug.lastRenderTime=-3000;f.raw.getVideoTracks()[0].enabled=false;f.monitor();assert.equal(f.failures.length,0);
  f.raw.getVideoTracks()[0].enabled=true;f.monitor();assert.match(f.failures[0],/stalled/);p.dispose();
});

test('In-call reshape sliders update the active engine immediately without replacing tracks',async()=>{
  const f=await call();await f.t.initializeCallBeauty();f.t.openCallBeautyPanel();
  const slider=f.w.document.querySelector('[data-beauty-key="slim_face"]');assert.equal(slider.value,'25');
  slider.value='100';slider.dispatchEvent(new f.w.Event('input'));
  assert.equal(f.state.pipelines[0].updates.at(-1).slim_face,100);assert.equal(f.state.replacements.length,1);
  assert.match(f.w.document.getElementById('callBeautyStatus').textContent,/Sending processed video.*Face detected/);
  f.t.end();assert.equal(f.w.document.getElementById('callBeautyPanel').hidden,true);f.dom.window.close();
});

test('Slider changes during model startup reach the engine before output selection',async()=>{
  let release;const gate=new Promise(r=>release=r),f=await call({gate});const loading=f.t.initializeCallBeauty();await flush();f.t.openCallBeautyPanel();
  const slider=f.w.document.querySelector('[data-beauty-key="big_eyes"]');slider.value='80';slider.dispatchEvent(new f.w.Event('input'));release();await loading;
  assert.equal(f.state.pipelines[0].updates[0].big_eyes,80);f.t.end();f.dom.window.close();
});
