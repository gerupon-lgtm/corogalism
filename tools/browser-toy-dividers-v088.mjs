/** 装飾の実描画と短縮紹介を確認。ゴールへの面送りはfixture、壁操作は実pointer入力。 */
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
const output=resolve(root,process.env.TOY_OUTPUT||`docs/verification/v${version}/local`);
let base=process.env.BASE_URL,server,browser,page;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.wav':'audio/wav','.webmanifest':'application/manifest+json'};
if(!base){server=createServer(async(req,res)=>{try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),f=resolve(root,'.'+p+(p.endsWith('/')?'index.html':''));if(!f.startsWith(root+sep))throw Error('outside root');const b=await readFile(f);res.writeHead(200,{'content-type':mime[extname(f)]||'application/octet-stream','cache-control':'no-store'});res.end(b);}catch{res.writeHead(404);res.end();}});await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}/`;}
const report={version,base,home:[],result:[],tutorial:{goalProgression:'teleport fixture; not human completion',wallInput:'actual mouse/pointer events',stages:[]},errors:[]};
const profiles=[{id:'normal',width:390,height:740,camera:0,bottom:0},{id:'narrow',width:360,height:740,camera:0,bottom:0},{id:'short',width:390,height:700,camera:0,bottom:0},{id:'full',width:390,height:844,camera:18,bottom:24}];
const settle=()=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
const ready=()=>page.waitForFunction(()=>{const s=window.__corogalism.state;return s.screen==='game'&&s.countdownMs===0&&s.prepareMs===0;});
async function configure(profile){await page.setViewportSize({width:profile.width,height:profile.height});await page.evaluate(p=>{document.documentElement.style.setProperty('--camera-top',p.camera+'px');document.querySelector('.wrap').style.paddingBottom=(12+p.bottom)+'px';window.dispatchEvent(new Event('resize'));},profile);await settle();}
async function decoration(screen){return page.evaluate(screen=>{
 const panel=document.querySelector('#screen-'+screen),card=panel.getBoundingClientRect(),canvas=panel.querySelector('[data-wall-divider]'),line=canvas.getBoundingClientRect(),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
 let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>24)painted++;
 const heading=panel.querySelector('h2').getBoundingClientRect();
 const floors=[...panel.querySelectorAll('[data-floor-token]')].map(c=>{const b=c.getBoundingClientRect(),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let painted=0;for(let i=3;i<data.length;i+=4)if(data[i]>24)painted++;return {kind:c.dataset.floorToken,painted,inside:b.left>card.left&&b.right<card.right,side:c.dataset.floorToken==='ice'?b.right<line.left:b.left>line.right};});
 const toys=[...panel.querySelectorAll('.result-scene canvas')].map(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let painted=0;for(let i=3;i<data.length;i+=4)if(data[i]>24)painted++;return {kind:c.dataset.toy,painted};});
 return {overflow:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,lineWidth:line.width,leftInset:line.left-card.left,rightInset:card.right-line.right,belowHeading:line.top>=heading.bottom,painted,toys,floors};
},screen);}
function checkDecoration(row){assert.equal(row.overflow,0);assert.equal(row.horizontal,0);assert.ok(row.leftInset>24&&row.rightInset>24);assert.ok(Math.abs(row.leftInset-row.rightInset)<1);assert.ok(row.belowHeading);assert.ok(row.painted>1000);for(const toy of row.toys)assert.ok(toy.painted>100);assert.deepEqual(row.floors.map(f=>f.kind),['ice','sand']);for(const floor of row.floors)assert.ok(floor.painted>1000&&floor.inside&&floor.side);}
async function finish(){await page.evaluate(()=>{const c=window.__corogalism,g=c.state.goal;c.teleport(g.x,g.y);});await page.waitForFunction(()=>window.__corogalism.state.screen==='clear');await page.waitForFunction(()=>!document.getElementById('btn-next').disabled);}
try{
 await mkdir(output,{recursive:true});
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext({viewport:{width:390,height:740},serviceWorkers:'block'});
 const init=()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:'easy',soundEnabled:false}));};
 await context.addInitScript(init);page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(base+`?debug=1&seed=77&verify=${version}`);await page.waitForFunction(()=>!!window.__corogalism);await settle();
 assert.equal(await page.locator('.badge').textContent(),'v'+version);
 for(const profile of profiles){await configure(profile);const row={profile:profile.id,...await decoration('mode')};checkDecoration(row);report.home.push(row);await page.screenshot({path:resolve(output,`home-${profile.id}.png`)});}
 // 参考記録を持つ場合のレイアウト。テスト専用contextで保存し、利用者の記録には触れない。
 await page.evaluate(async()=>{const {saveRunBest}=await import('./src/record/storage.js');saveRunBest({level:'easy',stages:25,totalTimeMs:454660,usedContinue:false});});
 await page.locator('#btn-challenge').click();await ready();await finish();
 await page.locator('#btn-game-exit').click();await page.locator('#btn-end-confirm').click();await page.waitForFunction(()=>window.__corogalism.state.screen==='run-result');
 for(const profile of profiles){await configure(profile);const row={profile:profile.id,...await decoration('run-result')};checkDecoration(row);assert.equal(row.toys.length,2);report.result.push(row);await page.screenshot({path:resolve(output,`result-${profile.id}.png`)});}
 await configure(profiles[2]);await page.locator('#run-badge').evaluate(e=>e.hidden=false);await settle();const badgeRow={profile:'short-new-best-badge-fixture',...await decoration('run-result')};checkDecoration(badgeRow);report.result.push(badgeRow);await page.screenshot({path:resolve(output,'result-short-badge-fixture.png')});
 await context.close();
 const offline=await browser.newContext({viewport:{width:390,height:740},serviceWorkers:'allow'});await offline.addInitScript(init);page=await offline.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(base+`?debug=1&seed=77&verify=${version}`);await page.waitForFunction(()=>!!window.__corogalism);await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 report.cache=await page.evaluate(async()=>{const key=(await caches.keys()).find(n=>n.startsWith('corogalism-'));return {key,assets:(await(await caches.open(key)).keys()).length};});assert.equal(report.cache.assets,expectedAssets);await offline.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__corogalism);await page.locator('#btn-tutorial').click();await page.locator('#btn-tutorial-start').click();await ready();
 for(let step=0;step<3;step++){
  const state=await page.evaluate(()=>window.__corogalism.state),kind=state.puzzle?.kind??'materials';assert.equal(kind,['materials','racket','sequence'][step]);
  if(step>0){assert.equal(state.puzzleCourse.stageCount,2);assert.equal(state.puzzleCourse.index,step-1);assert.equal(await page.locator('#stage-theme').textContent(),`動く壁 ${step} / 2`);
   const wall=state.rackets[0],axis=wall.axis,sign=wall[axis]>=wall.max-.01?-1:1,b=await page.locator('#board').boundingBox();
   await page.mouse.move(b.x+b.width/2+(axis==='x'?sign*b.width*.2:0),b.y+b.height/2+(axis==='y'?sign*b.height*.2:0));await page.mouse.down();
   try{await page.waitForFunction(before=>window.__corogalism.state.rackets.some((w,i)=>Math.hypot(w.x-before[i].x,w.y-before[i].y)>.001),state.rackets.map(({x,y})=>({x,y})),{timeout:4000});}finally{await page.mouse.up();}
  }
  report.tutorial.stages.push({step:step+1,kind,seed:state.seed,wallMovedByPointer:step>0});await page.screenshot({path:resolve(output,`tutorial-${step+1}.png`)});await finish();
  if(step===2){assert.equal(await page.locator('#btn-next').textContent(),'モード選択へ');const seed=state.seed;await page.locator('#btn-retry').click();await ready();const retry=await page.evaluate(()=>window.__corogalism.state);assert.equal(retry.seed,seed);assert.equal(retry.puzzleCourse.index,1);report.tutorial.retry={seed,index:retry.puzzleCourse.index};await finish();}
  await page.locator('#btn-next').click();if(step<2)await ready();else await page.waitForFunction(()=>window.__corogalism.state.screen==='mode');
 }
 report.tutorial.finalScreen=await page.evaluate(()=>window.__corogalism.state.screen);assert.equal(report.tutorial.finalScreen,'mode');
 await page.locator('#btn-practice').click();await ready();assert.equal(await page.locator('#practice-stage').textContent(),'1面目 / 5');report.offline={reload:true,tutorialThreeStages:true,practiceFiveStageLabel:true};
 assert.deepEqual(report.errors,[]);await writeFile(resolve(output,'results.json'),JSON.stringify(report,null,2)+'\n');await offline.close();console.log(`PASS v${version}: wall dividers/results/three-stage tutorial/offline`);
}catch(error){await writeFile(resolve(output,'failure.json'),JSON.stringify({message:error.message,report,state:page?await page.evaluate(()=>window.__corogalism?.state).catch(()=>null):null},null,2)+'\n');if(page)await page.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});throw error;
}finally{if(browser)await browser.close();if(server)await new Promise(done=>server.close(done));}
