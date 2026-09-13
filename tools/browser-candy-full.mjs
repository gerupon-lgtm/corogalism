import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createStagePlay} from '../src/game/stagePlay.js';
import {challengeDifficulty} from '../src/game/challenge.js';
import {stageSeed} from '../src/game/run.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const seed=Array.from({length:100},(_,i)=>i+1).find(s=>createStagePlay(stageSeed(s,1),challengeDifficulty(1,'normal')).stage.recovery);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await ctx.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true}));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+`?debug=1&seed=${seed}`);await page.waitForFunction(()=>Boolean(window.__corogalism));await page.locator('#btn-challenge').click();await page.clock.runFor(3700);
 await page.evaluate(()=>{const a=window.__corogalism,i=a.state.recovery;a.teleport(i.x,i.y)});await page.clock.runFor(32);
 assert.equal(await page.locator('#recovery-feedback').innerText(),'げんきはまんたん！');assert.equal(await page.evaluate(()=>window.__corogalism.state.recovery.collected),false);
 await mkdir('docs/verification/rubber-candy',{recursive:true});await page.locator('#canvas').screenshot({path:'docs/verification/rubber-candy/board.png'});await page.screenshot({path:'docs/verification/rubber-candy/full.png'});
 await page.clock.runFor(2000);assert.equal(await page.locator('#recovery-feedback').innerText(),'');
 await page.evaluate(()=>window.__corogalism.teleport(.5,.5));await page.clock.runFor(32);
 await page.evaluate(()=>{const a=window.__corogalism,i=a.state.recovery;a.teleport(i.x,i.y)});await page.clock.runFor(32);assert.equal(await page.locator('#recovery-feedback').innerText(),'げんきはまんたん！');
 await page.locator('#btn-pause').click();await page.locator('#btn-pause-guide').click();assert.match(await page.locator('#play-guide').innerText(),/ゴムは無傷。次の壁に注意。/);assert.match(await page.locator('#play-guide').innerText(),/満タンなら残る/);
 assert.deepEqual(errors,[]);console.log('PASS: full candy feedback once per contact, item retained, guide descriptions updated.');
}finally{await browser.close()}
