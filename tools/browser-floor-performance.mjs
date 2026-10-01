import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const rows=[];
try{for(const dpr of [1,3]){
 const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:dpr,serviceWorkers:'block'});
 if(process.env.PERF_BEFORE==='1'){
  for(const file of ['canvasRenderer','floorVisuals','toyWorld']){
   const source=execFileSync('git',['-c','safe.directory=C:/Users/user/Documents/AI連携ゲーム/corogalism','show','9055804:src/render/'+file+'.js'],{encoding:'utf8'});
   await p.route('**/src/render/'+file+'.js',route=>route.fulfill({contentType:'text/javascript',body:source}));
  }
 }
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:8767/')+'?debug=1');await p.waitForLoadState('networkidle');
 const cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
 const r=await p.evaluate(async()=>{
  const {createRenderer}=await import('/src/render/canvasRenderer.js');
  const {createStagePlay}=await import('/src/game/stagePlay.js');const {challengeDifficulty}=await import('/src/game/challenge.js');
  const {stageSeed}=await import('/src/game/run.js');const {createFixedCamera}=await import('/src/render/camera.js');
  const results=[];const method=CanvasRenderingContext2D.prototype.createLinearGradient;let count=0;
  CanvasRenderingContext2D.prototype.createLinearGradient=function(...args){count++;return method.apply(this,args)};
  try{for(const n of [2,3,4,8]){
   const play=createStagePlay(stageSeed(77,n),challengeDifficulty(n,'easy'));
   const canvas=document.createElement('canvas'),renderer=createRenderer(canvas);renderer.resize(350);
   const camera=createFixedCamera(play.stage,350),args={stage:play.stage,actor:play.actor,camera,animationActive:true};
   renderer.draw({...args,now:0});count=0;const ms=[];
   for(let i=0;i<40;i++){const t=performance.now();renderer.draw({...args,now:(i+1)*16.7});ms.push(performance.now()-t)}
   ms.sort((a,b)=>a-b);results.push({stage:n,theme:play.stage.theme.id,gradients:count,medianMs:ms[20],p95Ms:ms[38],mazeSeed:play.stage.maze.seed,wallCount:play.stage.walls.length});
  }}finally{CanvasRenderingContext2D.prototype.createLinearGradient=method}
  return results;
 });rows.push({dpr,cpuSlowdown:6,rows:r});console.log(JSON.stringify(rows.at(-1)));await p.close();
}
const output=process.env.PERF_OUTPUT||'docs/verification/floor-performance';
await mkdir(output,{recursive:true});await writeFile(output+'/'+(process.env.PERF_LABEL||'current')+'.json',JSON.stringify(rows,null,2));
if(process.env.PERF_BEFORE!=='1')for(const {rows:r} of rows){assert.ok(r[1].gradients<=r[0].gradients*1.5,'砂面の静止画を毎フレーム描き直さない');assert.ok(r[2].gradients<=r[0].gradients*1.5,'氷面の静止画を毎フレーム描き直さない');}
}finally{await b.close()}
