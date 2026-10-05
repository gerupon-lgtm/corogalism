import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await c.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined}));
 const base=process.env.BASE_URL||'http://127.0.0.1:8767/';
 await p.goto(base+'ball-lab.html?debug=1');await p.waitForFunction(()=>!!window.__ballLab);
 await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>navigator.serviceWorker.controller);
 const cache=await p.evaluate(async()=>{const names=await caches.keys();return {names,files:(await (await caches.open(names[0])).keys()).length}});assert.equal(cache.files,Number(process.env.PRECACHE_COUNT||101));
 await c.setOffline(true);await p.goto(base+'ball-lab.html?debug=1&offline-probe=1');await p.waitForFunction(()=>!!window.__ballLab);
 assert.equal(await p.evaluate(()=>window.__ballLab.state.settings.physics),'explore');
 await p.locator('[data-ball=metal]').click();await p.locator('#floor').selectOption('normal');await p.evaluate(()=>window.__ballLab.teleport(2,.5,100,0));await p.waitForTimeout(16);
 assert.ok(await p.evaluate(()=>window.__ballLab.state.actor.vx>6.8),'オフラインでも以前の最高速に丸めない');await p.locator('#reset').click();
 await p.locator('#physics').selectOption('legacy');
 await p.locator('[data-ball=superball]').click();await p.locator('#floor').selectOption('mixed');await p.locator('#wall').selectOption('rubber');
 await p.locator('#board').scrollIntoViewIfNeeded();const r=await p.locator('#board').boundingBox();await p.mouse.move(r.x+r.width*.7,r.y+r.height/2);await p.mouse.down();await p.waitForTimeout(350);await p.mouse.up();await p.waitForTimeout(350);
 const state=await p.evaluate(()=>window.__ballLab.state);assert.ok(state.actor.x>.7);assert.equal(state.sound.rolling,false);assert.ok(!state.sound.events.some(e=>e.startsWith('roll:superball:')));assert.equal(state.sound.context,'running');
 await p.evaluate(()=>window.__ballLab.teleport(6.2,.5,4,0));await p.waitForTimeout(350);
 const hit=await p.evaluate(()=>window.__ballLab.state.sound);assert.ok(hit.events.includes('hit:superball:rubber'));
 await p.locator('[data-ball=default]').click();await p.evaluate(()=>window.__ballLab.teleport(2,.5,2,0));await p.waitForTimeout(150);
 const glass=await p.evaluate(()=>window.__ballLab.state.sound);assert.ok(glass.events.includes('roll:default:ice'));
 await p.locator('[data-ball=metal]').click();await p.evaluate(()=>window.__ballLab.teleport(2,.5,2,0));await p.waitForTimeout(150);
 const metal=await p.evaluate(()=>window.__ballLab.state.sound);assert.ok(metal.events.includes('roll:metal:ice'));assert.equal(metal.rolling,true);
 await p.locator('[data-ball=wood]').click();await p.locator('#wall').selectOption('stone');await p.evaluate(()=>window.__ballLab.teleport(6.2,.5,4,0));await p.waitForTimeout(350);
 const wood=await p.evaluate(()=>window.__ballLab.state.sound);assert.ok(wood.events.includes('hit:wood:stone'));
 await p.goto(base+'floor-lab.html?debug=1&pattern=timeTrialAssist');await p.waitForFunction(()=>!!window.__floorLab);
 assert.equal(await p.evaluate(()=>window.__floorLab.physics),'explore');assert.equal(await p.evaluate(()=>window.__floorLab.pattern),'timeTrialAssist');await p.locator('#board').scrollIntoViewIfNeeded();
 const before=await p.evaluate(()=>({x:window.__floorLab.actor.x,y:window.__floorLab.actor.y})),floorRect=await p.locator('#board').boundingBox();
 await p.mouse.move(floorRect.x+floorRect.width*.7,floorRect.y+floorRect.height*.6);await p.mouse.down();await p.waitForTimeout(350);await p.mouse.up();
 const floorActor=await p.evaluate(()=>({x:window.__floorLab.actor.x,y:window.__floorLab.actor.y}));assert.ok(Math.hypot(floorActor.x-before.x,floorActor.y-before.y)>.001,'床ページも完全オフラインで実pointer操作できる');
 await p.goto(base+'?debug=1&offline-probe=1');await p.waitForFunction(()=>!!window.__corogalism);
 await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
 await p.locator('#btn-challenge').click();await p.clock.runFor(3800);
 for(let n=1;n<3;n++){
  await p.evaluate(()=>{const g=window.__corogalism.state.goal;window.__corogalism.teleport(g.x,g.y);});
  await p.clock.runFor(2200);await p.locator('#btn-next').click();await p.clock.runFor(3800);
 }
 const mainState=await p.evaluate(()=>window.__corogalism.state),mainSand=mainState.zones.find(z=>z.kind==='sand');
 const branchSand=mainSand.cells.filter(c=>!mainState.maze.path.some(q=>q.x===c.x&&q.y===c.y)).length;
 assert.ok(branchSand>0,'オフラインでも脇道の砂を生成');
 const mainRect=await p.locator('#board').boundingBox(),next=mainState.maze.path[1];
 await p.mouse.move(mainRect.x+mainRect.width*(.5+(next.x-mainState.maze.path[0].x)*.3),mainRect.y+mainRect.height*(.5+(next.y-mainState.maze.path[0].y)*.3));
 await p.mouse.down();await p.clock.runFor(400);await p.mouse.up();
 const mainActor=await p.evaluate(()=>window.__corogalism.state.actor);
 assert.ok(Math.hypot(mainActor.x-mainState.actor.x,mainActor.y-mainState.actor.y)>.001,'オフラインでも本編を実pointer操作');
 await p.locator('#btn-game-exit').click();assert.equal(await p.locator('#run-end-confirm').evaluate(d=>d.open),true);
 await p.locator('#btn-end-cancel').click();assert.equal(await p.locator('#run-end-confirm').evaluate(d=>d.open),false);
 assert.equal(await p.evaluate(()=>window.__corogalism.state.screen),'game');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({offline:true,...cache,softBall:state.sound,impact:hit,glass,metal,wood,floorActor,main:{stage:3,branchSand,actor:mainActor,confirmationCancelled:true}}));await c.close();
 for(const source of ['export function resolveParams() {}','// ch.fieldK\nexport function resolveParams() {}']){
  const old=await b.newPage({serviceWorkers:'block'});await old.route('**/src/physics/resolveParams.js',route=>route.fulfill({contentType:'text/javascript',body:source}));
  await old.goto(base+'ball-lab.html?debug=1');await old.waitForFunction(()=>document.querySelector('#status').textContent.includes('更新が必要'));
  assert.equal(await old.evaluate(()=>!!window.__ballLab),false);assert.equal(await old.locator('button:not(:disabled)').count(),0);await old.close();console.log('PASS old physics guard');
 }
 for(const [pageName,debugName]of [['ball-lab.html','__ballLab'],['floor-lab.html','__floorLab']]){
  const old=await b.newPage({serviceWorkers:'block'});await old.route('**/src/world/stage.js',route=>route.fulfill({contentType:'text/javascript',body:'export function sampleZone() {}'}));
  await old.goto(base+pageName+'?debug=1');await old.waitForFunction(()=>document.querySelector('#status').textContent.includes('更新が必要'));
  assert.equal(await old.evaluate(name=>!!window[name],debugName),false);assert.equal(await old.locator('button:not(:disabled), select:not(:disabled), input:not(:disabled)').count(),0);await old.close();console.log('PASS old ice guard '+pageName);
 }
 if(process.env.OFFLINE_OUTPUT)await writeFile(process.env.OFFLINE_OUTPUT,JSON.stringify({offline:true,...cache,softBall:state.sound,impact:hit,glass,metal,wood,floorActor,main:true,oldCoreGuards:4,errors},null,2)+'\n');
}finally{await b.close()}
