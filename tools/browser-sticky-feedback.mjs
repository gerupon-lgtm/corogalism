import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createStagePlay} from '../src/game/stagePlay.js';
import {challengeDifficulty} from '../src/game/challenge.js';
import {stageSeed} from '../src/game/run.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const seed=Array.from({length:1000},(_,i)=>i+1).find(seed=>createStagePlay(stageSeed(seed,3),challengeDifficulty(3,'normal')).stage.sticky[0]?.y===.5);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
await mkdir('docs/verification/sticky-feedback',{recursive:true});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});
 await ctx.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true}));
 const page=await ctx.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+`?debug=1&seed=${seed}`);await page.locator('#btn-challenge').tap();await page.clock.runFor(3700);
 for(let i=0;i<2;i++){await page.evaluate(()=>{const a=window.__corogalism;a.teleport(a.state.goal.x,a.state.goal.y);});await page.clock.runFor(32);await page.locator('#btn-next').tap();await page.clock.runFor(3700);}
 await page.evaluate(()=>{const a=window.__corogalism;const t=a.state.sticky[0];a.teleport(t.x,t.y);});await page.clock.runFor(32);
 await page.screenshot({path:'docs/verification/sticky-feedback/top-390.png',fullPage:true});
 const board=await page.locator('#board').boundingBox();const hint=await page.locator('#feature-hint').boundingBox();
 const canvas=await page.locator('#canvas').boundingBox();const actor=await page.evaluate(()=>window.__corogalism.state.actor);
 assert.ok(hint.y>canvas.y+(actor.y+actor.r)*canvas.height/7,'上端の球の下へ避ける');
 await page.touchscreen.tap(board.x+board.width*.25,board.y+board.height*.5);await page.clock.runFor(100);await page.touchscreen.tap(board.x+board.width*.75,board.y+board.height*.75);await page.clock.runFor(32);
 assert.equal(await page.locator('#feature-hint').innerText(),'0.5秒短縮！');assert.equal(await page.evaluate(()=>window.__corogalism.state.trap.target),2.5);
 await page.clock.runFor(64);
 assert.deepEqual(errors,[]);
 await page.locator("#canvas").screenshot({path:"docs/verification/sticky-feedback/canvas.png"});
 await page.screenshot({path:'docs/verification/sticky-feedback/success-390.png',fullPage:true});
 // 実DOMの2行ヒントで、四隅の球とヒントが重ならない。
 for(const size of [320,390,576]) {
  await page.setViewportSize({width:size,height:844});
  const checks=await page.evaluate(async()=>{
   const {createGameScreen}=await import('./src/ui/gameScreen.js');const ui=createGameScreen(document),b=document.querySelector('#board');const width=b.clientWidth;
   const camera={toScreen:(x,y)=>({px:x,py:y}),toPx:n=>n};const checks=[];
   for(const x of [18,width-18])for(const y of [18,width-18]){
    ui.setFeatureHint({actor:{x,y,r:12},trap:{},stage:{rest:null}},camera,true,true);
    const hint=document.querySelector('#feature-hint'),left=parseFloat(hint.style.left)-hint.offsetWidth/2,top=parseFloat(hint.style.top);
    checks.push(left>=0&&top>=0&&left+hint.offsetWidth<=width&&top+hint.offsetHeight<=width
     && (left+hint.offsetWidth<x-12||left>x+12||top+hint.offsetHeight<y-12||top>y+12));
   }return checks;
  });assert.ok(checks.every(Boolean));
 }
 await page.evaluate(async()=>{
  const {createGameScreen}=await import('./src/ui/gameScreen.js');const ui=createGameScreen(document);
  const play={actor:{x:100,y:100,r:12},trap:{},stage:{rest:null}};
  ui.showEscape(play,100);play.trap={};ui.setFeatureHint(play,{toScreen:(x,y)=>({px:x,py:y}),toPx:n=>n},true,false,101);
 });
 assert.match(await page.locator('#feature-hint').innerText(),/盤面をダブルタップ/);
 console.log('PASS: real top-edge trap hint avoids ball, distant taps accepted with success feedback; 2-line hints avoid all corners at 3 widths.');
}finally{await browser.close();}
