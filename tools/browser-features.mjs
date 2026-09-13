import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createStagePlay } from '../src/game/stagePlay.js';
import { stageSeed } from '../src/game/run.js';
import { challengeDifficulty } from '../src/game/challenge.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.BASE_URL || 'http://127.0.0.1:8765/';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
await mkdir('docs/verification/features',{recursive:true});
const errors=[];
const seed=Array.from({length:500},(_,i)=>(i+1)*7919).find(seed=>{const p=createStagePlay(stageSeed(seed,1),challengeDifficulty(1,'easy'));return p.stage.leaf && p.stage.rest;});
try {
 for(const width of (process.env.TEST_WIDTH ? [Number(process.env.TEST_WIDTH)] : [320,390,576,1280])) {
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:2,serviceWorkers:'block'});
  await context.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
  await page.goto(base+`?debug=1&seed=${seed}`);await page.evaluate(()=>document.fonts.ready);await page.locator('[data-level=easy]').first().click();await page.locator('#btn-challenge').click();await page.clock.runFor(3700);
  const state=()=>page.evaluate(()=>window.__corogalism.state);
  let s=await state();assert.ok(s.leaf&&s.rest,JSON.stringify({seed,actual:s.seed,level:s.level,leaf:s.leaf,rest:s.rest,screen:s.screen}));
  const initialBoard=await page.locator('#board').boundingBox();
  await page.evaluate(()=>{const a=window.__corogalism,s=a.state;a.teleport(s.leaf.x,s.leaf.y);});await page.clock.runFor(32);
  s=await state();assert.equal(s.leaf.collected,true);assert.ok(s.shield>0);assert.equal(await page.locator('#hud-shield').innerText(),String(Math.ceil(s.shield)));
  await page.clock.runFor(1500);await page.screenshot({path:`docs/verification/features/leaf-${width}.png`,fullPage:true});
  // 実際の壁衝突でまもりを使い切り、げんきを消費させる。
  for(let n=0;n<7;n++){
   await page.evaluate(()=>{const a=window.__corogalism;a.teleport(.6,.5);a.setTilt(-1,0);});await page.clock.runFor(420);s=await state();
   if(s.hp.value<s.hp.max)break;
  }
  assert.ok(s.hp.value<s.hp.max);assert.equal(s.status,'playing');
  await page.evaluate(()=>{const a=window.__corogalism;a.setTilt(0,0);a.teleport(a.state.rest.x,a.state.rest.y);});await page.clock.runFor(850);
  await page.locator('#btn-pause').click();assert.equal(await page.locator('#feature-hint').isVisible(),false);await page.locator('#btn-resume').click();await page.clock.runFor(3700);
  await page.evaluate(()=>{const a=window.__corogalism;a.setTilt(0,0);a.teleport(a.state.rest.x,a.state.rest.y);});await page.clock.runFor(1000);
  assert.ok((await state()).rest.progress>0);assert.equal(await page.locator('#feature-hint').innerText(),'ひとやすみ中…');
  await page.screenshot({path:`docs/verification/features/rest-${width}.png`,fullPage:true});await page.clock.runFor(1200);
  s=await state();assert.equal(s.rest.used,true);assert.equal(s.extendedSec,2);assert.match(await page.locator('#recovery-feedback').innerText(),/のこりじかん＋2秒/);
  const afterBoard=await page.locator('#board').boundingBox();assert.equal(afterBoard.y,initialBoard.y);assert.equal(afterBoard.height,initialBoard.height);
  // 3面目の実際の進行・拘束・画面ダブルタップ。
  for(let n=1;n<3;n++){
   await page.evaluate(()=>{const a=window.__corogalism;a.teleport(a.state.goal.x,a.state.goal.y);});await page.clock.runFor(32);await page.locator('#btn-next').click();await page.clock.runFor(3700);
  }
  s=await state();assert.equal(s.stageIndex,3);assert.equal(s.sticky.length,1);
  await page.evaluate(()=>{const a=window.__corogalism;a.setTilt(0,0);const t=a.state.sticky[0];a.teleport(t.x,t.y);});await page.clock.runFor(50);
  s=await state();assert.ok(s.trap);await page.screenshot({path:`docs/verification/features/sticky-${width}.png`,fullPage:true});
  const box=await page.locator('#board').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.clock.runFor(100);await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.clock.runFor(32);
  assert.equal((await state()).trap.target,2.5);await page.clock.runFor(2500);assert.equal((await state()).trap,null);
  await page.clock.runFor(250);assert.equal((await state()).trap,null);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('#time-meter-block .meter-name').innerText(),'のこりじかん');
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS: selected widths, leaf pickup/HUD, real damage, rest pause/reset/success, stage 3 sticky/double-tap/grace; stable board geometry.');
} finally {await browser.close();}
