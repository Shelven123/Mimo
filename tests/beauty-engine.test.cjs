// Run with: node --test tests/beauty-engine.test.cjs
// Uses real Canvas pixels and fake model outputs; does not verify MediaPipe or iPhone.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {createCanvas} = require('@napi-rs/canvas');
const source = fs.readFileSync(require('node:path').join(__dirname, '../beauty-engine.js'), 'utf8')
  .replace('export function', 'function')
  .replace('await import(base + "/vision_bundle.mjs")', 'await loadVision()');

async function fixture(options = {}, deferred = false) {
  let now = 1000, nextFrame, release;
  const stats = {detect: [], segment: [], trackerClosed: 0, segmenterClosed: 0, masksClosed: 0, segmenterLoads: 0};
  const points = Array.from({length:478}, () => ({x:.5,y:.5,z:0}));
  const set = (id,x,y) => points[id] = {x,y,z:0};
  set(234,.2,.45);set(454,.8,.45);set(1,.5,.5);set(152,.5,.85);set(10,.5,.15);
  set(33,.3,.35);set(133,.43,.35);set(263,.7,.35);set(362,.57,.35);
  for(const [ids,x] of [[[132,58,172,136,150],.25],[[361,288,397,365,379],.75]])ids.forEach((id,i)=>set(id,x,.5+i*.06));
  set(98,.44,.55);set(327,.56,.55);
  const video = createCanvas(120,160), context = video.getContext('2d');
  for(let y=0;y<160;y++)for(let x=0;x<120;x++){
    context.fillStyle=(x+y)%2?'#fff':'#000';context.fillRect(x,y,1,1);
  }
  Object.assign(video,{videoWidth:120,videoHeight:160,readyState:4,currentTime:1});
  const tracker = {detectForVideo(input,timestamp){stats.detect.push(timestamp);return {faceLandmarks:[points]};},close(){stats.trackerClosed++;}};
  const segmenter = {segmentForVideo(input,timestamp){stats.segment.push(timestamp);return {
    categoryMask:{width:120,height:160,getAsUint8Array(){return Uint8Array.from({length:120*160},(_,i)=>i%120<60?1:0);}},
    close(){stats.masksClosed++;}
  };},close(){stats.segmenterClosed++;}};
  const library = {
    FilesetResolver:{forVisionTasks:async()=>({})},
    FaceLandmarker:{createFromOptions:async()=> deferred ? await new Promise(resolve=>{release=()=>resolve(tracker);}) : tracker},
    ImageSegmenter:{createFromOptions:async(files,opts)=>{stats.segmenterLoads++;assert.match(opts.baseOptions.modelAssetPath,/\/1\/selfie_segmenter\.tflite$/);return segmenter;}}
  };
  const sandbox = {
    document:{createElement(){const c=createCanvas(1,1);c.captureStream=()=>({getTracks:()=>[{stop(){}}]});return c;}},
    performance:{now:()=>now},requestAnimationFrame:fn=>(nextFrame=fn,1),cancelAnimationFrame:()=>{nextFrame=null;},
    loadVision:async()=>library,console
  };
  vm.createContext(sandbox);vm.runInContext(source+'\nthis.createBeautyEngine=createBeautyEngine;',sandbox);
  const engine = sandbox.createBeautyEngine(video,options);
  const flush = async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
  await flush();
  return {engine,video,stats,flush,release:()=>release(),tick(advance=true){now+=300;if(advance)video.currentTime+=.3;nextFrame?.();}};
}
const pixel=(canvas,x,y)=>Array.from(canvas.getContext('2d').getImageData(x,y,1,1).data);

test('Big Eyes alone leaves jaw and chin pixels unchanged',async()=>{
  const f=await fixture({big_eyes:100});f.engine.start();
  for(let y=95;y<145;y++)for(let x=15;x<105;x++)assert.deepEqual(pixel(f.engine.canvas,x,y),pixel(f.video,x,y));
  assert.notDeepEqual(pixel(f.engine.canvas,43,57),pixel(f.video,43,57));
  f.engine.dispose();
});

test('Portrait blur preserves category 1 person, changes background and releases masks',async()=>{
  const f=await fixture({background_blur:100});f.engine.start();await f.flush();f.tick();
  assert.deepEqual(pixel(f.engine.canvas,20,80),pixel(f.video,20,80));
  assert.notDeepEqual(pixel(f.engine.canvas,100,80),pixel(f.video,100,80));
  assert.equal(f.stats.masksClosed,1);assert.equal(f.engine.getDebug().blurMaskReady,true);
  f.engine.dispose();assert.equal(f.stats.trackerClosed,1);assert.equal(f.stats.segmenterClosed,1);
});

test('Smoothing restores processed eyes instead of raw camera pixels',async()=>{
  const plain=await fixture({big_eyes:100});plain.engine.start();
  const smooth=await fixture({big_eyes:100,smoothing:100});smooth.engine.start();
  const x=43,y=57,raw=pixel(smooth.video,x,y)[0],warped=pixel(plain.engine.canvas,x,y)[0],result=pixel(smooth.engine.canvas,x,y)[0];
  assert.ok(Math.abs(result-warped)<Math.abs(result-raw),`${result} should preserve warped detail ${warped}, not raw ${raw}`);
  plain.engine.dispose();smooth.engine.dispose();
});

test('Optional segmentation stays unloaded and duplicate video frames skip inference',async()=>{
  const f=await fixture();f.engine.start();f.tick(false);f.tick(false);
  assert.equal(f.stats.segmenterLoads,0);assert.equal(f.stats.detect.length,1);
  f.tick();assert.equal(f.stats.detect.length,2);assert.ok(f.stats.detect[1]>f.stats.detect[0]);f.engine.dispose();
});

test('Disposal while model initializes closes late model and prevents restarting',async()=>{
  const f=await fixture({},true);f.engine.dispose();f.release();await f.flush();
  assert.equal(f.stats.trackerClosed,1);assert.equal(f.stats.segmenterLoads,0);
  assert.throws(()=>f.engine.start(),/disposed/);
});
