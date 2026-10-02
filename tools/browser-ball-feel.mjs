import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const output=process.env.FEEL_OUTPUT||'docs/verification/ball-feel';await mkdir(output,{recursive:true});const rows=[];
try{
 const p=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'))});
 await p.clock.install();
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:8767/')+'ball-lab.html?debug=1');await p.waitForFunction(()=>!!window.__ballLab);
 await p.clock.pauseAt(Date.now()+1000);
 const state=()=>p.evaluate(()=>window.__ballLab.state),box=await p.locator('#board').boundingBox();
 for(const kind of ['wood','sponge','superball']){
  await p.locator(`[data-ball="${kind}"]`).click();await p.locator('#wall').selectOption('default');await p.locator('#reset').click();
  await p.mouse.move(box.x+box.width*.9,box.y+box.height*.5);await p.mouse.down();await p.clock.runFor(800);await p.mouse.up();
  const moving=(await state()).actor;await p.clock.runFor(200);const released=(await state()).actor;
  assert.ok(moving.vx>1);assert.ok(released.vx>.5,'短い余韻を残して転がる');
  await p.screenshot({path:`${output}/${kind}-coast.png`,fullPage:true});
  await p.locator('#reset').click();await p.mouse.move(box.x+box.width*.9,box.y+box.height*.5);await p.mouse.down();await p.clock.runFor(kind==='superball'?14000:5000);
  const resting=(await state()).actor;await p.clock.runFor(600);const settled=(await state()).actor;await p.mouse.up();
  assert.ok(resting.x>6.6,'実操作で右の壁まで移動');assert.ok(Math.abs(settled.x-resting.x)<.001);assert.equal(settled.vx,0,'傾け続けた壁で微小反発を繰り返さない');
  rows.push({kind,moving,released,resting,settled});
 }
 // 音の境界も同じ実プレイ経路で確認する。
 await p.locator('[data-ball="metal"]').click();await p.locator('#reset').click();
 await p.waitForFunction(()=>window.__ballLab.state.sound.context==='running');
 await p.evaluate(()=>window.__ballLab.teleport(2,.5,.08,0));await p.clock.runFor(32);assert.equal((await state()).sound.rolling,false);
 await p.evaluate(()=>window.__ballLab.teleport(2,.5,2,0));await p.clock.runFor(32);assert.equal((await state()).sound.rolling,true);
 await p.locator('#pause').click();await p.clock.runFor(100);assert.equal((await state()).sound.rolling,false);
 assert.deepEqual(errors,[]);console.log('PASS wood/sponge/superball coasting and settling; rolling threshold and pause');
}finally{await writeFile(output+'/browser-feel.json',JSON.stringify(rows,null,2));await browser.close()}
