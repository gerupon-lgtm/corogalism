import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8767/';
const output=process.env.EXPLORATION_OUTPUT||'docs/verification/exploration';await mkdir(output,{recursive:true});const rows=[];
try{for(const [width,height]of [[320,568],[390,844],[576,1024]]){
 const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));});
 await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 await page.goto(base+'ball-lab.html?debug=1');await page.waitForFunction(()=>!!window.__ballLab);
 await page.evaluate(()=>document.fonts.ready);await page.clock.runFor(128);
 const state=()=>page.evaluate(()=>window.__ballLab.state);
 assert.equal((await state()).settings.physics,'explore');assert.equal((await state()).settings.settleBounce,false);
 assert.equal(await page.locator('#wall option').count(),6);
 await page.locator('[data-ball=superball]').click();await page.locator('#floor').selectOption('ice');
 const rebounds={};
 for(const wall of ['default','rubber']){
  await page.locator('#wall').selectOption(wall);await page.evaluate(()=>window.__ballLab.teleport(6.59,.5,4,0));await page.clock.runFor(24);
  rebounds[wall]=(await state()).actor.vx;assert.ok(rebounds[wall]<0);
 }
 assert.ok(Math.abs(rebounds.rubber)>Math.abs(rebounds.default)*2);
 const coasting={};await page.locator('#wall').selectOption('default');
 for(const floor of ['normal','ice']){
  await page.locator('#floor').selectOption(floor);await page.evaluate(()=>window.__ballLab.teleport(3.3,.5,2,0));await page.clock.runFor(600);coasting[floor]=(await state()).actor.vx;
 }
 assert.ok(coasting.ice>coasting.normal+.15);
 await page.locator('[data-ball=metal]').click();await page.locator('#floor').selectOption('normal');
 await page.evaluate(()=>window.__ballLab.teleport(2,.5,100,0));await page.clock.runFor(16);assert.ok((await state()).actor.vx>90);
 await page.locator('#physics').selectOption('legacy');await page.clock.runFor(16);assert.ok(Math.abs((await state()).actor.vx)<=6.8);
 await page.locator('#physics').selectOption('explore');
 await page.locator('summary').click();
 for(const [id,value]of [['ball-fieldK','12'],['floor-force','20'],['floor-radius','4'],['floor-ice','0.0001'],['wall-restitution','4']]){
  await page.locator('#'+id).fill(value);await page.locator('#'+id).dispatchEvent('input');assert.equal(await page.locator('#'+id).inputValue(),value);
  assert.equal(await page.locator('#'+id).getAttribute('max'),null);
 }
 await page.locator('#material-defaults').click();
 // 実際の入力で動き、ポーズで止まる。デバッグ位置移動とは別に確認する。
 await page.locator('#board').scrollIntoViewIfNeeded();const box=await page.locator('#board').boundingBox();
 await page.mouse.move(box.x+box.width*.7,box.y+box.height*.5);await page.mouse.down();await page.clock.runFor(600);await page.mouse.up();
 assert.ok((await state()).actor.x>.55);await page.locator('#pause').click();const stopped=(await state()).actor;
 await page.clock.runFor(500);assert.deepEqual((await state()).actor,stopped);await page.locator('#pause').click();
 await page.locator('[data-ball=superball]').click();await page.locator('#floor').selectOption('ice');await page.locator('#wall').selectOption('rubber');
 await page.evaluate(()=>window.__ballLab.teleport(.5,.5,4,0));await page.clock.runFor(3500);
 assert.equal((await state()).paused,true);assert.ok((await state()).lastHalt);assert.ok(Math.abs((await state()).actor.vx)>30);
 assert.match(await page.locator('#status').textContent(),/速度を丸めず一時停止/);
 await page.locator('#copy').click();const shared=JSON.parse(await page.locator('#settings-text').inputValue());
 assert.equal(shared.revision,6);assert.equal(shared.physics,'explore');assert.ok(shared.observations.length>0);
 await page.locator('#reset').click();await page.locator('[data-ball=wood]').click();await page.locator('#wall').selectOption('default');await page.locator('#pause').click();await page.clock.runFor(32);
 assert.equal((await state()).paused,false);assert.equal((await state()).lastHalt,null);assert.doesNotMatch(await page.locator('#status').textContent(),/計算|一時停止/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${output}/ball-${width}.png`,fullPage:true});
 await page.goto(base+'floor-lab.html?debug=1');await page.waitForFunction(()=>!!window.__floorLab);
 assert.equal(await page.evaluate(()=>window.__floorLab.physics),'explore');
 for(const [id,value]of [['ice','0.0001'],['sand','20'],['force','24'],['radius','4']]){
  await page.locator('#'+id).fill(value);await page.locator('#'+id).dispatchEvent('input');assert.equal(await page.locator('#'+id).inputValue(),value);assert.equal(await page.locator('#'+id).getAttribute('max'),null);
 }
 await page.locator('#radius').fill('0');await page.locator('#radius').dispatchEvent('input');assert.equal(await page.evaluate(()=>window.__floorLab.settings.radius),4);
 assert.match(await page.locator('#input-note').textContent(),/0より大きい/);
 await page.locator('#physics').selectOption('legacy');assert.equal(await page.evaluate(()=>window.__floorLab.physics),'legacy');
 await page.locator('#physics').selectOption('explore');await page.locator('#defaults').click();await page.locator('#copy').click();
 assert.match(await page.locator('#input-note').textContent(),/初期値に戻しました/);
 assert.equal(JSON.parse(await page.locator('#settings-text').inputValue()).revision,8);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:`${output}/floor-${width}.png`,fullPage:true});assert.deepEqual(errors,[]);
 rows.push({width,rebounds,coasting,halt:shared.observations.at(-1),errors});console.log('PASS exploration '+width);await page.close();
}}finally{await writeFile(`${output}/browser.json`,JSON.stringify(rows,null,2));await browser.close();}
