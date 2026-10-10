import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8767/',output=process.env.BALL_OUTPUT||'docs/verification/ball-lab';await mkdir(output,{recursive:true});
const rows=[];
try{for(const [width,height]of [[320,568],[390,844],[576,1024]]){
 const p=await b.newPage({viewport:{width,height},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined}));
 await p.clock.install();
 await p.goto(base+'ball-lab.html?debug=1');await p.waitForFunction(()=>!!window.__ballLab);await p.evaluate(()=>document.fonts.ready);
 await p.locator('#physics').selectOption('legacy');
 await p.clock.pauseAt(Date.now()+1000);
 const state=()=>p.evaluate(()=>window.__ballLab.state);
 const click=async id=>{await p.locator('#'+id).click();await p.clock.runFor(32)};
 const records=await p.evaluate(()=>JSON.stringify({...localStorage}));
 const layout=JSON.stringify((await state()).stage.maze.cells);
 for(const id of ['metal','superball','wood','sponge','default']){
  await p.locator(`[data-ball=${id}]`).click();await p.clock.runFor(32);assert.equal((await state()).settings.ball,id);
  assert.equal(await p.locator(`[data-ball=${id}]`).getAttribute('aria-pressed'),'true');assert.equal(JSON.stringify((await state()).stage.maze.cells),layout);
  await p.screenshot({path:`${output}/${id}-${width}.png`,fullPage:true});
 }
 for(const floor of ['ice','sand','gravity','repulsion','mixed','normal']){await p.locator('#floor').selectOption(floor);await p.clock.runFor(32);assert.equal((await state()).settings.floor,floor)}
 await p.locator('[data-ball=metal]').click();await click('reset');
 const r=await p.locator('#board').boundingBox();
 await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(r.x+r.width*.75,r.y+r.height/2);await p.clock.runFor(1400);await p.mouse.up();
 const moving=await state();await p.clock.runFor(600);const coasting=await state();
 assert.ok(coasting.actor.vx>1,'金属は手を離しても動く');
 await p.waitForFunction(()=>window.__ballLab.state.sound.context==='running');await p.clock.runFor(32);
 assert.ok((await state()).sound.events.includes('roll:metal:normal'));
 await click('pause');const stopped=(await state()).actor;await p.clock.runFor(4000);assert.deepEqual((await state()).actor,stopped);assert.equal((await state()).sound.rolling,false);
 await p.locator('[data-ball=wood]').click();await p.clock.runFor(32);assert.deepEqual((await state()).actor,stopped,'切替時に位置と速度を保つ');
 await click('pause');await click('reset');
 await p.locator('[data-ball=superball]').click();await p.locator('#wall').selectOption('rubber');await click('reset');
 await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(r.x+r.width*.8,r.y+r.height/2);await p.clock.runFor(1200);await p.mouse.up();
 await p.waitForTimeout(150);await p.clock.runFor(2200);
 assert.ok((await state()).sound.events.includes('hit:superball:rubber'),'実pointerでゴム壁へ跳ねる');
 assert.equal((await state()).sound.rolling,false,'ゴム球は転がり音を鳴らさない');
 assert.ok(!(await state()).sound.events.some(e=>e.startsWith('roll:superball:')));
 assert.ok(Math.hypot((await state()).actor.vx,(await state()).actor.vy)>1,'手離し後も跳ねて転がる');
 // 衝突音の組合せの機能確認。実操作の慣性比較とは分離する。
 for(const wall of ['stone','cork']){
  await p.locator('#wall').selectOption(wall);await p.locator('[data-ball=metal]').click();
  await p.waitForTimeout(150);await p.evaluate(()=>window.__ballLab.teleport(6.2,.5,4,0));await p.clock.runFor(350);
  assert.ok((await state()).sound.events.includes(`hit:metal:${wall}`));
 }
 await click('sound');assert.equal((await state()).sound.enabled,false);assert.equal((await state()).sound.rolling,false);
 const events=(await state()).sound.events;await p.clock.runFor(500);assert.deepEqual((await state()).sound.events,events);
 await click('sound');await p.locator('summary').click();await p.locator('#volume').press('Home');await p.clock.runFor(32);assert.equal((await state()).sound.volume,0);assert.equal((await state()).sound.rolling,false);
 await p.locator('#volume').press('End');assert.equal((await state()).sound.volume,1);
 await p.locator('#layout').selectOption('maze');await p.clock.runFor(32);assert.equal((await state()).actor.x,.5);
 await p.locator('#floor').selectOption('mixed');await p.clock.runFor(32);await click('test-area');await p.clock.runFor(700);
 assert.ok((await state()).actor.x>3.1);await p.screenshot({path:`${output}/mixed-maze-${width}.png`,fullPage:true});
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{get:()=>true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))});await p.clock.runFor(500);
 assert.equal((await state()).paused,true);assert.equal((await state()).sound.rolling,false);
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{get:()=>false,configurable:true});document.dispatchEvent(new Event('visibilitychange'))});
 await click('copy');const shared=JSON.parse(await p.locator('#settings-text').inputValue());assert.equal(shared.page,'corogalism-ball-lab');assert.equal(shared.revision,8);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.equal(await p.evaluate(()=>JSON.stringify({...localStorage})),records);assert.deepEqual(errors,[]);
 rows.push({width,movingVx:moving.actor.vx,coastingVx:coasting.actor.vx,sound:(await state()).sound,errors});console.log('PASS ball lab '+width);await p.close();
}}finally{await writeFile(`${output}/browser.json`,JSON.stringify(rows,null,2));await b.close()}
