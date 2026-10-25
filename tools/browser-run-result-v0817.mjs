/** Real UI entry, then labelled result fixtures for badge/no-badge layout comparisons. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const version=JSON.parse(await readFile(resolve(root,'package.json'),'utf8')).version;
const output=resolve(root,process.env.RESULT_OUTPUT||`docs/verification/v${version}/result-local`);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.woff2':'font/woff2','.wav':'audio/wav','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
let base=process.env.BASE_URL,server,browser,page;
if(!base){server=createServer(async(req,res)=>{try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),f=resolve(root,'.'+p+(p.endsWith('/')?'index.html':''));if(!f.startsWith(root+sep))throw Error('outside root');const data=await readFile(f);res.writeHead(200,{'content-type':mime[extname(f)]||'application/octet-stream','cache-control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end();}});await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}/`;}
const report={version,base,fixtureBoundary:'one actual goal via debug teleport; 14 stages and five undamaged clears are display fixtures, not human play evidence',rows:[],errors:[]};
const profiles=[{id:'393x740',width:393,height:740},{id:'360x740',width:360,height:740},{id:'390x700',width:390,height:700},{id:'full',width:390,height:844,camera:18,bottom:24}];
const ready=()=>page.waitForFunction(()=>{const s=window.__corogalism.state;return s.screen==='game'&&s.countdownMs===0&&s.prepareMs===0;});
const settle=()=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
async function measure(){return page.evaluate(()=>{const rect=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom};};const box=s=>rect(document.querySelector(s));const badge=document.querySelector('#run-badge');return {boxes:Object.fromEntries(['#screen-run-result','.run-result-intro','.run-stage-score','#run-stages','#run-time','#run-no-damage','#run-best','#run-save-note','#btn-run-again','#btn-run-modes'].map(s=>[s,box(s)])),labels:[...document.querySelectorAll('#screen-run-result .run-score dt')].map(e=>({text:e.textContent,weight:Number(getComputedStyle(e).fontWeight),content:(()=>{const r=document.createRange();r.selectNodeContents(e);return rect(r);})(),...rect(e)})),badge:{hidden:badge.hidden,parent:badge.parentElement.className,...rect(badge)},overflow:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth};});}
try{
 await mkdir(output,{recursive:true});browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext({viewport:{width:393,height:740},serviceWorkers:'block'});
 await context.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:'easy',soundEnabled:false}));});
 page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.setDefaultTimeout(30000);
 await page.goto(base+'?debug=1&seed=77');await page.waitForFunction(()=>!!window.__corogalism);assert.equal(await page.locator('.badge').textContent(),'v'+version);
 await page.locator('#btn-challenge').click();await ready();await page.evaluate(()=>{const c=window.__corogalism,g=c.state.goal;c.teleport(g.x,g.y);});await page.waitForFunction(()=>window.__corogalism.state.screen==='clear');await page.waitForFunction(()=>!document.querySelector('#btn-next').disabled);await page.locator('#btn-game-exit').click();await page.locator('#btn-end-confirm').click();await page.waitForFunction(()=>window.__corogalism.state.screen==='run-result');
 assert.equal(await page.locator('#run-stages').textContent(),'1 面');assert.equal(await page.locator('#run-badge').isVisible(),true);
 for(const p of profiles){
  await page.setViewportSize({width:p.width,height:p.height});await page.evaluate(p=>{document.documentElement.style.setProperty('--camera-top',(p.camera||0)+'px');document.querySelector('.wrap').style.paddingBottom=(12+(p.bottom||0))+'px';},p);
  const rows=[];
  for(const updated of [false,true]){
   await page.evaluate(async updated=>{const {createRunScreens}=await import('./src/ui/runScreens.js');createRunScreens(document).setResult({level:'easy',stages:14,totalTimeMs:277150,noDamageStages:5,usedContinue:false},{updated,saved:true,best:updated?{stages:14,totalTimeMs:277150}:{stages:28,totalTimeMs:625900}});},updated);await settle();
   const row=await measure();assert.equal(row.overflow,0);assert.equal(row.horizontal,0);assert.equal(row.badge.hidden,!updated);assert.match(row.badge.parent,/run-stage-score/);assert.ok(row.labels.every(e=>e.weight>=700));assert.equal(row.labels.at(-1).text,'無傷クリアの合計');
   assert.equal(await page.locator('#run-no-damage').textContent(),'5 面');assert.equal(await page.locator('#run-badge').textContent(),'自己ベスト！');assert.match(await page.locator('#run-save-note').textContent(),/げんきが減らなかった面の合計/);
   if(updated){const card=row.boxes['.run-stage-score'];assert.ok(row.badge.x>=card.x&&row.badge.right<=card.right&&row.badge.y>=card.y&&row.badge.bottom<=card.bottom,'badge inside card');assert.ok(row.badge.x>=row.labels[0].content.right||row.badge.bottom<=row.labels[0].content.y,'badge does not overlap title text');assert.deepEqual(row.boxes,rows[0].boxes,'badge must not move any layout');}
   rows.push(row);await page.screenshot({path:resolve(output,`${p.id}-${updated?'new-best':'result'}.png`)});
  }
  await page.evaluate(async()=>{const {createRunScreens}=await import('./src/ui/runScreens.js');createRunScreens(document).setResult({level:'easy',stages:107,totalTimeMs:1600000,noDamageStages:38,usedContinue:true},{updated:true,saved:true,best:{stages:107,totalTimeMs:1600000}});});await settle();
  const threeDigits=await measure();assert.equal(threeDigits.overflow,0);assert.equal(threeDigits.horizontal,0);await page.screenshot({path:resolve(output,`${p.id}-three-digits.png`)});
  report.rows.push({profile:p.id,states:rows,threeDigits});
 }
 assert.deepEqual(report.errors,[]);await writeFile(resolve(output,'results.json'),JSON.stringify(report,null,2)+'\n');console.log(`PASS v${version}: 4 result sizes, bold labels, badge visibility without layout shifts`);
}catch(error){await writeFile(resolve(output,'failure.json'),JSON.stringify({message:error.message,report},null,2)+'\n');if(page)await page.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});throw error;}
finally{if(browser)await browser.close();if(server)await new Promise(done=>server.close(done));}
