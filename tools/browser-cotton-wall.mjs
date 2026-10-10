import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8767/';
const output=process.env.COTTON_OUTPUT||'docs/verification/cotton-wall/local';
await mkdir(output,{recursive:true});const rows=[];
const setup=async context=>context.addInitScript(()=>{
 Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});
 Element.prototype.requestFullscreen=()=>Promise.reject(Error('test fullscreen'));
});
try{
 for(const [width,height]of [[320,568],[412,915],[576,1024]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:width===412?2.625:1,serviceWorkers:'block'});
  await setup(context);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
  await page.goto(base+'ball-lab.html?preset=cotton&debug=1');await page.waitForFunction(()=>!!window.__ballLab);
  await page.evaluate(()=>document.fonts.ready);await page.clock.runFor(32);
  const state=()=>page.evaluate(()=>window.__ballLab.state);
  const initial=await state();assert.equal(initial.settings.ball,'superball');assert.equal(initial.settings.floor,'ice');assert.equal(initial.settings.wall,'rubber');
  assert.equal(initial.settings.mixCotton,true);assert.equal(initial.settings.physics,'explore');assert.equal(initial.settings.settleBounce,false);
  assert.equal(initial.stage.walls.filter(w=>w.materialId==='cotton').length,6);
  assert.match(await page.locator('header').textContent(),/おためし8.*v0\.6\.27/);
  const records=await page.evaluate(()=>JSON.stringify({...localStorage}));
  const pointer=async()=>{
   await page.locator('#board').scrollIntoViewIfNeeded();const r=await page.locator('#board').boundingBox();
   await page.mouse.move(r.x+r.width*.5,r.y+r.height*.15);await page.mouse.down();await page.clock.runFor(450);await page.mouse.up();
  };
  for(const layout of ['plaza','maze']){
   await page.locator('#layout').selectOption(layout);await page.clock.runFor(32);
   await page.evaluate(()=>window.__ballLab.teleport(3.5,1.2));await pointer();const cotton=await state();
   assert.ok(cotton.sound.events.includes('hit:superball:cotton'),'実pointerで綿へ衝突');
   assert.ok(Math.abs(cotton.actor.vy)<1e-8,'綿で反発を吸収');assert.ok(cotton.actor.y>=.395-1e-8,'壁を抜けない');
   assert.equal(cotton.lastHalt,null);assert.equal(cotton.sound.rolling,false);
   await page.locator('#mix-cotton').uncheck();await page.clock.runFor(32);
   await page.evaluate(()=>window.__ballLab.teleport(3.5,1.2));await pointer();const rubber=await state();
   assert.ok(rubber.sound.events.includes('hit:superball:rubber'));assert.ok(rubber.actor.vy>1,'同じ場所のゴムは勢いを増して反発');
   await page.locator('#pause').click();await page.clock.runFor(32);
   const before=(await state()).actor;await page.locator('#mix-cotton').check();await page.clock.runFor(32);
   assert.deepEqual((await state()).actor,before,'綿切替は位置と速さを保持');
   await page.evaluate(()=>window.__ballLab.teleport(3.5,2.5));
   rows.push({width,height,layout,cottonActor:cotton.actor,rubberActor:rubber.actor,cottonCount:cotton.stage.walls.filter(w=>w.materialId==='cotton').length,realPointer:true,errors});
   await page.locator('#pause').click();await page.clock.runFor(32);
   await page.screenshot({path:`${output}/${layout}-${width}.png`,fullPage:true});
  }
  await page.locator('#pause').click();await page.clock.runFor(32);
  await page.locator('summary').click();
  for(const count of ['0','1','6','999']){
   await page.locator('#cotton-count').fill(count);await page.clock.runFor(32);
   const s=await state();assert.equal(s.stage.walls.filter(w=>w.materialId==='cotton').length,Math.min(Number(count),s.stage.walls.length));
  }
  await page.locator('#cotton-count').fill('6');await page.locator('#cotton-restitution').fill('.2');await page.clock.runFor(32);
  assert.equal((await state()).settings.wallValues.cotton,.2);assert.match(await page.locator('#cotton-note').textContent(),/反発を調整中/);
  assert.match(await page.locator('#physics-readout').textContent(),/綿.*0\.189/);
  await page.locator('#cotton-restitution').fill('0');await page.clock.runFor(32);
  await page.locator('#wall').selectOption('cotton');await page.clock.runFor(32);
  assert.ok((await state()).stage.walls.every(w=>w.materialId==='cotton'));
  await page.locator('#wall').selectOption('rubber');await page.clock.runFor(32);
  await page.locator('#copy').click();const shared=JSON.parse(await page.locator('#settings-text').inputValue());
  assert.equal(shared.revision,8);assert.equal(shared.mixCotton,true);assert.equal(shared.cottonCount,6);assert.equal(shared.wallValues.cotton,0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),records);assert.deepEqual(errors,[]);
  console.log(`PASS cotton wall: ${width}, plaza/maze, real pointer, edits/share`);await context.close();
 }
 // 未訪問の設定URLを完全オフラインで開く。キャッシュは通常URLから準備する。
 const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2.625});await setup(context);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'ball-lab.html?debug=1');await page.waitForFunction(()=>!!window.__ballLab);
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const cache=await page.evaluate(async()=>{const names=await caches.keys();return {names,files:(await (await caches.open(names[0])).keys()).length};});assert.equal(cache.files,107);
 await context.setOffline(true);await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 await page.goto(base+'ball-lab.html?preset=cotton&debug=1&offline=1');await page.waitForFunction(()=>!!window.__ballLab);
 assert.equal(await page.evaluate(()=>window.__ballLab.state.settings.mixCotton),true);
 await page.evaluate(()=>window.__ballLab.teleport(3.5,1.2));await page.locator('#board').scrollIntoViewIfNeeded();const r=await page.locator('#board').boundingBox();
 await page.mouse.move(r.x+r.width*.5,r.y+r.height*.15);await page.mouse.down();await page.clock.runFor(450);await page.mouse.up();
 const offline=await page.evaluate(()=>window.__ballLab.state);assert.ok(offline.sound.events.includes('hit:superball:cotton'));assert.ok(Math.abs(offline.actor.vy)<1e-8);assert.deepEqual(errors,[]);
 rows.push({offline:true,cache,actor:offline.actor,sound:offline.sound,errors});await context.close();console.log('PASS cotton wall offline:107 assets, new preset, pointer/impact');
 // 古い保存資材で綿が標準壁になる経路は、更新案内へ止める。
 for(const [path,body]of [['src/world/materials.js','export const MATERIALS={};'],['src/lab/ballLabStage.js','export function createBallLabStage() {}']]){
  const p=await browser.newPage({serviceWorkers:'block'});await p.route('**/'+path,route=>route.fulfill({contentType:'text/javascript',body}));
  await p.goto(base+'ball-lab.html?preset=cotton');await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('更新が必要'));
  assert.equal(await p.evaluate(()=>!!window.__ballLab),false);assert.equal(await p.locator('button:not(:disabled),select:not(:disabled),input:not(:disabled)').count(),0);await p.close();
 }
 rows.push({oldCottonGuards:2});console.log('PASS old cotton asset guards:2');
}finally{await writeFile(`${output}/results.json`,JSON.stringify(rows,null,2)+'\n');await browser.close();}
