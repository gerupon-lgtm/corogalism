/** 本編12面の復元と、その後の入力・音・画面寸法変更を実ブラウザで確認。
 * 面送りにはdebug位置移動、復元後の移動には実pointer／模擬センサーイベントを使用。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8768/';
const output=process.env.RENDER_GAME_OUTPUT||'docs/verification/render-recovery/game-local';
await mkdir(output,{recursive:true});const rows=[];
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const scenarios=process.env.RENDER_GAME_PUBLIC==='1'
 ? [[390,3,'normal','pointer'],[576,2.625,'easy','tilt']]
 : [[320,1,'easy','pointer'],[390,3,'easy','pointer'],[576,2.625,'easy','pointer'],[390,3,'normal','pointer'],[576,2.625,'easy','tilt']];
try{
 for(const [width,dpr,level,mode] of scenarios){
  const context=await browser.newContext({viewport:{width,height:width===576?1280:844},deviceScaleFactor:dpr,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({level,mode})=>{
   Object.defineProperty(window,'DeviceOrientationEvent',{value:mode==='tilt'?function(){}:undefined});
   Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));
   localStorage.setItem('corogalism-settings',JSON.stringify({mode,challengeLevel:level,soundEnabled:true,calibration:{beta:35,gamma:0}}));
   window.__renderCanvases=[];const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='2d'&&!window.__renderCanvases.includes(this))window.__renderCanvases.push(this);return original.call(this,type,...args)};
  },{level,mode});
  await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
  await page.goto(base+'?debug=1&seed=77');await page.waitForFunction(()=>!!window.__corogalism,null,{polling:50});
  assert.equal(await page.locator('.badge').textContent(),'v'+version);
  const state=()=>page.evaluate(()=>window.__corogalism.state);
  const orient=async(gamma=0)=>page.evaluate(gamma=>{const event=new Event('deviceorientation');Object.assign(event,{beta:35,gamma});window.dispatchEvent(event)},gamma);
  const click=async id=>{await page.locator('#'+id).click();await page.clock.runFor(32)};
  const ready=async()=>{const s=await state();if(mode==='tilt')for(let i=0;i<30;i++){await orient();await page.clock.runFor(40)}await page.clock.runFor(s.prepareMs+s.countdownMs+32)};
  await click('btn-challenge');await ready();
  for(let n=1;n<12;n++){
   await page.evaluate(()=>{const goal=window.__corogalism.state.goal;window.__corogalism.teleport(goal.x,goal.y)});
   await page.clock.runFor(1200);assert.equal((await state()).status,'clear');
   await click('btn-next');await ready();
  }
  await click('btn-pause');assert.equal((await state()).paused,true);assert.equal((await state()).stageIndex,12);
  await page.clock.runFor(64);
  await page.evaluate(()=>{const c=document.querySelector('#canvas');window.__beforeRender=c.getContext('2d').getImageData(0,0,c.width,c.height).data});
  await page.clock.runFor(32);
  await page.evaluate(()=>{const c=document.querySelector('#canvas');window.__beforeRender=c.getContext('2d').getImageData(0,0,c.width,c.height).data});
  const before=await state();
  await page.evaluate(()=>{
   const main=document.querySelector('#canvas'),index=window.__renderCanvases.indexOf(main);
   for(const canvas of window.__renderCanvases.slice(index,index+4)){
    canvas.dispatchEvent(new Event('contextlost'));canvas.getContext('2d').reset();canvas.dispatchEvent(new Event('contextrestored'));
   }
  });await page.clock.runFor(32);
  const recovery=await page.evaluate(()=>{
   const c=document.querySelector('#canvas'),ctx=c.getContext('2d'),after=ctx.getImageData(0,0,c.width,c.height).data,before=window.__beforeRender;
   let changed=0,transparent=0;for(let i=0;i<before.length;i+=4){if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2])changed++;if(after[i+3]!==255)transparent++}
   return {changed,pixels:before.length/4,transparent,matrix:ctx.getTransform().a,width:c.width,cssWidth:c.clientWidth};
  });
  assert.equal(recovery.matrix,Math.min(dpr,3));assert.equal(recovery.transparent,0);assert.ok(recovery.changed/recovery.pixels<.01,JSON.stringify(recovery));
  const stable=s=>({actor:s.actor,hp:s.hp,time:s.timeMs,seed:s.seed,stage:s.stageIndex,run:s.run});
  assert.deepEqual(stable(await state()),stable(before));
  await click('btn-resume');await ready();await page.waitForFunction(()=>window.__corogalism.state.audio.loaded,null,{polling:50});await page.clock.runFor(1200);
  // 音声時計はPlaywrightの仮想時計とは独立している。開始SEが終わる実時間も待つ。
  await new Promise(resolve=>setTimeout(resolve,1100));await page.clock.runFor(32);
  const initial=await state(),next=initial.maze.path[1],start=initial.maze.path[0];
  if(mode==='pointer'){
   const rect=await page.locator('#board').boundingBox();await page.mouse.move(rect.x+rect.width*(.5+(next.x-start.x)*.3),rect.y+rect.height*(.5+(next.y-start.y)*.3));await page.mouse.down();await page.clock.runFor(450);await page.mouse.up();
  }else{for(let i=0;i<12;i++){await page.evaluate(({x,y})=>{const e=new Event('deviceorientation');Object.assign(e,{beta:35+y*15,gamma:x*15});window.dispatchEvent(e)},{x:next.x-start.x,y:next.y-start.y});await page.clock.runFor(40)}}
  const moved=await state();assert.ok(Math.hypot(moved.actor.x-initial.actor.x,moved.actor.y-initial.actor.y)>.005);assert.equal(moved.audio.context,'running');assert.equal(moved.audio.music,true);
  await page.screenshot({path:`${output}/${width}-${level}-${mode}-12.png`});
  await page.setViewportSize({width:width===320?390:320,height:844});await page.clock.runFor(32);
  const resized=await page.locator('#canvas').evaluate(c=>({width:c.width,height:c.height,css:c.clientWidth,matrix:c.getContext('2d').getTransform().a}));
  assert.equal(resized.width,resized.height);assert.equal(resized.width,Math.round(resized.css*Math.min(dpr,3)));assert.equal(resized.matrix,Math.min(dpr,3));
  assert.deepEqual(errors,[]);rows.push({width,dpr,level,mode,stage:12,recovery,resized,audio:moved.audio.context,music:moved.audio.music,continuedMovement:true});console.log(JSON.stringify(rows.at(-1)));await context.close();
 }
}finally{await writeFile(output+'/results.json',JSON.stringify(rows,null,2));await browser.close()}
assert.equal(rows.length,scenarios.length);
