const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const pages=['index','plaza','messages','notifications','me','settings'];
test('Formal design has one consistent accessible four-destination navigation on all main pages',()=>{
 let icons;
 for(const page of pages){
  const dom=new JSDOM(fs.readFileSync(page+'.html','utf8')),d=dom.window.document;
  const navs=d.querySelectorAll('.mimo-unified-nav');assert.equal(navs.length,1,page);
  const links=[...navs[0].querySelectorAll('a')];
  assert.deepEqual(links.map(a=>a.getAttribute('href')),['index.html','plaza.html','messages.html','me.html'],page);
  assert.deepEqual(links.map(a=>a.textContent),['首页','广场','消息','我的'],page);
  const actual=links.map(a=>a.querySelector('svg').outerHTML);if(icons)assert.deepEqual(actual,icons,page);else icons=actual;
  assert.equal(navs[0].querySelector('.active').getAttribute('href'),(page==='settings'?'me':page==='notifications'?'messages':page)+'.html');
  assert.equal(d.querySelectorAll('.statusbar').length,0);
  dom.window.close();
 }
});
test('Live pages preserve unique controller targets and exclude the simulated preview runtime',()=>{
 for(const page of [...pages,'chat','profile','call']){
  const dom=new JSDOM(fs.readFileSync(page+'.html','utf8')),d=dom.window.document,ids=[...d.querySelectorAll('[id]')].map(n=>n.id);
  assert.equal(new Set(ids).size,ids.length,page);
  assert.equal(d.querySelectorAll('script[src*="design-review-v2"]').length,0,page);
  assert.ok(d.querySelector('link[href*="mimo-replica.css"]'),page);
  if(page==='call'){
   for(const id of ['remoteVideo','localVideo','remoteAudio','cameraButton','muteButton','speakerButton','beautyButton','timer'])assert.ok(d.getElementById(id),id);
   assert.ok(d.getElementById('timer').closest('.top-bar'));
   assert.equal(d.querySelectorAll('button[onclick="endCall()"]').length,1);
   assert.equal(d.querySelectorAll('[data-toggle-call]').length,0);
  }
  if(page==='chat')for(const id of ['inputMode','recordVoice','chatPlus','messageInput','sendButton'])assert.ok(d.getElementById(id),id);
  dom.window.close();
 }
});
