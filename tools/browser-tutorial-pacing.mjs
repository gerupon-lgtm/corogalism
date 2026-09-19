import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
await mkdir('docs/verification/tutorial-pacing',{recursive:true});
try{
 for(const [width,height] of [[320,568],[390,844],[576,1024]]){
 const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:'block'});await ctx.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true}));
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+'?debug=1');await p.waitForFunction(()=>!!window.__corogalism);
 const state=()=>p.evaluate(()=>window.__corogalism.state),click=async id=>{await p.locator('#'+id).click();await p.clock.runFor(32)};
 const teleport=async(x,y)=>{await p.evaluate(([x,y])=>{window.__corogalism.setTilt(0,0);window.__corogalism.teleport(x,y)},[x,y]);await p.clock.runFor(32)};
 const ready=async()=>{const s=await state();await p.clock.runFor(s.prepareMs+s.countdownMs+32)};
 await click('btn-tutorial');await click('btn-tutorial-start');await ready();await p.evaluate(()=>document.fonts.ready);
 const box=await p.locator('#board').boundingBox(),scroll=await p.evaluate(()=>scrollY);
 await teleport(2.5,1.5);await p.evaluate(()=>window.__corogalism.setTilt(0,1));
 for(let n=0;n<100;n++){await p.clock.runFor(16);if((await state()).actor.vy<0)break;}
 assert.ok((await state()).actor.vy<0,'rubber rebound occurs before explanation');assert.equal((await state()).tutorialOpen,false);
 await p.clock.runFor(500);assert.equal((await state()).tutorialOpen,false);await p.clock.runFor(230);assert.equal((await state()).tutorialOpen,true);assert.equal((await state()).tutorialBlocking,true);
 const stopped=await state();await p.clock.runFor(800);assert.equal((await state()).timeMs,stopped.timeMs);assert.deepEqual((await state()).actor,stopped.actor);
 await p.clock.runFor(250);assert.equal((await state()).tutorialBlocking,false);assert.equal((await state()).tutorialOpen,true);
 await p.evaluate(()=>window.__corogalism.setTilt(0,-1));const before=await state();await p.clock.runFor(300);assert.ok((await state()).timeMs>before.timeMs);assert.notEqual((await state()).actor.y,before.actor.y);
 assert.deepEqual(await p.locator('#board').boundingBox(),box);assert.equal(await p.evaluate(()=>scrollY),scroll);
 const lesson=await p.locator('#tutorial-lesson').boundingBox();assert.ok(lesson.y>=box.y+box.height);assert.ok(lesson.y+lesson.height<=height+2,'explanation fits below maze');
 await p.screenshot({path:`docs/verification/tutorial-pacing/playing-${width}.png`});
 await click('btn-pause');const progress=await p.locator('#tutorial-lesson progress').evaluate(el=>el.value);await p.clock.runFor(6000);assert.equal(await p.locator('#tutorial-lesson progress').evaluate(el=>el.value),progress);await click('btn-resume');await ready();
 await p.locator('#tutorial-lesson button').tap();await p.clock.runFor(32);assert.equal((await state()).tutorialOpen,false);assert.deepEqual(await p.locator('#board').boundingBox(),box);
 await teleport(.5,4.5);await p.clock.runFor(4200);await teleport(1.5,4.5);assert.ok((await state()).trap);assert.equal((await state()).tutorialOpen,false);await p.clock.runFor(720);assert.equal((await state()).tutorialBlocking,true);
 const trap=(await state()).trap.elapsed;await p.clock.runFor(800);assert.equal((await state()).trap.elapsed,trap);await p.clock.runFor(500);assert.equal((await state()).tutorialBlocking,false);assert.equal((await state()).tutorialOpen,true);assert.ok((await state()).trap.elapsed>trap);
 await p.clock.runFor(3000);assert.equal((await state()).tutorialOpen,false);assert.equal((await state()).trap,null);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 // 説明のための短い停止は、休憩床の蓄積時間を消さない。
 await teleport(5.5,3.5);await p.evaluate(()=>window.__corogalism.setTilt(0,1));await p.clock.runFor(450);assert.ok((await state()).hp.value<100);
 await teleport(.5,3.5);await p.clock.runFor(4300);await teleport(3.5,3.5);await p.clock.runFor(720);assert.equal((await state()).tutorialBlocking,true);
 const rest=(await state()).rest.progress;assert.ok(rest>.5);await p.clock.runFor(800);assert.equal((await state()).rest.progress,rest);await p.clock.runFor(500);assert.ok((await state()).rest.progress>rest);
 await p.locator('#tutorial-lesson button').tap();await p.clock.runFor(32);
 // 間隔中に取得したアイテムの跡地から、遅れて説明を出さない。
 await teleport(3.5,.5);await p.clock.runFor(5000);assert.equal((await state()).tutorialOpen,false);
 await teleport(.5,.5);await teleport(3.5,.5);await p.clock.runFor(720);assert.equal((await state()).tutorialOpen,false);
 await teleport(6.5,6.5);assert.equal((await state()).screen,'clear');assert.equal(await p.evaluate(()=>localStorage.getItem('corogalism-bests')),null);assert.equal(await p.evaluate(()=>localStorage.getItem('corogalism-run-bests')),null);await click('btn-retry');await ready();assert.equal((await state()).shield,0);assert.equal((await state()).tutorialOpen,false);await click('btn-game-exit');await click('btn-practice');await ready();assert.equal(await p.locator('#tutorial-lesson').isVisible(),false);
 await ctx.close();console.log('PASS pacing '+width);
 }
}finally{await browser.close()}
