import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createStagePlay} from '../src/game/stagePlay.js';
import {challengeDifficulty} from '../src/game/challenge.js';
import {stageSeed} from '../src/game/run.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const seed=Array.from({length:100},(_,i)=>i+1).find(s=>createStagePlay(stageSeed(s,9),challengeDifficulty(9,'easy')).stage.hourglass);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
await mkdir('docs/verification/hourglass',{recursive:true});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});
 await ctx.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});localStorage.setItem('corogalism-settings',JSON.stringify({soundEnabled:true,mode:'pointer',challengeLevel:'easy'}));});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+`?debug=1&seed=${seed}`);
 await page.locator('#btn-challenge').tap();await page.waitForFunction(()=>window.__corogalism.state.audio.loaded);
 await page.clock.runFor(3700);
 for(let i=0;i<8;i++){await page.evaluate(()=>{const a=window.__corogalism;a.teleport(a.state.goal.x,a.state.goal.y)});await page.clock.runFor(32);await page.locator('#btn-next').tap();await page.clock.runFor(3700);}
 for(const width of [320,390,576]){
  await page.setViewportSize({width,height:844});await page.clock.runFor(32);
  await page.locator('#canvas').screenshot({path:`docs/verification/hourglass/board-${width}.png`});
  await page.screenshot({path:`docs/verification/hourglass/play-${width}.png`,fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 const before=await page.evaluate(()=>window.__corogalism.state);
 await page.evaluate(()=>{const a=window.__corogalism,h=a.state.hourglass;a.teleport(h.x,h.y)});await page.clock.runFor(32);
 const after=await page.evaluate(()=>window.__corogalism.state);
 assert.equal(after.extendedSec,5);assert.ok(after.hourglass.collected);assert.ok(after.remainingSec>before.remainingSec+4.9);
 assert.match(await page.locator('#recovery-feedback').innerText(),/＋5秒/);assert.ok(after.audio.events.includes('hourglass'));
 await page.locator('#canvas').screenshot({path:'docs/verification/hourglass/collected-board.png'});
 await page.screenshot({path:'docs/verification/hourglass/collected.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: 3 mobile widths, hourglass pickup +5 seconds and SE, no horizontal overflow or page errors.');
}finally{await browser.close()}
