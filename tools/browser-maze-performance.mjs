/** 既存版の球描画と最適化版を同じ入力で比較。処理時間は実端末のFPSではない。 */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const output=process.env.MAZE_PERF_OUTPUT||'docs/verification/maze-variation/v0620/performance',rows=[];
await mkdir(output,{recursive:true});
const baseline=file=>execFileSync('git',['show',`3a290dd:${file}`],{encoding:'utf8'});
const original=process.env.MAZE_OLD_BALL?await readFile(process.env.MAZE_OLD_BALL,'utf8'):baseline('src/render/toyBall.js');
const oldFloors=process.env.MAZE_OLD_FLOORS?await readFile(process.env.MAZE_OLD_FLOORS,'utf8'):baseline('src/render/floorVisuals.js');
try{for(const revision of ['before','after']){
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,serviceWorkers:'block'});
 if(revision==='before'){
  await page.route('**/src/render/toyBall.js',route=>route.fulfill({contentType:'application/javascript',body:original}));
  await page.route('**/src/render/floorVisuals.js',route=>route.fulfill({contentType:'application/javascript',body:oldFloors}));
 }
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:8768/')+'?debug=1');await page.waitForLoadState('networkidle');
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
 for(const size of [7,9,11,13,21])for(const shape of ['classic','open']){
  const result=await page.evaluate(async({size,shape})=>{
   const {createStagePlay}=await import('/src/game/stagePlay.js'),{challengeDifficulty}=await import('/src/game/challenge.js');
   const {createRenderer}=await import('/src/render/canvasRenderer.js'),{createFixedCamera}=await import('/src/render/camera.js');
   const {stepPhysics}=await import('/src/physics/integrator.js'),{BASE}=await import('/src/config/gameConfig.js');
   const {createToyBall}=await import('/src/render/toyBall.js');
   const play=createStagePlay(913,challengeDifficulty(107,'easy'),{variation:{size,shape,themeId:'iceAssist'}}),stage=play.stage,actor=play.actor;
   const canvas=document.createElement('canvas'),renderer=createRenderer(canvas);renderer.resize(356);const camera=createFixedCamera(stage,356),frames=[],positions=[];
   const initial=performance.now();renderer.draw({stage,actor,camera,now:0});const initialMs=performance.now()-initial;
   positions.push({x:actor.x,y:actor.y});
   for(let i=0;i<100;i++){const start=performance.now();stepPhysics({actor,stage,base:BASE,tilt:{x:.7*Math.cos(i/40),y:.7*Math.sin(i/40)},dt:1/60});renderer.draw({stage,actor,camera,now:(i+1)*1000/60});if(i>=20)frames.push(performance.now()-start);positions.push({x:actor.x,y:actor.y});}
   frames.sort((a,b)=>a-b);const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
   const hash=await crypto.subtle.digest('SHA-256',pixels);
   const sha256=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
   const ballCanvas=document.createElement('canvas');ballCanvas.width=ballCanvas.height=256;const ctx=ballCanvas.getContext('2d'),ball=createToyBall(),copy={...actor};
   for(const at of positions){Object.assign(copy,at);ball.update(copy);ctx.clearRect(0,0,256,256);ball.draw(ctx,128,128,camera.toPx(actor.r));}
   const ballHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',ctx.getImageData(0,0,256,256).data)),b=>b.toString(16).padStart(2,'0')).join('');
   return {medianMs:frames[40],p95Ms:frames[76],initialMs,sha256,ballHash,png:size===11&&shape==='classic'?canvas.toDataURL():null};
  },{size,shape});
  const {png,...data}=result;if(png)await writeFile(`${output}/${revision}-11-classic.png`,Buffer.from(png.split(',')[1],'base64'));
  rows.push({revision,size,shape,...data});console.log(JSON.stringify(rows.at(-1)));
 }
 await page.close();
}}finally{await writeFile(output+'/results.json',JSON.stringify(rows,null,2));await browser.close();}
for(const r of rows.filter(r=>r.revision==='after')){const before=rows.find(b=>b.revision==='before'&&b.size===r.size&&b.shape===r.shape);assert.equal(r.ballHash,before.ballHash,'球の絵と回転を維持');assert.equal(r.sha256,before.sha256,'盤面を含む描画を維持');}
