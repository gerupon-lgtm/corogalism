/** v0.6.25と同じ源を配信して、今回の生成・物理・描画の負荷を比較する。実機FPSとは異なる。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const root=fileURLToPath(new URL('../',import.meta.url)).replaceAll('\\','/');
const files=['src/config/gameConfig.js','src/maze/variation.js','src/world/openFields.js','src/world/openFloors.js'];
const original=new Map(files.map(f=>[f,execFileSync('git',['-c','safe.directory='+root,'show','cbd96f2:'+f],{encoding:'utf8'})]));
const output=process.env.PLAZA_PERF_OUTPUT||'docs/verification/plaza-steering/v0626/performance',rows=[];
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{for(const revision of ['before','after']){
 const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:2.625,serviceWorkers:'block'});
 if(revision==='before')for(const [path,body]of original)await page.route('**/'+path,route=>route.fulfill({contentType:'text/javascript',body}));
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:8768/')+'?debug=1');await page.waitForLoadState('networkidle');
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
 for(const size of [7,13,21]){
  const row=await page.evaluate(async size=>{
   const {createStagePlay}=await import('/src/game/stagePlay.js'),{challengeDifficulty}=await import('/src/game/challenge.js');
   const {createRenderer}=await import('/src/render/canvasRenderer.js'),{createFixedCamera}=await import('/src/render/camera.js');
   const {BASE}=await import('/src/config/gameConfig.js');
   const start=performance.now(),play=createStagePlay(913,challengeDifficulty(107,'easy'),{variation:{size,shape:'open',themeId:'iceAssist'}}),generationMs=performance.now()-start;
   const canvas=document.createElement('canvas'),renderer=createRenderer(canvas);renderer.resize(376);const camera=createFixedCamera(play.stage,376),frames=[];
   const initial=performance.now();renderer.draw({stage:play.stage,actor:play.actor,camera,now:0});const firstDrawMs=performance.now()-initial;
   for(let i=0;i<120;i++){
    const at=performance.now();play.advance({dt:1/60,elapsedMs:1000/60,tilt:{x:.6*Math.cos(i/35),y:.6*Math.sin(i/35)},base:BASE});
    renderer.draw({stage:play.stage,actor:play.actor,camera,now:i*1000/60});if(i>=20)frames.push(performance.now()-at);
   }
   frames.sort((a,b)=>a-b);
   return {size,generationMs,firstDrawMs,medianMs:frames[50],p95Ms:frames[95],walls:play.stage.walls.length,fields:play.stage.zones.filter(z=>z.kind==='radial').length};
  },size);
  rows.push({revision,...row});console.log(JSON.stringify(rows.at(-1)));assert.ok(Number.isFinite(row.p95Ms));
 }
 await page.close();
}}finally{await writeFile(output+'/results.json',JSON.stringify(rows,null,2));await browser.close();}
