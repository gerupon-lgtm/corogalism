import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 await mkdir('docs/verification/screen-fit',{recursive:true});
 for(const [width,height] of [[393,820],[390,780],[360,800],[320,568]]){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:'block'});
  await ctx.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true}));
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
  await page.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+'?debug=1&seed=1');await page.waitForFunction(()=>Boolean(window.__corogalism));await page.evaluate(()=>document.fonts.ready);
  const title=await page.locator('#screen-mode').boundingBox();if(height>=780)assert.ok(Math.abs(title.y+title.height-(height-12))<3,JSON.stringify(title));
  await page.screenshot({path:`docs/verification/screen-fit/title-${width}.png`});
  for(const mode of ['practice','challenge']){
   await page.locator(mode==='practice'?'#btn-practice':'#btn-challenge').click();await page.clock.runFor(3700);await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('#material-legend').count(),0);
   const board=await page.locator('#board').boundingBox(),panel=await page.locator('#screen-game').boundingBox();
   assert.ok(board.width>=200&&Math.abs(board.width-board.height)<1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(height>=780){assert.ok(Math.abs(panel.y+panel.height-(height-12))<3,JSON.stringify(panel));assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1));}
   await page.locator('#canvas').screenshot({path:`docs/verification/screen-fit/board-${mode}-${width}.png`});
   await page.screenshot({path:`docs/verification/screen-fit/${mode}-${width}.png`});
   await page.locator('#btn-pause').click();const before=await page.evaluate(()=>window.__corogalism.state);
   await page.locator('#btn-pause-guide').click();await page.clock.runFor(5000);assert.ok(await page.locator('#play-guide').isVisible());
   await page.locator('.guide-close').click();const after=await page.evaluate(()=>window.__corogalism.state);
   assert.equal(after.paused,true);assert.equal(after.timeMs,before.timeMs);assert.equal(after.remainingSec,before.remainingSec);assert.deepEqual(after.actor,before.actor);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-pause-guide');
   await page.screenshot({path:`docs/verification/screen-fit/pause-${mode}-${width}.png`});
   await page.setViewportSize({width:320,height:568});await page.clock.runFor(32);
   assert.deepEqual((await page.evaluate(()=>window.__corogalism.state)).actor,before.actor);
   await page.locator('#btn-pause-guide').click();await page.keyboard.press('Escape');assert.ok((await page.evaluate(()=>window.__corogalism.state)).paused);
   await page.locator('#btn-resume').click();await page.clock.runFor(3700);assert.equal((await page.evaluate(()=>window.__corogalism.state)).paused,false);
   await page.locator('#btn-game-exit').click();
   if(mode==='challenge')await page.locator('#btn-run-modes').click();
   await page.setViewportSize({width,height});await page.clock.runFor(32);
  }
  assert.deepEqual(errors,[]);await ctx.close();console.log('PASS viewport',width,height,'practice/challenge fill, pause guide freeze/resume and small viewport');
 }
}finally{await browser.close()}
