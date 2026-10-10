/** ラケット検証ページを実Chromeで操作する。センサー値は模擬で、実機評価とは分ける。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8767/';
const output=process.env.RACKET_OUTPUT||'docs/verification/racket-lab/local';
const viewports=(process.env.RACKET_VIEWPORTS||'312x720,412x915,576x1024').split(',').map(item=>item.split('x').map(Number));
const rows=[];
await mkdir(output,{recursive:true});

const setup=async(context,outcome='unsupported')=>context.addInitScript(outcome=>{
 window.__gestureEvents=[];
 Element.prototype.requestFullscreen=()=>{window.__gestureEvents.push('fullscreen');return Promise.reject(Error('test fullscreen rejection'));};
 Object.defineProperty(window,'DeviceOrientationEvent',{configurable:true,value:outcome==='unsupported'?undefined:class{
  static requestPermission(){window.__gestureEvents.push('sensor');return Promise.resolve(outcome==='denied'?'denied':'granted');}
 }});
},outcome);

async function fixture(width=412,height=915,outcome='unsupported',serviceWorkers='block'){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:width===412?2.625:1,serviceWorkers});
 await setup(context,outcome);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 await page.goto(base+'racket-lab.html?debug=1');await page.waitForFunction(()=>!!window.__racketLab);
 await page.evaluate(()=>document.fonts.ready);await page.clock.runFor(32);
 const state=()=>page.evaluate(()=>window.__racketLab.state);
 const click=async id=>{await page.locator('#'+id).click();await page.clock.runFor(32);};
 const pointer=async(x,y,ms)=>{
  await page.locator('#board').scrollIntoViewIfNeeded();const r=await page.locator('#board').boundingBox();
  await page.mouse.move(r.x+r.width*(.5+x/2),r.y+r.height*(.5+y/2));await page.mouse.down();await page.clock.runFor(ms);await page.mouse.up();
 };
 return {context,page,errors,state,click,pointer,width,height};
}

const positions=rackets=>rackets.map(({id,x,y})=>({id,x,y}));
const finiteActor=actor=>[actor.x,actor.y,actor.vx,actor.vy].every(Number.isFinite);
async function digestCanvas(page){return page.evaluate(async()=>{
 const c=document.querySelector('#board'),ctx=c.getContext('2d'),pixels=ctx.getImageData(0,0,c.width,c.height).data;
 const hash=await crypto.subtle.digest('SHA-256',pixels);
 return {hash:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join(''),width:c.width,height:c.height,transform:ctx.getTransform().a};
});}
async function storePixels(page){await page.evaluate(()=>{const c=document.querySelector('#board');window.__racketRenderPixels=new Uint8ClampedArray(c.getContext('2d').getImageData(0,0,c.width,c.height).data);});}
async function comparePixels(page){return page.evaluate(()=>{
 const c=document.querySelector('#board'),actual=c.getContext('2d').getImageData(0,0,c.width,c.height).data,expected=window.__racketRenderPixels;
 let different=0,maxChannelDelta=0,transparent=0,minX=c.width,minY=c.height,maxX=-1,maxY=-1;
 for(let i=0;i<actual.length;i+=4){let delta=0;for(let j=0;j<4;j++)delta=Math.max(delta,Math.abs(actual[i+j]-expected[i+j]));if(delta){different++;maxChannelDelta=Math.max(maxChannelDelta,delta);const x=i/4%c.width,y=Math.floor(i/4/c.width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}if(actual[i+3]!==255)transparent++;}
 return {different,maxChannelDelta,transparent,bounds:{minX,minY,maxX,maxY}};
});}
function assertRaster(original,current,pixels,message){
 assert.equal(current.width,original.width,message+'（横幅）');assert.equal(current.height,original.height,message+'（縦幅）');assert.equal(current.transform,original.transform,message+'（倍率）');
 // 既存の描画復旧確認と同じ。旧版でも生じる輪郭の最大1/255差だけを許容し、
 // 盤面の縮小・透明化・残像は許容しない。今回の312幅では2画素を観測した。
 assert.equal(pixels.transparent,0,message+'（透明画素）');assert.ok(pixels.different<=32&&pixels.maxChannelDelta<=1,message+' '+JSON.stringify(pixels));
}
async function course(page,scenario){
 await page.locator('#scenario').selectOption(scenario);await page.clock.runFor(32);await page.locator('#layout').selectOption('relay');await page.locator('#reset').click();await page.clock.runFor(32);
 if(await page.evaluate(()=>window.__racketLab.state.paused)){await page.locator('#pause').click();await page.clock.runFor(32);}
 await page.locator('#board').scrollIntoViewIfNeeded();const r=await page.locator('#board').boundingBox();
 const waypoints=[[4.65,.75],[4.7,3.25],[1.65,3.7],[1.65,5.6],[5.95,6.5],[6.5,6.5]],trace=[];
 let index=0,ticks=0;
 await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
 for(;ticks<800;ticks++){
  const s=await page.evaluate(()=>{const s=window.__racketLab.state;return {actor:s.actor,goalReached:s.goalReached,elapsedSec:s.elapsedSec,racketHits:s.racketHits,lastHalt:s.lastHalt,paused:s.paused};});
  assert.equal(s.lastHalt,null,'全コースの実pointer操作で計算が止まらない');assert.equal(s.paused,false);
  if(s.goalReached){trace.push({tick:ticks,waypoint:index,...s});break;}
  const target=waypoints[index],dx=target[0]-s.actor.x,dy=target[1]-s.actor.y;
  if(index<waypoints.length-1&&Math.hypot(dx,dy)<.2&&Math.hypot(s.actor.vx,s.actor.vy)<1){trace.push({tick:ticks,waypoint:index,...s});index++;continue;}
  // 位置と速度を読み、押す位置だけを変える自動制御。advance/teleportは使わない。
  let x=(14*dx-6*s.actor.vx)/17.85,y=(14*dy-6*s.actor.vy)/17.85,m=Math.hypot(x,y);
  if(m>.96){x*=.96/m;y*=.96/m;}
  await page.mouse.move(r.x+r.width*(.5+x/2),r.y+r.height*(.5+y/2));await page.clock.runFor(75);
  if(ticks%40===0)trace.push({tick:ticks,waypoint:index,...s});
 }
 await page.mouse.up();const s=await page.evaluate(()=>window.__racketLab.state);
 return {automatedController:true,scenario,teleport:false,debugAdvance:false,virtualSec:ticks*.075,completed:s.goalReached,elapsedSec:s.elapsedSec,racketHits:s.racketHits,actor:s.actor,trace};
}

try{
 for(const [width,height]of viewports){
  const f=await fixture(width,height),{page,state,errors,context,click,pointer}=f;
  const initial=await state();assert.ok(initial.actor&&initial.settings&&initial.stage,'検証APIは球・設定・盤面を公開する');
  const records=await page.evaluate(()=>JSON.stringify({...localStorage}));
  await page.locator('#scenario').selectOption('baseline');await page.clock.runFor(32);await click('reset');
  const beforePointer=await state();await pointer(.65,.12,600);const afterPointer=await state();
  assert.ok(Math.hypot(afterPointer.actor.x-beforePointer.actor.x,afterPointer.actor.y-beforePointer.actor.y)>.01,'本編基準でも実pointerで動く');
  assert.ok(finiteActor(afterPointer.actor));assert.equal(afterPointer.lastHalt,null);
  await click('pause');const paused=await state();await page.clock.runFor(1500);
  assert.deepEqual((await state()).actor,paused.actor,'ポーズ中は球が動かない');
  assert.deepEqual(positions((await state()).rackets),positions(paused.rackets),'ポーズ中はラケットが動かない');
  await page.locator('#scenario').selectOption('cotton');await page.clock.runFor(32);
  assert.equal((await state()).settings.mode,'cotton');assert.ok((await state()).stage.walls.some(w=>w.materialId==='cotton'),'綿の比較状態には綿を描く');
  await page.locator('#scenario').selectOption('rackets');await page.clock.runFor(32);
  const rackets=await state();assert.equal(rackets.settings.mode,'rackets');assert.ok(rackets.rackets.length>=2,'縦横ラケットを同じ広場に置く');
  await click('reset');if((await state()).paused)await click('pause');
  const beforeRackets=positions((await state()).rackets);await pointer(.45,.45,350);const movingRackets=positions((await state()).rackets);
  assert.ok(movingRackets.some((r,i)=>Math.hypot(r.x-beforeRackets[i].x,r.y-beforeRackets[i].y)>.01),'実pointerでラケットを動かす');
  await page.clock.runFor(1200);const neutralRackets=positions((await state()).rackets);await page.clock.runFor(1000);
  for(const [i,r]of positions((await state()).rackets).entries())assert.ok(Math.hypot(r.x-neutralRackets[i].x,r.y-neutralRackets[i].y)<1e-5,'水平へ戻すとその場所で止まる');
  assert.equal((await state()).lastHalt,null);assert.ok(finiteActor((await state()).actor));
  await click('pause');await click('reset');
  await page.locator('#mix-cotton').uncheck();await page.clock.runFor(32);assert.ok(!(await state()).stage.walls.some(w=>w.materialId==='cotton'));
  await page.locator('#mix-cotton').check();await page.clock.runFor(32);assert.ok((await state()).stage.walls.some(w=>w.materialId==='cotton'));
  await page.screenshot({path:output+`/relay-${width}.png`,fullPage:true});
  await page.locator('#layout').selectOption('practice');await page.clock.runFor(32);assert.equal((await state()).settings.layout,'practice');
  await page.screenshot({path:output+`/practice-${width}.png`,fullPage:true});
  if(width===412){
   const shots=[];
   for(const axis of ['y','x'])for(const offset of [0,-.75,.75]){
    const shot=await page.evaluate(({axis,offset})=>{
     const lab=window.__racketLab;lab.reset();const before=lab.state,w=before.rackets.find(w=>w.axis===axis);
     if(axis==='y')lab.teleport(w.x-before.actor.r-.35,w.y+w.h/2+offset*w.h/2,4,0);
     else lab.teleport(w.x+w.w/2+offset*w.w/2,w.y-before.actor.r-.35,0,4);
     for(let i=0;i<15&&!lab.state.racketHits;i++)lab.advance(.01);
     const s=lab.state;return {axis,offset,actor:{x:s.actor.x,y:s.actor.y,vx:s.actor.vx,vy:s.actor.vy},hits:s.racketHits,halt:s.lastHalt};
    },{axis,offset});
    assert.equal(shot.hits,1,'中心・端で1回だけ打ち返す');assert.equal(shot.halt,null);
    const normal=axis==='y'?shot.actor.vx:shot.actor.vy,tangent=axis==='y'?shot.actor.vy:shot.actor.vx;
    assert.ok(normal<-1,'ラケットの向こうへ抜けず、戻る向きへ返す');
    if(offset===0)assert.ok(Math.abs(tangent)<1e-6,'中心はまっすぐ返す');else assert.ok(tangent*offset>1,'端は狙った側へ斜めに返す');shots.push(shot);
   }
   const slope=await page.evaluate(()=>{
    const lab=window.__racketLab;lab.reset();const w=lab.state.rackets.find(w=>w.axis==='y'),r=lab.state.actor.r;
    lab.teleport(w.x-r-.35,w.y+w.h/2,4,0);for(let i=0;i<15&&!lab.state.racketHits;i++)lab.advance(.01);
    const vyBefore=lab.state.actor.vy;lab.setTilt(0,-.3);lab.advance(.05);return {vyBefore,vyAfter:lab.state.actor.vy};
   });assert.ok(slope.vyAfter<slope.vyBefore-.05,'ラケットで返した後も傾きが球へ働く');
   const brakes=[];
   for(const scenario of ['baseline','cotton']){
    await page.locator('#scenario').selectOption(scenario);await page.clock.runFor(32);
    brakes.push(await page.evaluate(scenario=>{
     const lab=window.__racketLab;lab.reset();const a=lab.state.stage.labAnchors.cottonBrake;lab.teleport(a.x,a.y,a.vx,.8);
     for(let i=0;i<20;i++)lab.advance(.01);const s=lab.state;return {scenario,actor:{x:s.actor.x,y:s.actor.y,vx:s.actor.vx,vy:s.actor.vy},halt:s.lastHalt};
    },scenario));
   }
   assert.ok(brakes[0].actor.vx<-1,'同じ場所のゴム壁は反発する');assert.ok(Math.abs(brakes[1].actor.vx)<1e-6,'綿は壁へ向かう勢いを吸収する');assert.ok(brakes[1].actor.vy>.5,'綿でも壁沿いの動きは残る');
   await page.locator('#scenario').selectOption('rackets');await page.clock.runFor(32);await click('reset');
   rows.push({shots,postRacketTilt:slope,cottonComparison:brakes});console.log('PASS racket center/ends, post-hit tilt, cotton/rubber');
  }
  await page.locator('summary').first().click();
  for(const [id,key,value]of [['racket-speed','racketSpeed','4.5'],['racket-restitution','racketRestitution','1.2'],['aim-angle','aimAngleDeg','40'],['motion-transfer','motionTransfer','.2'],['ball-tilt','ballTilt','.7'],['speed-limit','speedLimit','24'],['cotton-restitution','cottonRestitution','.15'],['max-tilt','maxTiltAngleDeg','30']]){
   await page.locator('#'+id).fill(value);await page.clock.runFor(32);assert.equal((await state()).settings[key],Number(value),id+'の数値を保存する');
  }
  await click('copy');const shared=JSON.parse(await page.locator('#settings-text').inputValue());
  assert.equal(shared.page,'corogalism-racket-lab');assert.equal(shared.revision,1);assert.equal(shared.racketRestitution,1.2);
  await click('defaults');const defaults=await state();assert.notEqual(defaults.settings.racketSpeed,4.5);assert.equal(defaults.lastHalt,null);
  if(!defaults.paused)await click('pause');await page.clock.runFor(100);
  // 模擬の2D領域復元と実resize。静止時の盤面が同じ倍率で再描画される。
  // テクスチャ読込前の代替描画と読込後を、復元の画像差として比較しない。
  await page.waitForLoadState('networkidle');await page.clock.runFor(32);
  const original=await digestCanvas(page);await storePixels(page);await page.screenshot({path:output+`/render-before-${width}.png`});await page.evaluate(()=>{
   const c=document.querySelector('#board');c.dispatchEvent(new Event('contextlost'));c.getContext('2d').reset();c.dispatchEvent(new Event('contextrestored'));
  });await page.clock.runFor(100);const restored=await digestCanvas(page);assert.deepEqual(restored,original,'描画領域の復元後も盤面を保つ');
  await page.setViewportSize({width:width+24,height});await page.clock.runFor(100);await page.setViewportSize({width,height});await page.clock.runFor(100);
  const resized=await digestCanvas(page),resizePixels=await comparePixels(page);
  if(resized.hash!==original.hash){rows.push({width,renderDiagnostic:{original,resized,pixels:resizePixels,priorStrictHashFailure:true}});console.log('RESIZE DIAGNOSTIC '+JSON.stringify(resizePixels));await page.screenshot({path:output+`/render-resized-${width}.png`});}
  assertRaster(original,resized,resizePixels,'幅変更を戻すと描画倍率・画面が戻る');
  const stillActor=(await state()).actor;await page.evaluate(({x,y})=>window.__racketLab.teleport(x+1.3,y+1.3),stillActor);await page.clock.runFor(100);
  await page.evaluate(({x,y,vx,vy})=>window.__racketLab.teleport(x,y,vx,vy),stillActor);await page.clock.runFor(100);
  assertRaster(original,await digestCanvas(page),await comparePixels(page),'球を移動して戻しても残像が残らない');
  if(width===412){
   if((await state()).paused)await click('pause');
   const complete=async()=>{
    await page.evaluate(()=>{const lab=window.__racketLab,g=lab.state.stage.labAnchors.goal;lab.teleport(g.x,g.y);lab.advance(.01);});await page.clock.runFor(32);
    assert.equal((await state()).goalReached,true);assert.equal(await page.locator('#pause').isDisabled(),true,'ゴール後のポーズは無効');
   };
   await complete();await page.locator('#scenario').selectOption('cotton');await page.clock.runFor(32);
   assert.equal((await state()).goalReached,false);assert.equal(await page.locator('#pause').isDisabled(),false);assert.equal((await state()).elapsedSec,0);
   await pointer(.6,0,220);assert.ok((await state()).actor.x>.55,'ゴール後のモード切替から球を動かせる');
   await complete();await page.locator('#racket-speed').fill('4.8');await page.clock.runFor(32);
   assert.equal((await state()).goalReached,false);assert.equal((await state()).settings.racketSpeed,4.8);await pointer(.6,0,220);assert.ok((await state()).actor.x>.55,'ゴール後の数値切替から球を動かせる');
   await complete();await page.evaluate(()=>dispatchEvent(new Event('blur')));assert.equal((await state()).paused,true);
   await page.locator('#scenario').selectOption('rackets');await page.clock.runFor(32);assert.equal((await state()).goalReached,false);assert.equal((await state()).paused,true);
   assert.match(await page.locator('#status').textContent(),/再開/,'背景で止めた後の再試遊は再開を案内する');await click('pause');await pointer(.6,0,220);assert.ok((await state()).actor.x>.55);
   await page.locator('#cotton-restitution').fill('1');await page.clock.runFor(32);assert.equal((await state()).settings.cottonRestitution,1);
   assert.match(await page.locator('#settings-note').textContent(),/綿の実効反発0\.7/);assert.match(await page.locator('label').filter({has:page.locator('#cotton-restitution')}).textContent(),/実効上限0\.7/);
   await click('copy');const raw=JSON.parse(await page.locator('#settings-text').inputValue());assert.equal(raw.cottonRestitution,1,'入力した綿1を共有し、実効0.7と区別する');
   rows.push({goalSwitch:{scenario:true,numeric:true,backgroundPause:true,pauseDisabled:true},cottonRaw:1,cottonEffective:.7});console.log('PASS racket goal switches/pause/cotton effective');
   await click('defaults');
   if(process.env.RACKET_COURSE!=='0'){
    for(const scenario of ['baseline','cotton','rackets']){
     const result=await course(page,scenario);rows.push({fullCourse:result});console.log('COURSE '+JSON.stringify({scenario,completed:result.completed,elapsedSec:result.elapsedSec,racketHits:result.racketHits,actor:result.actor}));
     assert.equal(result.completed,true,'開始からゴールまで実pointerの自動制御で進める');await page.screenshot({path:output+`/goal-${scenario}-412.png`,fullPage:true});
    }
   }
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'横幅をはみ出さない');
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),records,'本編の記録を変更しない');
  assert.deepEqual(errors,[]);rows.push({width,height,realPointer:true,actor:afterPointer.actor,rackets:{before:beforeRackets,moving:movingRackets,neutral:neutralRackets},share:shared,render:restored,errors});
  console.log('PASS racket UI/pointer/render '+width);await context.close();
 }
 for(const outcome of process.env.RACKET_FOCUS==='ui'?[]:['granted','denied','silent','unsupported']){
  const f=await fixture(412,915,outcome),{page,state,click,errors,context}=f;
  assert.equal((await state()).settings.mode,'rackets');
  await click('sensor');
  if(outcome==='granted'){
   for(let i=0;i<9;i++){
    await page.evaluate(()=>{const e=new Event('deviceorientation');Object.assign(e,{beta:18,gamma:0});dispatchEvent(e);});await page.clock.runFor(100);
   }
   assert.equal((await state()).mode,'tilt');assert.equal((await state()).needsCalibration,false);
   const before=await state();await page.evaluate(()=>{const e=new Event('deviceorientation');Object.assign(e,{beta:24,gamma:8});dispatchEvent(e);});await page.clock.runFor(450);
   const moved=await state();assert.ok(Math.hypot(moved.actor.x-before.actor.x,moved.actor.y-before.actor.y)>.01,'センサー値で球を動かす');
   assert.ok(positions(moved.rackets).some((r,i)=>Math.hypot(r.x-before.rackets[i].x,r.y-before.rackets[i].y)>.01),'同じセンサー値でラケットを動かす');
   await click('calibrate');await page.clock.runFor(6200);assert.equal((await state()).mode,'pointer','再校正が無応答なら画面操作へ戻る');
  }else{await page.clock.runFor(6200);assert.equal((await state()).mode,'pointer');}
  const gestures=await page.evaluate(()=>window.__gestureEvents);if(outcome!=='unsupported')assert.ok(gestures.indexOf('sensor')<gestures.indexOf('fullscreen'),'センサー許可を全画面より先に要求する');
  assert.deepEqual(errors,[]);rows.push({sensor:outcome,mode:(await state()).mode,gestures,errors});console.log('PASS racket sensor '+outcome);await context.close();
 }
 if(process.env.RACKET_FOCUS!=='ui'){
  const context=await browser.newContext({viewport:{width:412,height:915},serviceWorkers:'block'});await setup(context);
  await context.addInitScript(()=>localStorage.setItem('corogalism-settings',JSON.stringify({maxTiltAngleDeg:31,soundEnabled:false,challengeLevel:'easy'})));
  const page=await context.newPage();await page.goto(base+'racket-lab.html?debug=1');await page.waitForFunction(()=>!!window.__racketLab);
  const before=await page.evaluate(()=>({settings:window.__racketLab.state.settings,sound:window.__racketLab.state.sound,stored:localStorage.getItem('corogalism-settings')}));
  assert.equal(before.settings.maxTiltAngleDeg,31,'本編で保存した傾き感度を引き継ぐ');assert.equal(before.sound.enabled,false,'本編の消音設定を引き継ぐ');
  await page.locator('summary').first().click();await page.locator('#max-tilt').fill('42');await page.locator('#defaults').click();
  assert.equal(await page.evaluate(()=>window.__racketLab.state.settings.maxTiltAngleDeg),31,'初期化も保存済み感度へ戻す');
  assert.equal(await page.evaluate(()=>localStorage.getItem('corogalism-settings')),before.stored,'検証で本編の設定を上書きしない');
  rows.push({savedSettings:true,maxTiltAngleDeg:31,soundEnabled:false});console.log('PASS racket saved settings/read only');await context.close();
 }
 if(process.env.RACKET_FOCUS!=='ui'){
  const page=await browser.newPage({serviceWorkers:'block'});await page.route('**/src/render/canvasRenderer.js',route=>route.fulfill({contentType:'text/javascript',body:'export function createRenderer() {}'}));
  await page.goto(base+'racket-lab.html?debug=1');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('更新が必要'));
  assert.equal(await page.evaluate(()=>!!window.__racketLab),false);assert.equal(await page.locator('button:not(:disabled),select:not(:disabled),input:not(:disabled)').count(),0);
  rows.push({oldRendererGuard:true});console.log('PASS racket old renderer guard');await page.close();
 }
 // 既存ページから資材を保存し、未訪問の新規URLをオフラインで開く。
 if(process.env.RACKET_FOCUS!=='ui'&&process.env.RACKET_OFFLINE!=='0'){
  const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2.625});await setup(context);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'ball-lab.html?debug=1');await page.waitForFunction(()=>!!window.__ballLab);
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const cache=await page.evaluate(async()=>{
   const names=await caches.keys(),keys=await(await caches.open(names.find(n=>n.startsWith('corogalism-')))).keys();
   return {names,files:keys.length,racketFiles:keys.map(k=>new URL(k.url).pathname).filter(p=>p.toLowerCase().includes('racket'))};
  });
  assert.ok(cache.racketFiles.some(p=>p.endsWith('/racket-lab.html')),'新ページも予め保存する');
  if(process.env.PRECACHE_COUNT)assert.equal(cache.files,Number(process.env.PRECACHE_COUNT));
  await context.setOffline(true);await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
  await page.goto(base+'racket-lab.html?debug=1&mode=rackets&offline-probe=1');await page.waitForFunction(()=>!!window.__racketLab);
  await page.locator('#scenario').selectOption('rackets');await page.clock.runFor(32);await page.locator('#reset').click();await page.clock.runFor(32);
  const before=await page.evaluate(()=>window.__racketLab.state);await page.locator('#board').scrollIntoViewIfNeeded();const r=await page.locator('#board').boundingBox();
  await page.mouse.move(r.x+r.width*.72,r.y+r.height*.7);await page.mouse.down();await page.clock.runFor(350);await page.mouse.up();
  const after=await page.evaluate(()=>window.__racketLab.state);assert.ok(Math.hypot(after.actor.x-before.actor.x,after.actor.y-before.actor.y)>.01,'オフラインでも実pointerで球を動かす');
  assert.ok(positions(after.rackets).some((w,i)=>Math.hypot(w.x-before.rackets[i].x,w.y-before.rackets[i].y)>.01),'オフラインでもラケットを動かす');
  assert.equal(after.lastHalt,null);assert.deepEqual(errors,[]);rows.push({offline:true,cache,actor:after.actor,rackets:positions(after.rackets),errors});
  console.log('PASS racket offline/new URL '+cache.files+' assets');await context.close();
 }
}finally{await writeFile(output+'/results.json',JSON.stringify(rows,null,2)+'\n');await browser.close();}
