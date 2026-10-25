/** 回転・遅れて確定する配置・更新後のオフライン。実機の確認とは区別する。 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const version=JSON.parse(await readFile(resolve(root,'package.json'),'utf8')).version;
const manifest=await readFile(resolve(root,'precache.js'),'utf8');
const expectedAssets=JSON.parse(manifest.match(/self\.PRECACHE_FILES\s*=\s*(\[.*?\]);/s)[1]).length;
const output=resolve(root,process.env.RUNTIME_OUTPUT||`docs/verification/v${version}/runtime-local`);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.wav':'audio/wav','.webmanifest':'application/manifest+json'};
let server;
let base=process.env.BASE_URL;
if(!base){
 server=createServer(async(req,res)=>{try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const f=resolve(root,'.'+p+(p.endsWith('/')?'index.html':''));if(!f.startsWith(root+sep))throw Error('outside root');res.writeHead(200,{'content-type':mime[extname(f)]||'application/octet-stream','cache-control':'no-store'});res.end(await readFile(f));}catch{res.writeHead(404);res.end();}});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}/`;
}
const rows={},errors=[];let page;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 await mkdir(output,{recursive:true});
 const context=await browser.newContext({viewport:{width:390,height:740},serviceWorkers:'allow'});
 await context.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:'easy',soundEnabled:false}));});
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 page.setDefaultTimeout(45000);
 await page.goto(base+'?debug=1&seed=77');
 await page.waitForFunction(()=>!!window.__corogalism);
 await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('.badge').textContent(),'v'+version);
 assert.equal(await page.locator('.menu-scene h2').textContent(),'どれで遊ぶ？');
 rows.homeWidths=[];
 for(const width of [360,390,412]){
  await page.setViewportSize({width,height:740});
  await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
  const row=await page.evaluate(()=>{const p=document.querySelector('.menu-scene'),r=p.getBoundingClientRect(),h=p.querySelector('h2').getBoundingClientRect();return {width:innerWidth,overflow:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,titleFits:h.left>=r.left&&h.right<=r.right};});
  assert.equal(row.overflow,0);assert.equal(row.horizontal,0);assert.equal(row.titleFits,true);rows.homeWidths.push(row);
 }
 await page.setViewportSize({width:390,height:740});
 await page.screenshot({path:resolve(output,'home.png')});
 rows.mode=await page.evaluate(()=>({overflow:document.documentElement.scrollHeight-innerHeight,headerHidden:document.getElementById('play-heading').hidden}));
 assert.equal(rows.mode.overflow,0,'home scroll');assert.equal(rows.mode.headerHidden,true);
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 rows.cache=await page.evaluate(async()=>{const names=(await caches.keys()).filter(n=>n.startsWith('corogalism-'));const key=names[0];return {key,count:(await(await caches.open(key)).keys()).length};});
 assert.equal(rows.cache.count,expectedAssets);
 rows.layouts=[];
 for(const mode of ['tutorial','challenge','practice']){
  await page.locator(mode==='tutorial'?'#btn-tutorial':mode==='challenge'?'#btn-challenge':'#btn-practice').click();
  if(mode==='tutorial')await page.locator('#btn-tutorial-start').click();
  await page.waitForFunction(()=>window.__corogalism.state.screen==='game'&&window.__corogalism.state.countdownMs===0);
  const layout=await page.evaluate(()=>{const board=document.getElementById('board').getBoundingClientRect();return {mode:document.body.dataset.gameMode,overflow:document.documentElement.scrollHeight-innerHeight,panels:['play-heading','play-toolbar','screen-game'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,leftDelta:r.left-board.left,widthDelta:r.width-board.width};})};});
  assert.equal(layout.overflow,0);for(const p of layout.panels){assert.ok(Math.abs(p.leftDelta)<1);assert.ok(Math.abs(p.widthDelta)<1);}rows.layouts.push(layout);
  await page.screenshot({path:resolve(output,mode+'.png')});
  if(mode!=='practice'){
   await page.locator('#btn-game-exit').click();
   if(mode==='challenge'){
    await page.locator('#btn-end-confirm').click();
    await page.waitForFunction(()=>window.__corogalism.state.screen==='run-result');
    await page.locator('#btn-run-modes').click();
   }
   await page.waitForFunction(()=>window.__corogalism.state.screen==='mode');
  }
 }
 await page.locator('#btn-pause').click();
 const before=await page.evaluate(()=>window.__corogalism.state);
 await page.setViewportSize({width:740,height:390});
 await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
 await page.setViewportSize({width:390,height:740});
 const canvasMatches=()=>{
  const board=document.getElementById('board'),canvas=document.getElementById('canvas');
  return Math.abs(board.clientWidth-canvas.getBoundingClientRect().width)<1&&Math.abs(canvas.width-canvas.getBoundingClientRect().width*devicePixelRatio)<1;
 };
 await page.waitForFunction(canvasMatches);
 const after=await page.evaluate(()=>window.__corogalism.state);
 for(const key of ['seed','timeMs','paused','stageIndex'])assert.equal(after[key],before[key],key+' preserved');
 assert.deepEqual(after.actor,before.actor);
 rows.rotation={seed:after.seed,timeMs:after.timeMs,paused:after.paused,actorPreserved:true,canvasMatches:true};
 await page.screenshot({path:resolve(output,'portrait-recovered.png')});
 await page.evaluate(()=>document.querySelector('.wrap').style.maxWidth='360px');
 await page.waitForFunction(canvasMatches);
 await page.waitForFunction(()=>Math.abs(document.getElementById('play-toolbar').getBoundingClientRect().width-document.getElementById('board').getBoundingClientRect().width)<1);
 rows.delayedLayout={canvasMatches:true,width:await page.locator('#board').evaluate(e=>e.getBoundingClientRect().width)};
 await page.evaluate(()=>document.querySelector('.wrap').style.removeProperty('max-width'));
 await page.waitForFunction(canvasMatches);
 await context.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__corogalism);
 assert.equal(await page.locator('.badge').textContent(),'v'+version);
 await page.locator('#btn-practice').click();
 await page.waitForFunction(()=>window.__corogalism.state.screen==='game'&&window.__corogalism.state.countdownMs===0);
 assert.equal(await page.locator('#practice-stage').textContent(),'1面目 / 5');
 assert.equal(await page.locator('#practice-comment').textContent(),'小さく傾けて、ゆっくり転がしてみよう。');
 rows.offline={reload:true,practice:true,comment:true};
 await page.screenshot({path:resolve(output,'offline-practice.png')});
 rows.course={kind:'teleport fixture; not human completion',stages:[]};
 for(let i=1;i<=5;i++){
  assert.equal(await page.locator('#practice-stage').textContent(),`${i}面目 / 5`);
  await page.evaluate(()=>{const g=window.__corogalism.state.goal;window.__corogalism.teleport(g.x,g.y);});
  await page.waitForFunction(()=>window.__corogalism.state.screen==='clear');
  rows.course.stages.push({stage:i,next:await page.locator('#btn-next').textContent()});
  await page.waitForFunction(()=>!document.getElementById('btn-next').disabled);await page.locator('#btn-next').click();
  await page.waitForFunction(last=>last?window.__corogalism.state.screen==='mode':window.__corogalism.state.screen==='game',i===5);
  if(i<5)await page.waitForFunction(()=>window.__corogalism.state.countdownMs===0);
 }
 rows.course.finalScreen=await page.evaluate(()=>window.__corogalism.state.screen);
 assert.equal(rows.course.finalScreen,'mode');
 assert.deepEqual(errors,[]);
 await writeFile(resolve(output,'results.json'),JSON.stringify({version,base,...rows,errors},null,2)+'\n');
 await context.close();console.log(`PASS: v${version} home/3 modes/rotation/delayed layout/${expectedAssets} assets offline/5 practice stages`);
}catch(error){
 await writeFile(resolve(output,'failure.json'),JSON.stringify({message:error.message,rows,errors,state:page?await page.evaluate(()=>window.__corogalism?.state).catch(()=>null):null},null,2)+'\n');
 if(page)await page.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});
 throw error;
}finally{await browser.close();if(server)await new Promise(done=>server.close(done));}
