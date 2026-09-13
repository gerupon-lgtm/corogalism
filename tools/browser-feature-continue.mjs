import assert from 'node:assert/strict';
import {stageSeed} from '../src/game/run.js';
import {createStagePlay} from '../src/game/stagePlay.js';
import {challengeDifficulty} from '../src/game/challenge.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const seed=Array.from({length:1000},(_,i)=>i+1).find(s=>{const p=createStagePlay(stageSeed(s,1),challengeDifficulty(1,'easy'));return p.stage.leaf&&p.stage.rest;});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const ctx=await browser.newContext({serviceWorkers:'block'});await ctx.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true}));const page=await ctx.newPage();await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+`?debug=1&seed=${seed}`);await page.locator('[data-level=easy]').first().click();await page.locator('#btn-challenge').click();await page.clock.runFor(3700);
 const state=()=>page.evaluate(()=>window.__corogalism.state);
 await page.evaluate(()=>{const a=window.__corogalism;a.teleport(a.state.leaf.x,a.state.leaf.y);});await page.clock.runFor(32);const stock=(await state()).shield;
 await page.clock.fastForward(((await state()).remainingSec+1)*1000);assert.equal((await state()).screen,'over');await page.locator('#btn-continue').click();assert.ok((await state()).prepareMs>=1400);await page.clock.runFor(4600);assert.equal((await state()).shield,stock);assert.equal((await state()).leaf.collected,true);
 // 回復床を使用し、もう一度コンティニューしても使用済み。
 for(let i=0;i<8&&(await state()).hp.value===(await state()).hp.max;i++){await page.evaluate(()=>{const a=window.__corogalism;a.teleport(.6,.5);a.setTilt(-1,0);});await page.clock.runFor(450);}
 await page.evaluate(()=>{const a=window.__corogalism;a.setTilt(0,0);a.teleport(a.state.rest.x,a.state.rest.y);});await page.clock.runFor(2400);assert.equal((await state()).rest.used,true);
 await page.clock.fastForward(((await state()).remainingSec+1)*1000);assert.equal((await state()).screen,'over');await page.locator('#btn-continue').click();await page.clock.runFor(4600);assert.equal((await state()).rest.used,true);assert.equal((await state()).leaf.collected,true);
 await page.locator('#btn-game-exit').click();await page.locator('#btn-run-again').click();assert.equal((await state()).shield,0);
 console.log('PASS: continue preserves shield, leaf collected and rest used; 1.5s READY; new run clears shield.');
}finally{await browser.close();}
