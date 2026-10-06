/** 同じページで旧・新を交互に描く。球だけの負荷と検証中の素材の絵を確認。 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const original=execFileSync('git',['show','3a290dd:src/render/toyBall.js'],{encoding:'utf8'});
const output=process.env.BALL_CACHE_OUTPUT||'docs/verification/maze-variation/v0620/ball-cache';
await mkdir(output,{recursive:true});const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let rows=[];
try{
 const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,serviceWorkers:'block'});
 await p.route('**/src/render/toyBall-before.js',r=>r.fulfill({body:original,contentType:'application/javascript'}));
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:8768/')+'?debug=1');await p.waitForLoadState('networkidle');
 await(await p.context().newCDPSession(p)).send('Emulation.setCPUThrottlingRate',{rate:6});
 rows=await p.evaluate(async()=>{
  const before=await import('/src/render/toyBall-before.js'),after=await import('/src/render/toyBall.js'),rows=[];
  for(const pixels of [32,64,96])for(const appearance of ['default','metal','wood','superball','sponge']){
   const versions=[before,after].map((mod,i)=>{const c=document.createElement('canvas');c.width=c.height=256;return {revision:i?'after':'before',ball:mod.createToyBall(),canvas:c,ctx:c.getContext('2d'),actor:{x:0,y:0,r:.24,character:{appearance}},times:[]};});
   for(let f=0;f<100;f++)for(const v of f%2?[...versions].reverse():versions){
    v.actor.x=f*.003;v.actor.y=Math.sin(f/20)*.01;const start=performance.now();v.ball.update(v.actor);v.ctx.clearRect(0,0,256,256);v.ball.draw(v.ctx,128,128,pixels/6);if(f>=20)v.times.push(performance.now()-start);
   }
   for(const v of versions){v.times.sort((a,b)=>a-b);const digest=await crypto.subtle.digest('SHA-256',v.ctx.getImageData(0,0,256,256).data);rows.push({pixels,appearance,revision:v.revision,medianMs:v.times[40],p95Ms:v.times[76],sha256:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')});}
  }
  return rows;
 });
}finally{await writeFile(output+'/results.json',JSON.stringify(rows,null,2));await browser.close();}
for(const r of rows.filter(r=>r.revision==='after')){const b=rows.find(b=>b.revision==='before'&&b.pixels===r.pixels&&b.appearance===r.appearance);assert.equal(r.sha256,b.sha256);console.log(JSON.stringify({pixels:r.pixels,appearance:r.appearance,beforeMs:b.medianMs,afterMs:r.medianMs,identical:true}));}
