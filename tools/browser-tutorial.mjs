import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8765/';
await mkdir('docs/verification/tutorial',{recursive:true});
try {
 for(const [width,height] of [[320,568],[390,844],[576,1024]]){
 const ctx=await browser.newContext({viewport:{width,height},serviceWorkers:'block',hasTouch:true});
 await ctx.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true}));
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
 await p.goto(base+'?debug=1&seed=123');await p.waitForFunction(()=>!!window.__corogalism);
 const state=()=>p.evaluate(()=>window.__corogalism.state);
 const click=async id=>{await p.locator('#'+id).click();await p.clock.runFor(32)};
 const ready=async()=>{const s=await state();await p.clock.runFor(s.prepareMs+s.countdownMs+32)};
 const teleport=async(x,y)=>{await p.evaluate(([x,y])=>window.__corogalism.teleport(x,y),[x,y]);await p.clock.runFor(32)};
 await click('btn-tutorial');assert.equal(await p.locator('#board').isVisible(),false);await p.evaluate(()=>document.fonts.ready);
 await p.screenshot({path:`docs/verification/tutorial/intro-${width}.png`});
 await click('btn-tutorial-start');await ready();assert.equal((await state()).gameMode,'tutorial');assert.equal((await state()).limitSec,null);assert.equal((await state()).mode,'pointer');
 assert.equal(await p.locator('#time-meter-block').isVisible(),false);assert.equal(await p.locator('#hp-meter-block').isVisible(),true);
 await p.locator('#canvas').screenshot({path:`docs/verification/tutorial/board-${width}.png`});await p.screenshot({path:`docs/verification/tutorial/play-${width}.png`});
 // とりもち接触の説明中は拘束時間も止まり、自動終了フレームにも加算しない。
 await teleport(1.5,4.5);assert.equal((await state()).tutorialOpen,true);assert.ok((await state()).trap);
 const before=await state();await p.clock.runFor(3500);assert.equal((await state()).tutorialOpen,true);assert.equal((await state()).trap.elapsed,before.trap.elapsed);assert.equal((await state()).timeMs,before.timeMs);
 await p.screenshot({path:`docs/verification/tutorial/lesson-${width}.png`});await p.clock.runFor(550);assert.equal((await state()).tutorialOpen,false);assert.ok((await state()).trap.elapsed<.1);
 await p.clock.runFor(3100);assert.equal((await state()).trap,null);
 await teleport(3.5,3.5);assert.match(await p.locator('.tutorial-copy').innerText(),/じっと/);
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))});await p.clock.runFor(6000);assert.equal((await state()).tutorialOpen,true);
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'))});await p.clock.runFor(32);
 await p.locator('#tutorial-lesson button').tap();await p.clock.runFor(32);assert.equal((await state()).tutorialOpen,false);assert.equal((await state()).paused,true);await click('btn-resume');await ready();
 // 一度読んだ床の説明は再接触しても出ない。
 await teleport(.5,.5);await teleport(3.5,3.5);assert.equal((await state()).tutorialOpen,false);
 await teleport(3.5,.5);assert.match(await p.locator('.tutorial-copy').innerText(),/回復/);await p.keyboard.press('Escape');await p.clock.runFor(32);
 await teleport(5.5,2.5);assert.match(await p.locator('.tutorial-copy').innerText(),/肩代わり/);await p.keyboard.press('Escape');await p.clock.runFor(32);
 await teleport(4.5,5.5);assert.match(await p.locator('.tutorial-context').innerText(),/チャレンジ/);await p.keyboard.press('Escape');await p.clock.runFor(32);
 // 壁へ実際に接近し、衝突コールバック経由の説明を確認。
 await teleport(2.5,1.5);await p.evaluate(()=>window.__corogalism.setTilt(0,1));await p.clock.runFor(450);
 assert.equal((await state()).tutorialOpen,true);assert.match(await p.locator('.tutorial-context').innerText(),/速さと壁の素材/);await p.keyboard.press('Escape');await p.clock.runFor(32);
 await click('btn-pause');await click('btn-pause-guide');assert.equal(await p.locator('#play-guide').isVisible(),true);await p.keyboard.press('Escape');await click('btn-resume');await ready();
 await teleport(6.5,6.5);assert.equal((await state()).screen,'clear');assert.equal(await p.locator('#clear-heading').innerText(),'できた！');
 assert.equal(await p.evaluate(()=>localStorage.getItem('corogalism-bests')),null);assert.equal(await p.evaluate(()=>localStorage.getItem('corogalism-run-bests')),null);
 await click('btn-retry');await ready();assert.equal((await state()).shield,0);await teleport(1.5,4.5);assert.equal((await state()).tutorialOpen,true);await p.keyboard.press('Escape');await p.clock.runFor(32);await click('btn-game-exit');assert.equal((await state()).screen,'mode');
 await click('btn-practice');await ready();assert.equal(await p.locator('#challenge-hud').isVisible(),false);await teleport(6.5,6.5);assert.equal(await p.locator('#btn-next').innerText(),'次の迷路');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 await ctx.close();console.log('PASS tutorial: '+width);
 }
 // 既存基準を持つ端末でも、開始姿勢を測り直す。無信号はタッチへ。
 for(const sensor of ['granted','denied','silent']){
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await ctx.addInitScript(sensor=>{
  localStorage.setItem('corogalism-settings',JSON.stringify({mode:'tilt',calibration:{beta:40,gamma:10}}));
  Object.defineProperty(window,'DeviceOrientationEvent',{value:class{static async requestPermission(){return sensor==='denied'?'denied':'granted'}},configurable:true});
 },sensor);
 const p=await ctx.newPage();await p.clock.install();await p.clock.pauseAt(Date.now()+1000);await p.goto(base+'?debug=1');await p.waitForFunction(()=>!!window.__corogalism);
 await p.locator('#btn-tutorial').click();await p.locator('#btn-tutorial-start').click();await p.waitForFunction(()=>window.__corogalism.state.gameMode==='tutorial');
 if(sensor==='granted'){
 for(let i=0;i<7;i++){await p.evaluate(()=>{const e=new Event('deviceorientation');Object.assign(e,{beta:15,gamma:0});dispatchEvent(e)});await p.clock.runFor(100);}
 assert.deepEqual(await p.evaluate(()=>window.__corogalism.state.calibration),{beta:15,gamma:0});
 await p.clock.runFor(3800);assert.equal(await p.evaluate(()=>window.__corogalism.state.mode),'tilt');
 }else{await p.clock.runFor(5500);assert.equal(await p.evaluate(()=>window.__corogalism.state.mode),'pointer');}
 await ctx.close();console.log('PASS tutorial sensor: '+sensor);
 }
}finally{await browser.close()}
