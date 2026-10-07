import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {createRun} from '../src/game/run.js';
import {createStagePlay} from '../src/game/stagePlay.js';
import {challengeDifficulty} from '../src/game/challenge.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=new URL(process.env.BASE_URL || 'http://127.0.0.1:8768/');
const output=new URL('../docs/verification/play-notices/v0623/',import.meta.url);
const publicRun=base.protocol==='https:';
await mkdir(output,{recursive:true});
const seed=Array.from({length:200},(_,i)=>i+1).find(s=>{
 const run=createRun(s),play=createStagePlay(run.currentSeed(),challengeDifficulty(1,'easy'),{variation:run.currentVariation('easy')});
 return play.stage.leaf&&play.stage.rest&&play.stage.recovery;
});
assert.ok(seed,'find an actual generated opening with leaf, rest and candy');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[],checks=[],sizes=[];
try{
 const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2.625,isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});
  localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:'easy',soundEnabled:true}));
 });
 await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 await page.goto(new URL(`?debug=1&seed=${seed}`,base).href);await page.evaluate(()=>document.fonts.ready);
 const state=()=>page.evaluate(()=>window.__corogalism.state);
 const ready=async()=>{const s=await state();await page.clock.runFor(s.prepareMs+s.countdownMs+100);};
 const contact=async tile=>{
  await page.evaluate(()=>window.__corogalism.setTilt(0,0));await page.clock.runFor(200);
  await page.evaluate(tile=>window.__corogalism.teleport(tile.x,tile.y),tile);await page.clock.runFor(32);
 };
 async function aimAtOuterWall(){
  // 始点へ戻る最初の通路で助走を取り、実際の衝突でまもりとげんきを消費する。
  const leg=(await state()).maze.path[1];await contact({x:leg.x+.5,y:leg.y+.5});
  await page.evaluate(leg=>window.__corogalism.setTilt(-Math.sign(leg.x),-Math.sign(leg.y)),leg);
 }
 async function notice(name,selector,pattern){
  assert.equal(await page.locator(selector).isVisible(),true,name);
  const text=await page.locator(selector).innerText();assert.match(text,pattern,name);
  const message=await page.locator(selector).boundingBox(),board=await page.locator('#board').boundingBox();
  assert.ok(message.y>=board.y+board.height-.1,`${name}: outside board`);
  checks.push({name,text,stage:(await state()).stageIndex});
 }
 await page.locator('#btn-challenge').click();await ready();
 await contact((await state()).leaf);assert.equal((await state()).leaf.collected,true);await notice('leaf','#recovery-feedback',/葉っぱ/);
 let guarded=false;
 for(let attempt=0;attempt<3&&!guarded;attempt++){
  await aimAtOuterWall();
  for(let n=0;n<40;n++){
   const before=await state();await page.clock.runFor(16);const after=await state();
   if(after.shield<before.shield&&after.hp.value===before.hp.value){await notice('guard','#recovery-feedback',/守/);guarded=true;break;}
  }
 }
 assert.equal(guarded,true,'actual wall collision consumes protection');
 await page.screenshot({path:fileURLToPath(new URL(`${publicRun?'public':'local'}-actual-guard.png`,output)),fullPage:true});
 for(let i=0;i<10&&(await state()).hp.value===(await state()).hp.max;i++){
  await aimAtOuterWall();await page.clock.runFor(650);
 }
 assert.ok((await state()).hp.value<(await state()).hp.max);
 await contact((await state()).recovery);await notice('recovery','#recovery-feedback',/げんき/);
 for(let i=0;i<8&&(await state()).hp.value===(await state()).hp.max;i++){
  await aimAtOuterWall();await page.clock.runFor(650);
 }
 await contact((await state()).rest);await notice('resting','#feature-hint',/ひとやすみ/);
 await page.clock.runFor(2050);assert.equal((await state()).rest.used,true);await notice('rest-complete','#recovery-feedback',/回復/);
 let trapped=false,large=false,hourglass=false;
 for(let stage=1;stage<=24;stage++){
  const s=await state();sizes.push({stage:s.stageIndex,size:s.maze.size});
  if(!hourglass&&s.hourglass){await contact(s.hourglass);await notice('hourglass','#recovery-feedback',/＋5秒/);hourglass=true;}
  if(s.maze.size>=13&&!large){
   await page.evaluate(async()=>{const {createGameScreen}=await import('./src/ui/gameScreen.js');const ui=createGameScreen(document);ui.showFeature('guard',performance.now());ui.renderNotices({visible:true});});
   await page.screenshot({path:fileURLToPath(new URL(`${publicRun?'public':'local'}-large-maze.png`,output)),fullPage:true});large=true;
  }
  if(!trapped&&s.sticky.length){
   await contact(s.sticky[0]);assert.ok((await state()).trap);await notice('trap','#feature-hint',/ダブルタップ/);
   const box=await page.locator('#board').boundingBox();await page.touchscreen.tap(box.x+box.width*.25,box.y+box.height*.5);await page.clock.runFor(100);
   await page.touchscreen.tap(box.x+box.width*.75,box.y+box.height*.5);await page.clock.runFor(32);
   assert.equal((await state()).trap.target,2.5);await notice('shortened','#feature-hint',/短縮/);
   for(let pair=0;pair<2;pair++){
    await page.touchscreen.tap(box.x+box.width*.25,box.y+box.height*.5);await page.clock.runFor(100);
    await page.touchscreen.tap(box.x+box.width*.75,box.y+box.height*.5);await page.clock.runFor(32);
   }
   await page.clock.runFor(1200);assert.equal((await state()).trap,null);await notice('escaped','#feature-hint',/ぬけ/);trapped=true;
  }
  if(large&&trapped&&hourglass)break;
  await contact((await state()).goal);assert.equal((await state()).screen,'clear');await page.clock.runFor(1000);
  await page.locator('#btn-next').click();await ready();
 }
 assert.ok(large&&trapped&&hourglass,'exercise a large maze, actual trap and hourglass');
 await page.locator('#btn-pause').click();await page.clock.runFor(32);assert.equal(await page.locator('#play-notices').isVisible(),false);
 await page.locator('#btn-pause-guide').click();await page.locator('.guide-x').click();assert.equal((await state()).paused,true);
 await page.locator('#btn-resume').click();await ready();
 await page.locator('#btn-game-exit').click();await page.locator('#btn-end-cancel').click();assert.equal((await state()).paused,true);
 await page.locator('#btn-resume').click();await ready();
 await contact({x:.5,y:.5});
 await page.clock.fastForward(((await state()).remainingSec+1)*1000);assert.equal((await state()).screen,'over');await page.clock.runFor(1100);
 await page.locator('#btn-continue').click();await ready();assert.equal((await state()).screen,'game');
 await page.locator('#btn-game-exit').click();await page.locator('#btn-end-confirm').click();await page.locator('#btn-run-modes').click();
 await page.locator('#btn-floor-practice').click();await ready();
 for(const kind of ['sand','ice','gravity','repulsion','normal']){
  await page.locator(`[data-floor="${kind}"]`).click();await page.clock.runFor(32);
  await contact({x:kind==='normal'?.5:3.5,y:.5});await page.clock.runFor(500);
  await notice(`floor-${kind}`,'#floor-contact-hint',new RegExp({sand:'砂',ice:'氷',gravity:'重力',repulsion:'反重力',normal:'普通'}[kind]));
 }
 assert.deepEqual(errors,[]);
 await new Promise(resolve=>setTimeout(resolve,1200));await page.clock.runFor(32);
 const audio=(await state()).audio;assert.equal(audio.enabled,true);assert.equal(audio.loaded,true);assert.equal(audio.music,true);
 await writeFile(new URL(`${publicRun?'public':'local'}-flow.json`,output),JSON.stringify({seed,checks,sizes,large,trapped,audio,errors,scope:'Contacts use actual generated features and main callbacks. Navigation between stages uses debug teleport; these are not human playthroughs.'},null,2)+'\n');
 console.log(`PASS actual flow: ${checks.length} notifications, sizes ${[...new Set(sizes.map(s=>s.size))].join('/')}; pause/guide/exit/continue/practice`);
 await context.close();
}finally{await browser.close();}
