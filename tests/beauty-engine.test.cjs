// Run with: node --test tests/beauty-engine.test.cjs
// Uses real Canvas pixels and fake model outputs; does not verify MediaPipe or iPhone.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {createCanvas} = require('@napi-rs/canvas');
const blurSource=fs.readFileSync(require('node:path').join(__dirname,'../beauty-blur.js'),'utf8').replace('export function','function');
const source = fs.readFileSync(require('node:path').join(__dirname, '../beauty-engine.js'), 'utf8')
  .replace(/^import .*;$/m,'')
  .replace('export function', 'function')
  .replace('await import(base + "/vision_bundle.mjs")', 'await loadVision()');

async function fixture(options = {}, deferred = false, config={}) {
  let now = 1000, nextFrame, release;
  const stats = {detect: [], segment: [], trackerClosed: 0, segmenterClosed: 0, masksClosed: 0, segmenterLoads: 0};
  const points = Array.from({length:478}, () => ({x:.5,y:.5,z:0}));
  const set = (id,x,y) => points[id] = {x,y,z:0};
  const contour=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
  contour.forEach((id,i)=>{const a=-Math.PI/2+i*Math.PI*2/contour.length;set(id,.5+.3*Math.cos(a),.5+.35*Math.sin(a));});
  set(50,.34,.55);set(280,.66,.55);set(13,.5,.65);set(70,.3,.27);set(107,.43,.27);set(300,.7,.27);set(336,.57,.27);
  const lip=[61,40,37,0,267,270,291,321,314,17,84,91];lip.forEach((id,i)=>{const a=Math.PI+i*Math.PI*2/lip.length;set(id,.5+.12*Math.cos(a),.65+.04*Math.sin(a));});
  const inner=[78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191];inner.forEach((id,i)=>{const a=Math.PI+i*Math.PI*2/inner.length;set(id,.5+.07*Math.cos(a),.65+.015*Math.sin(a));});
  set(234,.2,.45);set(454,.8,.45);set(1,.5,.5);set(152,.5,.85);set(10,.5,.15);
  set(33,.3,.35);set(133,.43,.35);set(263,.7,.35);set(362,.57,.35);
  for(const [ids,x] of [[[132,58,172,136,150],.25],[[361,288,397,365,379],.75]])ids.forEach((id,i)=>set(id,x,.5+i*.06));
  set(98,.44,.55);set(327,.56,.55);
  const video = createCanvas(120,160), context = video.getContext('2d');
  for(let y=0;y<160;y++)for(let x=0;x<120;x++){
    context.fillStyle=config.gradient?`rgb(${x*2},${x*2},${x*2})`:(x+y)%2?'#fff':'#000';context.fillRect(x,y,1,1);
  }
  if(config.rotate){for(const p of points){const x=(p.x-.5)*120,y=(p.y-.5)*160;p.x=(60-y)/120;p.y=(80+x)/160;}}
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
    document:{createElement(){const c=createCanvas(1,1);if(config.noFilter){const ctx=c.getContext('2d');Object.defineProperty(ctx,'filter',{get:()=>"none",set:()=>{}});}c.captureStream=()=>({getTracks:()=>[{stop(){}}]});return c;}},
    performance:{now:()=>now},requestAnimationFrame:fn=>(nextFrame=fn,1),cancelAnimationFrame:()=>{nextFrame=null;},
    loadVision:async()=>library,console
  };
  vm.createContext(sandbox);vm.runInContext(blurSource+'\n'+source+'\nthis.createBeautyEngine=createBeautyEngine;',sandbox);
  const engine = sandbox.createBeautyEngine(video,options);
  const flush = async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
  await flush();
  return {engine,video,stats,points,flush,advance(ms,advance=true){now+=ms;if(advance)video.currentTime+=ms/1000;nextFrame?.();},release:()=>release(),tick(advance=true){now+=300;if(advance)video.currentTime+=.3;nextFrame?.();}};
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

test('Safari filter no-op selects CPU blur and still changes only background',async()=>{
  const f=await fixture({background_blur:100},false,{noFilter:true});f.engine.start();await f.flush();f.tick();
  assert.equal(f.engine.getDebug().blurBackend,'cpu');
  assert.deepEqual(pixel(f.engine.canvas,20,80),pixel(f.video,20,80));
  assert.notDeepEqual(pixel(f.engine.canvas,100,80),pixel(f.video,100,80));f.engine.dispose();
});

test('Face smoothing changes cheek texture while preserving background and eye detail',async()=>{
  for(const noFilter of [false,true]){
    const f=await fixture({smoothing:100},false,{noFilter});f.engine.start();
    assert.deepEqual(pixel(f.engine.canvas,5,5),pixel(f.video,5,5));
    assert.deepEqual(pixel(f.engine.canvas,44,56),pixel(f.video,44,56));
    assert.notDeepEqual(pixel(f.engine.canvas,35,84),pixel(f.video,35,84));f.engine.dispose();
  }
});

test('Local eye processing visits less than one quarter of the frame',async()=>{
  const f=await fixture({big_eyes:100});f.engine.start();
  assert.ok(f.engine.getDebug().warpedPixels<120*160/4);f.engine.dispose();
});

test('A 90-degree head roll rotates chin displacement toward the face, shortening the chin',async()=>{
  const f=await fixture({chin:100},false,{rotate:true,gradient:true});f.engine.start();
  assert.ok(pixel(f.engine.canvas,4,80)[0]<pixel(f.video,4,80)[0]);
  assert.deepEqual(pixel(f.engine.canvas,60,140),pixel(f.video,60,140));f.engine.dispose();
});

test('Makeup leaves open mouth interior untouched while tinting the lip ring',async()=>{
  const f=await fixture({makeup_enabled:true});f.engine.start();
  assert.deepEqual(pixel(f.engine.canvas,60,104),pixel(f.video,60,104));
  assert.notDeepEqual(pixel(f.engine.canvas,60,109),pixel(f.video,60,109));f.engine.dispose();
});

test('Rendering skips over-budget frames but applies changed settings on paused video',async()=>{
  const f=await fixture();f.engine.start();
  const before=pixel(f.engine.canvas,5,5);
  f.engine.update({whitening:100});f.advance(10,false);assert.deepEqual(pixel(f.engine.canvas,5,5),before);
  f.advance(40,false);assert.notDeepEqual(pixel(f.engine.canvas,5,5),before);f.engine.dispose();
});

// A coordinate gradient reveals the actual source displacement at maximum strength.
test('Maximum contour controls stay bounded even when enabled together',async()=>{
  const f=await fixture({slim_face:100,chin:100,nose:100,big_eyes:100},false,{gradient:true});f.engine.start();
  for(let y=0;y<160;y++)for(let x=0;x<120;x++)
    assert.ok(Math.abs(pixel(f.engine.canvas,x,y)[0]-pixel(f.video,x,y)[0])<=6,`excessive displacement at ${x},${y}`);
  f.engine.dispose();
});
