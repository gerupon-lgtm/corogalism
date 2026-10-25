import test from 'node:test';
import assert from 'node:assert/strict';
import { initPwa } from '../src/pwa.js';

class Target extends EventTarget {
  listeners=new Map();
  addEventListener(type,fn,opts){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);super.addEventListener(type,fn,opts);}
  removeEventListener(type,fn,opts){this.listeners.get(type)?.delete(fn);super.removeEventListener(type,fn,opts);}
  emit(type){this.dispatchEvent(new Event(type));}
}
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
function setup(t,{initial=false}={}){
  const elements=new Map();
  for(const id of ['pwa-notice','pwa-message','btn-pwa-update','pwa-status','btn-pwa-check','pwa-check-result'])elements.set(id,Object.assign(new Target(),{hidden:false,disabled:false,textContent:''}));
  const reg=Object.assign(new Target(),{active:initial?null:{state:'activated'},installing:null,waiting:null,calls:0,update(){this.calls++;return this.updateImpl?.()||Promise.resolve();}});
  const sw=Object.assign(new Target(),{controller:initial?null:{},register:()=>Promise.resolve(reg),ready:Promise.resolve(reg)});
  const navigator={serviceWorker:sw,onLine:true};
  let now=0,next=0;const timers=new Map();
  const globals={document:{querySelector:s=>elements.get(s.slice(1)),querySelectorAll:()=>[...elements.values()]},navigator,window:new Target(),location:{reload(){throw Error('automatic reload forbidden');}},setTimeout(fn,ms=0){timers.set(++next,{fn,due:now+ms});return next;},clearTimeout(id){timers.delete(id);}};
  for(const [key,value]of Object.entries(globals)){const old=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});t.after(()=>old?Object.defineProperty(globalThis,key,old):delete globalThis[key]);}
  const tick=ms=>{now+=ms;for(const [id,timer]of [...timers])if(timer.due<=now){timers.delete(id);timer.fn();}};
  const el=id=>elements.get(id),worker=()=>Object.assign(new Target(),{state:'installing',messages:[],postMessage(message){this.messages.push(message);}});
  const begin=w=>{reg.installing=w;reg.emit('updatefound');};
  const ready=w=>{reg.installing=null;reg.waiting=w;w.state='installed';w.emit('statechange');};
  const click=async()=>{el('btn-pwa-check').emit('click');await flush();};
  let ui;
  return {reg,sw,navigator,tick,el,worker,begin,ready,click,init:async()=>{ui=initPwa(()=>true);await flush();},render:()=>ui.render(),result:()=>el('pwa-check-result').textContent};
}

test('新版なしは確認だけで終わり、待機監視を残さない',async t=>{
 const s=setup(t);await s.init();await s.click();s.tick(0);await flush();
 assert.equal(s.result(),'最新版です。');assert.equal(s.el('btn-pwa-check').disabled,false);assert.equal(s.reg.listeners.get('updatefound').size,1);
});
test('新版の準備中は15秒を超えても失敗にせず、再確認で通信を重ねない',async t=>{
 const s=setup(t),request=deferred(),w=s.worker();s.reg.updateImpl=()=>{s.begin(w);return request.promise;};await s.init();await s.click();
 assert.equal(s.result(),'更新の準備中…');assert.equal(s.el('btn-pwa-check').disabled,false);assert.equal(s.el('btn-pwa-update').hidden,true);
 s.tick(16000);await flush();assert.equal(s.result(),'更新の準備中…');await s.click();assert.equal(s.reg.calls,1);assert.equal(w.messages.length,0);
 s.ready(w);await flush();assert.equal(s.result(),'更新できます。');assert.equal(s.el('btn-pwa-update').hidden,false);request.resolve();await flush();
});
test('準備失敗は最新版と区別し、再確認できる',async t=>{
 const s=setup(t),w=s.worker();s.reg.updateImpl=()=>{s.begin(w);return Promise.resolve();};await s.init();await s.click();
 s.reg.installing=null;w.state='redundant';w.emit('statechange');s.tick(0);await flush();
 assert.match(s.result(),/更新の準備に失敗/);assert.equal(s.el('btn-pwa-check').disabled,false);assert.equal(w.listeners.get('statechange').size,0);
});
test('確認通信が止まっても15秒で復帰し、再確認は同じ通信を待つ',async t=>{
 const s=setup(t),request=deferred();s.reg.updateImpl=()=>request.promise;await s.init();await s.click();s.tick(15000);await flush();
 assert.match(s.result(),/通信に時間/);assert.equal(s.el('btn-pwa-check').disabled,false);assert.equal(s.reg.listeners.get('updatefound').size,1);
 await s.click();assert.equal(s.reg.calls,1);request.resolve();await flush();s.tick(0);await flush();assert.equal(s.result(),'最新版です。');
});
test('確認時間切れの後で新版を見つけても、準備中・準備完了へ表示を更新する',async t=>{
 const s=setup(t),request=deferred(),w=s.worker();s.reg.updateImpl=()=>request.promise;await s.init();await s.click();s.tick(15000);await flush();
 s.begin(w);assert.equal(s.result(),'更新の準備中…');s.ready(w);assert.equal(s.result(),'更新できます。');request.resolve();await flush();assert.equal(s.result(),'更新できます。');
});
test('準備済みならオフラインでも更新案内を保ち、未取得ならオフラインと伝える',async t=>{
 const s=setup(t);await s.init();s.navigator.onLine=false;await s.click();assert.match(s.result(),/オフラインです/);assert.equal(s.reg.calls,0);
 const w=s.worker();s.reg.waiting=w;await s.click();assert.equal(s.result(),'更新できます。');assert.equal(s.reg.calls,0);
});
test('初回の資材準備は新版の更新と混同しない',async t=>{
 const s=setup(t,{initial:true}),w=s.worker();s.reg.installing=w;await s.init();await s.click();assert.equal(s.result(),'オフライン準備中…');
 s.ready(w);assert.notEqual(s.result(),'更新できます。');s.reg.waiting=null;s.reg.active=w;s.sw.controller=w;w.state='activated';w.emit('statechange');await flush();
 assert.equal(s.result(),'最新版です。');assert.equal(s.reg.calls,0);
});
test('非対応ブラウザでは画面を描き直しても更新チェックを有効にしない',async t=>{
 const s=setup(t);delete s.navigator.serviceWorker;await s.init();s.render();assert.equal(s.el('btn-pwa-check').disabled,true);assert.match(s.result(),/更新チェックを利用できません/);
});
