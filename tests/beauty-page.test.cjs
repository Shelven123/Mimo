// DOM interaction tests with fake auth, camera and engine. Not a browser/device test.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'../beauty-settings.html'),'utf8');
async function page(){
  const dom=new JSDOM(html,{url:'https://mimo.test/beauty-settings.html',runScripts:'outside-only'}),w=dom.window;
  const state={updates:[],saves:[],disposed:0,tracksStopped:0,interval:null,cameraFailure:false,errors:[]};
  w.addEventListener('error',event=>{state.errors.push(event.error);event.preventDefault();});
  w.setInterval=callback=>(state.interval=callback,1);
  w.HTMLMediaElement.prototype.play=async()=>{};
  w.HTMLElement.prototype.setPointerCapture=()=>{};
  Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:async()=>{
    if(state.cameraFailure)throw new Error('Mock camera permission denied');
    return {getTracks:()=>[{stop(){state.tracksStopped++;}}]};
  }}});
  w.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'test-user'}}})},from:()=>({
    select(){return this},eq(){return this},maybeSingle:async()=>({data:{enabled:true,preset:'natural'}}),
    upsert:async payload=>(state.saves.push(payload),{error:null})
  })})};
  w.createBeautyEngine=(video,settings)=>{
    state.updates.push(settings);
    return {canvas:w.document.createElement('canvas'),start(){},dispose(){state.disposed++;},update(s){state.updates.push(s);},
      getTrackingStatus:()=> 'ready',getFaceDetected:()=>true,
      getDebug:()=>({landmarkCount:478,qualityWidth:480,avgFrameMs:10,blurBackend:'cpu',segmentationStatus:'ready',blurMaskReady:true})};
  };
  const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*;$/m,'');
  w.eval(script);await new Promise(resolve=>setImmediate(resolve));
  if(!state.updates.length)throw new Error(w.document.getElementById('status').textContent);
  return {dom,w,state,el:id=>w.document.getElementById(id)};
}
test('Live comparison restores effects without saving temporary original mode',async()=>{
  const p=await page(),compare=p.el('compare');
  compare.onpointerdown({button:0,pointerId:1,preventDefault(){}});
  assert.equal(p.state.updates.at(-1).enabled,false);assert.equal(compare.getAttribute('aria-pressed'),'true');
  await p.el('save').onclick();assert.equal(p.state.saves.at(-1).enabled,true);
  compare.onpointercancel();assert.equal(p.state.updates.at(-1).enabled,true);assert.equal(compare.getAttribute('aria-pressed'),'false');
  compare.onkeydown({key:' ',preventDefault(){}});assert.equal(p.state.updates.at(-1).enabled,false);
  compare.onkeyup({key:' '});assert.equal(p.state.updates.at(-1).enabled,true);p.dom.window.close();
});
test('A click after releasing comparison is not handled as an undefined preset',async()=>{
  const p=await page(),compare=p.el('compare');
  compare.onpointerdown({button:0,pointerId:1,preventDefault(){}});compare.onpointerup();compare.click();
  assert.equal(p.state.errors.length,0);
  await p.el('save').onclick();assert.equal(p.state.saves.at(-1).preset,'natural');
  assert.equal(p.state.updates.at(-1).enabled,true);p.dom.window.close();
});
test('Makeup updates immediately and tracking text preserves the save result',async()=>{
  const p=await page();p.el('makeup_enabled').checked=true;p.el('makeup_enabled').dispatchEvent(new p.w.Event('change'));
  assert.equal(p.state.updates.at(-1).makeup_enabled,true);
  await p.el('save').onclick();p.state.interval();assert.match(p.el('status').textContent,/saved/);
  assert.match(p.el('trackingStatus').textContent,/478/);p.dom.window.close();
});
test('Camera failure after a flip exposes a working retry and disposes the old engine',async()=>{
  const p=await page();assert.ok(p.el('stage').querySelector('canvas'));
  p.state.cameraFailure=true;await p.el('flip').onclick();
  assert.equal(p.state.disposed,1);assert.equal(p.el('startCamera').style.display,'inline-block');
  assert.ok(p.el('stage').contains(p.el('startCamera')));assert.match(p.el('status').textContent,/permission denied/);
  p.state.cameraFailure=false;await p.el('startCamera').onclick();assert.ok(p.el('stage').querySelector('canvas'));
  p.w.dispatchEvent(new p.w.Event('pagehide'));assert.equal(p.state.disposed,2);assert.equal(p.state.tracksStopped,2);p.dom.window.close();
});
