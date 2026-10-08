import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=new URL(process.env.BASE_URL || 'http://127.0.0.1:8768/');
const version=process.env.NOTICE_VERSION || '0.6.23';
const output=new URL(`../docs/verification/play-notices/v${version.replaceAll('.', '')}/`,import.meta.url);
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[];
try{
 const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2.625});
 await context.addInitScript(()=>{
  Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});
  localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',soundEnabled:true}));
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base.href);assert.equal(await page.locator('.badge').textContent(),'v'+version);
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 const cache=await page.evaluate(async()=>{
  const names=(await caches.keys()).filter(n=>n.startsWith('corogalism-'));
  const files=await (await caches.open(names[0])).keys();return {names,files:files.length};
 });
 assert.equal(cache.files,107);
 await context.setOffline(true);
 await page.goto(new URL('?debug=1&seed=77',base).href);
 await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 await page.locator('#btn-floor-practice').click();await page.clock.runFor(3800);
 const floors=[];
 for(const kind of ['sand','ice','gravity','repulsion','normal']){
  await page.locator(`[data-floor="${kind}"]`).click();await page.clock.runFor(32);
  await page.evaluate(kind=>{window.__corogalism.setTilt(0,0);window.__corogalism.teleport(kind==='normal'?.5:3.5,.5);},kind);
  await page.clock.runFor(500);
  assert.equal(await page.locator('#floor-contact-hint').isVisible(),true);
  const r=await page.locator('#floor-contact-hint').boundingBox(),b=await page.locator('#board').boundingBox();
  assert.ok(r.y>=b.y+b.height-.1);floors.push({kind,text:await page.locator('#floor-contact-hint').innerText()});
 }
 await new Promise(resolve=>setTimeout(resolve,1200));await page.clock.runFor(32);
 const audio=await page.evaluate(()=>window.__corogalism.state.audio);
 assert.equal(audio.loaded,true);assert.equal(audio.music,true);
 await page.locator('#btn-pause').click();await page.clock.runFor(32);assert.equal(await page.locator('#play-notices').isVisible(),false);
 await page.locator('#btn-pause-guide').click();await page.locator('.guide-x').click();
 assert.equal(await page.evaluate(()=>window.__corogalism.state.paused),true);
 for(const path of ['ball-lab.html?debug=1','floor-lab.html?debug=1']){
  await page.goto(new URL(path,base).href);assert.ok((await page.locator('header').innerText()).includes('v'+version));
  // ボールのおためしは最初から画面操作で、切替ボタンは隠れている。
  await page.locator('#sensor').click();await page.clock.runFor(32);
  assert.match(await page.locator('#status').innerText(),/画面操作|画面操作で遊べます/);
  const canvas=page.locator('canvas#board');assert.equal(await canvas.isVisible(),true);
  const box=await canvas.boundingBox();
  await page.mouse.move(box.x+box.width*.7,box.y+box.height*.6);await page.mouse.down();
  await page.clock.runFor(200);await page.mouse.up();
 }
 await page.goto(new URL('?debug=1',base).href);assert.equal(await page.locator('.badge').textContent(),'v'+version);
 // 本編の新しい広場も、通信なしで生成・実pointer操作できる。
 await page.goto(new URL('?debug=1&seed=77',base).href);
 await page.locator('#btn-challenge').click();await page.clock.runFor(3800);
 for(let n=1;n<3;n++){
  await page.evaluate(()=>{const s=window.__corogalism.state;window.__corogalism.teleport(s.goal.x,s.goal.y);});
  await page.clock.runFor(32);assert.equal(await page.evaluate(()=>window.__corogalism.state.status),'clear');
  await page.clock.runFor(1100);await page.locator('#btn-next').click();await page.clock.runFor(3800);
 }
 const start=await page.evaluate(()=>window.__corogalism.state);
 assert.equal(start.stageIndex,3);assert.equal(start.maze.variation.shape,'open');assert.ok(start.maze.baffles.length>=2);
 const board=await page.locator('#board').boundingBox();
 await page.mouse.move(board.x+board.width*.75,board.y+board.height*.65);await page.mouse.down();await page.clock.runFor(600);await page.mouse.up();
 const moved=await page.evaluate(()=>window.__corogalism.state);
 assert.ok(Math.hypot(moved.actor.x-start.actor.x,moved.actor.y-start.actor.y)>.05);
 const plaza={stage:3,size:moved.maze.size,baffles:moved.maze.baffles.length,realPointerMove:true,diagnosticSkippedStages:2};
 assert.deepEqual(errors,[]);
 await mkdir(output,{recursive:true});
 await writeFile(new URL(`${base.protocol==='https:'?'public':'local'}-offline.json`,output),JSON.stringify({version,...cache,floors,audio,labs:2,plaza,errors},null,2)+'\n');
 console.log('PASS offline:107 assets, five external floor messages, BGM, pause/guide, both labs, new main plaza');
 await context.close();
}finally{await browser.close();}
