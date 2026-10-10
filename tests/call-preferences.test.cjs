const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),root=path.join(__dirname,'..');
function helper(){const dom=new JSDOM('',{runScripts:'outside-only'});dom.window.eval(fs.readFileSync(root+'/call-preferences.js','utf8'));return {dom,api:dom.window.MimoCallPreferences};}
test('Call preferences preserve explicit false and use database defaults only for an absent row',async()=>{
 const {dom,api}=helper();assert.equal(api.normalize(null).camera_enabled,true);assert.equal(api.normalize({microphone_enabled:false,camera_enabled:false,speaker_enabled:false}).microphone_enabled,false);
 assert.throws(()=>api.normalize({camera_enabled:'false'}),/Invalid/);let owner;
 const client={from(table){assert.equal(table,'call_settings');return {select(){return this;},eq(k,v){assert.equal(k,'user_id');owner=v;return this;},abortSignal(){return this;},maybeSingle:async()=>({data:{microphone_enabled:false,camera_enabled:true,speaker_enabled:false}})};}};
 assert.equal((await api.load(client,'me')).speaker_enabled,false);assert.equal(owner,'me');dom.window.close();
});
test('Settings read timeout aborts the request; errors never become enabled defaults',async()=>{
 const {dom,api}=helper();let signal;
 const client={from:()=>({select(){return this;},eq(){return this;},abortSignal(s){signal=s;return this;},maybeSingle:()=>new Promise(()=>{})})};
 await assert.rejects(api.load(client,'me',5),/timed out/);assert.equal(signal.aborted,true);
 await assert.rejects(api.load({from:()=>({select(){return this;},eq(){return this;},abortSignal(){return this;},maybeSingle:async()=>({error:new Error('offline')})})},'me'),/offline/);dom.window.close();
});
class Track{constructor(kind){this.kind=kind;this.enabled=true;this.readyState='live';}stop(){this.readyState='ended';}}
class Stream{constructor(tracks){this.tracks=tracks;}getTracks(){return this.tracks;}getAudioTracks(){return this.tracks.filter(t=>t.kind==='audio');}getVideoTracks(){return this.tracks.filter(t=>t.kind==='video');}addTrack(t){this.tracks.push(t);}removeTrack(t){this.tracks=this.tracks.filter(x=>x!==t);}}
async function runtime({incoming=false,voice=false,fail=false,cameraOff=true,micOff=true,soundOff=true,black=false}={}){
 const url='https://mimo.test/call.html?'+(incoming?'call=existing':'user=other&type='+(voice?'voice':'video'));
 const dom=new JSDOM(fs.readFileSync(root+'/call.html','utf8'),{runScripts:'outside-only',url}),w=dom.window;
 Object.defineProperty(w.HTMLMediaElement.prototype,'readyState',{get:()=>4});Object.defineProperty(w.HTMLVideoElement.prototype,'videoWidth',{get:()=>black?0:120});
 w.HTMLMediaElement.prototype.play=async function(){if(this.id==='localVideo'){assert.equal(this.srcObject.getAudioTracks()[0].enabled,!micOff);assert.equal(this.srcObject.getVideoTracks()[0].enabled,!cameraOff);}};
 w.console.warn=()=>{};w.console.error=()=>{};w.MediaStream=Stream;
 const state={gum:0,invitations:0,accepted:0,tracks:[],media:[]};
 Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:async opts=>{state.gum++;const stream=new Stream([...(opts.audio?[new Track('audio')]:[]),...(opts.video?[new Track('video')]:[])]);state.media.push(stream);return stream;}}});
 const record={id:'existing',caller_id:incoming?'other':'me',callee_id:incoming?'me':'other',call_type:voice?'voice':'video',status:'ringing'};
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'me'}}}})},from(table){let id;return {select(){return this;},eq(_,v){id=v;return this;},insert(){state.invitations++;return this;},update(){state.accepted++;return this;},single:async()=>({data:record}),maybeSingle:async()=>({data:table==='beauty_settings'?{enabled:false}:{id,role:id==='me'?(incoming?'host':'user'):'host'}}),then(resolve){resolve({});}};}};
 w.supabase={createClient:()=>client};w.MimoContacts={allow:async()=>true};
 w.MimoCallPreferences={load:async(c,uid)=>{assert.equal(c,client);assert.equal(uid,'me');if(fail)throw Error('settings unavailable');return {microphone_enabled:!micOff,camera_enabled:!cameraOff,speaker_enabled:!soundOff};}};
 w.RTCPeerConnection=function(){return {addTrack(track){state.tracks.push({kind:track.kind,enabled:track.enabled});},getSenders:()=>[],close(){}};};
 const source=Array.from(w.document.querySelectorAll('script')).find(s=>s.textContent.includes('async function prepareMedia')).textContent.replace(/\ninit\(\);/,'');
 w.eval(source+`\nsetupRealtime=async()=>{};loadTargetProfile=async()=>{};createOffer=async()=>{};loadExistingSignals=async()=>{};
 window.testing={init,toggleMute,toggleCamera,toggleSpeaker,switchCamera,get:()=>({localStream,muted,cameraEnabled,speakerEnabled}),end:()=>{ended=true;}};`);
 await w.testing.init();return {dom,w,state,t:w.testing};
}
test('Outgoing and incoming calls apply disabled devices before preview, addTrack and acceptance',async()=>{
 for(const incoming of [false,true]){
  const f=await runtime({incoming});assert.deepEqual(f.state.tracks,[{kind:'audio',enabled:false},{kind:'video',enabled:false}]);assert.equal(f.w.document.getElementById('remoteAudio').muted,true);assert.equal(f.w.document.getElementById('remoteVideo').muted,true);
  assert.equal(f.w.document.getElementById('muteText').textContent,'Unmute');assert.equal(f.w.document.getElementById('cameraText').textContent,'Camera Off');assert.equal(f.state.accepted,incoming?1:0);
  f.t.toggleMute();f.t.toggleCamera();f.t.toggleSpeaker();assert.equal(f.t.get().localStream.getAudioTracks()[0].enabled,true);assert.equal(f.t.get().localStream.getVideoTracks()[0].enabled,true);assert.equal(f.w.document.getElementById('remoteAudio').muted,false);f.dom.window.close();
 }
});
test('Unavailable settings stop startup before media, outgoing invite or incoming acceptance',async()=>{
 for(const incoming of [false,true]){const f=await runtime({incoming,fail:true});assert.equal(f.state.gum,0);assert.equal(f.state.invitations,0);assert.equal(f.state.accepted,0);assert.match(f.w.document.getElementById('errorText').textContent,/call settings/);f.dom.window.close();}
});
test('Voice defaults do not acquire a camera; disabled video does not trigger false black-preview recovery',async()=>{
 const f=await runtime({voice:true});assert.deepEqual(f.state.tracks,[{kind:'audio',enabled:false}]);assert.equal(f.t.get().localStream.getVideoTracks().length,0);f.dom.window.close();
 const v=await runtime({black:true});assert.equal(v.state.gum,1);v.dom.window.close();
});
test('Camera switch preserves the disabled local camera and its control state',async()=>{
 const f=await runtime();let enabled;
 // This fixture has no sender; the real local track must still remain disabled.
 await f.t.switchCamera();enabled=f.t.get().localStream.getVideoTracks()[0].enabled;assert.equal(enabled,false);assert.equal(f.t.get().cameraEnabled,false);assert.equal(f.w.document.getElementById('cameraText').textContent,'Camera Off');f.dom.window.close();
});
test('Call-settings page prevents saving after read failure and loads explicit false on retry',async()=>{
 const dom=new JSDOM(fs.readFileSync(root+'/call-settings.html','utf8'),{runScripts:'outside-only',url:'https://mimo.test/call-settings.html'}),w=dom.window;let fail=true,saves=0;
 w.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'me'}}})},from:()=>({upsert:async()=>{saves++;return {};}})})};w.MimoCallPreferences={load:async()=>{if(fail)throw Error('offline');return {microphone_enabled:false,camera_enabled:false,speaker_enabled:false};}};
 w.eval(Array.from(w.document.querySelectorAll('script')).find(s=>s.textContent.includes('savePrefs')).textContent);await new Promise(r=>setImmediate(r));assert.equal(w.document.getElementById('saveBtn').disabled,true);w.document.getElementById('saveBtn').click();assert.equal(saves,0);
 fail=false;w.document.getElementById('retryBtn').click();await new Promise(r=>setImmediate(r));assert.equal(w.document.getElementById('saveBtn').disabled,false);assert.equal(w.document.getElementById('camera_enabled').checked,false);w.document.getElementById('saveBtn').click();await new Promise(r=>setImmediate(r));assert.equal(saves,1);dom.window.close();
});
