/* Only the new Settings entries are bound here. Existing settings callbacks stay intact. */
(()=>{'use strict';const d=document;if(d.body.dataset.mimoPage!=='settings')return;
const features={
 verification:{title:'账户验证',state:'暂未开放',copy:'账户认证申请与审核流程暂未开放。如需协助处理账号问题，请联系帮助与反馈。',link:['帮助与反馈','support.html']},
 outfit:{title:'我的装扮',state:'暂未开放',copy:'用于管理聊天框、头像框和账号特效等装扮内容。装扮功能暂未开放。'},
 'chat-background':{title:'聊天背景',state:'VIP 功能 · 锁定',copy:'自定义聊天背景暂未开放。当前继续使用现有聊天背景。'},
 'call-background':{title:'拨电背景',state:'VIP 功能 · 锁定',copy:'自定义语音与通话背景暂未开放。当前继续使用现有通话背景。'},
 reputation:{title:'信誉评分',state:'暂未开放',copy:'信誉评分规则与查询服务暂未开放。账号问题可以通过帮助与反馈提交。',link:['帮助与反馈','support.html']},
 'gift-code':{title:'礼包码',state:'暂未开放',copy:'礼包码兑换服务暂未开放。活动开放后，可在这里兑换官方发放的礼包码。'},
 'promo-code':{title:'推广码',state:'暂未开放',copy:'推广码生成、填写与奖励规则暂未开放。开放后可在这里管理推广码。'}
};let active=null,trigger=null;
function close(){const dialog=active;if(!dialog)return;active=null;dialog.close?.();dialog.remove();trigger?.focus({preventScroll:true});}
function open(key,button){const feature=features[key];if(!feature)return;close();trigger=button;const dialog=d.createElement('dialog');dialog.className='settings-feature-dialog';dialog.setAttribute('aria-labelledby','settingsFeatureTitle');const h=d.createElement('h2');h.id='settingsFeatureTitle';h.textContent=feature.title;const state=d.createElement('span');state.className='settings-feature-state';state.textContent=feature.state;const copy=d.createElement('p');copy.textContent=feature.copy;dialog.append(h,state,copy);if(feature.link){const a=d.createElement('a');a.className='settings-feature-action';a.textContent=feature.link[0];a.href=feature.link[1];dialog.append(a);}const buttonClose=d.createElement('button');buttonClose.type='button';buttonClose.className='settings-feature-close';buttonClose.textContent='关闭';buttonClose.onclick=close;dialog.append(buttonClose);dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close();}});d.body.append(dialog);active=dialog;if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');buttonClose.focus({preventScroll:true});}
for(const button of d.querySelectorAll('[data-settings-feature]'))button.addEventListener('click',()=>open(button.dataset.settingsFeature,button));
window.addEventListener('pagehide',close);
})();
