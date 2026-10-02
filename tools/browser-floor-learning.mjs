import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8767/';
const output=process.env.LEARNING_OUTPUT||'docs/verification/floor-learning';await mkdir(output,{recursive:true});
try{for(const [width,height]of [[320,568],[390,844],[576,1024]]){
 const p=await b.newPage({viewport:{width,height},serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:'easy'}));});
 await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
 await p.goto(base+'?debug=1&seed=77');await p.waitForLoadState('networkidle');await p.clock.runFor(32);
 const state=()=>p.evaluate(()=>window.__corogalism.state);
 const click=async id=>{await p.locator('#'+id).click();await p.clock.runFor(32)};
 const ready=async()=>{const s=await state();await p.clock.runFor(s.prepareMs+s.countdownMs+100)};
 await p.screenshot({path:`${output}/title-${width}.png`,fullPage:true});
 const records=await p.evaluate(()=>localStorage.getItem('corogalism-bests'));
 await click('btn-floor-practice');await ready();
 assert.equal((await state()).gameMode,'floor-practice');assert.equal((await state()).hp,null);assert.equal((await state()).limitSec,null);
 let layout=JSON.stringify((await state()).maze.cells);
 for(const kind of ['sand','ice','gravity','repulsion','normal']){
  await p.locator(`[data-floor=${kind}]`).click();await p.clock.runFor(32);
  assert.equal((await state()).theme.practiceKind,kind);assert.equal(JSON.stringify((await state()).maze.cells),layout);
  assert.equal(await p.locator(`[data-floor=${kind}]`).getAttribute('aria-pressed'),'true');
  // 接触説明の機能確認用に位置を合わせる。移動テストとは区別する。
  await p.evaluate(kind=>{window.__corogalism.setTilt(0,0);window.__corogalism.teleport(kind==='normal'?.5:3.5,.5)},kind);
  await p.clock.runFor(500);
  const hint=await p.locator('#floor-contact-hint').textContent();assert.ok(hint.includes({sand:'砂',ice:'氷',gravity:'重力',repulsion:'反重力',normal:'普通'}[kind]),hint);
  assert.equal(await p.locator('#floor-contact-hint').isVisible(),true);
  await p.screenshot({path:`${output}/${kind}-${width}.png`,fullPage:true});
 }
 await click('btn-pause');assert.equal(await p.locator('#floor-contact-hint').isVisible(),false);
 assert.equal(await p.locator('[data-floor=sand]').isDisabled(),true);
 await click('btn-pause-guide');await p.locator('.guide-x').click();assert.equal((await state()).paused,true);
 await click('btn-resume');await ready();
 await click('btn-floor-reset');await ready();assert.equal((await state()).actor.x,.5);
 const rect=await p.locator('#board').boundingBox();
 await p.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await p.mouse.down();await p.mouse.move(rect.x+rect.width*.7,rect.y+rect.height/2);await p.clock.runFor(600);await p.mouse.up();
 const before=await state();assert.ok(before.actor.x>.6);
 await p.locator('[data-floor=sand]').click();await p.clock.runFor(32);const after=await state();
 assert.ok(Math.abs(after.actor.x-before.actor.x)<.3,'switch keeps current position');assert.ok(after.actor.vx>0,'switch keeps movement');
 await p.evaluate(()=>{window.__corogalism.setTilt(0,0);const s=window.__corogalism.state;window.__corogalism.teleport(s.goal.x,s.goal.y)});await p.clock.runFor(32);
 assert.equal((await state()).screen,'clear');assert.equal(await p.evaluate(()=>localStorage.getItem('corogalism-bests')),records);
 await click('btn-retry');await ready();assert.equal((await state()).theme.practiceKind,'sand');assert.equal((await state()).actor.x,.5);
 await click('btn-game-exit');assert.equal((await state()).screen,'mode');
 await click('btn-challenge');await ready();
 for(let n=1;n<3;n++){await p.evaluate(()=>{const s=window.__corogalism.state;window.__corogalism.teleport(s.goal.x,s.goal.y)});await p.clock.runFor(32);await click('btn-next');await ready();}
 assert.ok((await state()).limitSec>=45&&(await state()).limitSec<90);assert.ok((await state()).zones.find(z=>z.kind==='sand').cells.length>=4);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 console.log('PASS floor learning '+width);await p.close();
}}finally{await b.close()}
