/** ユーザーの白線に対応する、時間・げんきメーター上端とトップ木枠の一致を確認。 */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE);
const engine=process.env.HOME_ENGINE||'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({executablePath:engine==='webkit'?'C:/Users/user/AppData/Local/ms-playwright/webkit-2336/Playwright.exe':'C:/Program Files/Google/Chrome/Application/chrome.exe'});
let base=process.env.BASE_URL||'http://127.0.0.1:8794/';
let server=null;
// 検証と同じプロセスで配信し、別セルの終了で確認用サーバーが途切れるのを防ぐ。
if(process.env.HOME_SERVE==='1'){
 const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.wav':'audio/wav','.webmanifest':'application/manifest+json'};
 server=createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const file=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
   if(!file.startsWith(root+sep))throw Error('outside root');
   const body=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 base=`http://127.0.0.1:${server.address().port}/`;
}
const out=process.env.HOME_OUTPUT||'docs/verification/v0.8.5/local';await mkdir(out,{recursive:true});
const version=process.env.APP_VERSION||'0.8.5';
const baseline=process.env.HEADER_BASELINE==='1';
const offline=process.env.HOME_OFFLINE==='1';
const reference=process.env.HEADER_REFERENCE?JSON.parse(await readFile(process.env.HEADER_REFERENCE,'utf8')):null;
const rows=[];
let activePage=null,activeErrors=[];
const rects=p=>p.evaluate(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y+scrollY,width:b.width,height:b.height,bottom:b.bottom+scrollY};};return {head:r('.head'),badge:r('.badge'),frame:r('#screen-mode'),board:r('#board'),meter:r('#time-meter-block'),toolbar:r('#play-toolbar'),height:innerHeight,scroll:document.documentElement.scrollHeight,width:innerWidth,scrollWidth:document.documentElement.scrollWidth};});
try{
 for(const [width,height,camera,bottom] of (offline?[[390,844,47,34]]:[[312,780,0,0],[360,740,0,0],[390,700,0,0],[390,844,0,0],[390,844,47,34],[412,915,18,24],[576,900,0,0],[844,390,0,0]])){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:offline?'allow':'block'}),errors=[];
  await context.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});Element.prototype.requestFullscreen=()=>Promise.reject(Error('verification only'));localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:'easy',soundEnabled:false}));});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  activePage=page;activeErrors=errors;
  await page.goto(base+'?debug=1&seed=77');
  if(offline){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);const size=await page.evaluate(async()=>{const name=(await caches.keys()).find(n=>n.startsWith('corogalism-'));return(await(await caches.open(name)).keys()).length;});assert.equal(size,130);await context.setOffline(true);await page.reload();}
  await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>document.querySelector('#screen-mode').dataset.artReady==='true');
  assert.equal(await page.locator('.badge').textContent(),'v'+version);
  await page.addStyleTag({content:`:root{--camera-top:${camera}px}.wrap{padding-bottom:${12+bottom}px!important}`});
  const top=await rects(page);
  assert.equal(top.scrollWidth,width);
  assert.ok(Math.abs(top.frame.bottom-(top.scroll-12-bottom))<1);
  assert.equal(await page.locator('#play-toolbar').isVisible(),false);assert.equal(await page.locator('#challenge-hud').getAttribute('aria-hidden'),'true');
  const contained=await page.locator('#screen-mode button').evaluateAll(buttons=>{const f=document.querySelector('#screen-mode').getBoundingClientRect();return buttons.filter(b=>b.getClientRects().length).every(b=>{const r=b.getBoundingClientRect();return r.left>=f.left-1&&r.right<=f.right+1;});});assert.ok(contained,'visible controls must stay inside the wood frame');
  await page.screenshot({path:`${out}/home-${width}-${height}-${camera}.png`,fullPage:true});
  await page.locator('#mode-records summary').click();assert.equal(await page.locator('#mode-records').evaluate(e=>e.open),true);assert.equal((await rects(page)).scrollWidth,width);await page.locator('#mode-records summary').click();
  await page.locator('#btn-challenge').click();await page.waitForFunction(()=>window.__corogalism.state.screen==='game');
  const play=await rects(page);assert.ok(Math.abs(top.frame.width-play.board.width)<1);assert.ok(Math.abs(top.frame.x-play.board.x)<1);
  if(!baseline)assert.ok(Math.abs(top.frame.y-play.meter.y)<1,'top wood frame must align with the time/HP meters, not the maze');
  assert.equal(await page.evaluate(()=>scrollY),0);assert.deepEqual(top.head,play.head);assert.deepEqual(top.badge,play.badge);
  assert.equal(await page.locator('#challenge-hud').isVisible(),true);assert.equal(await page.locator('#play-toolbar').isVisible(),true);
  if(reference){const previous=reference.rows.find(r=>r.width===width&&r.height===height&&r.camera===camera&&r.bottom===bottom);assert.ok(previous);for(const key of ['head','board','meter','toolbar'])assert.deepEqual(play[key],previous.play[key],`game ${key} must stay unchanged`);}
  if(width===390&&height===844&&camera===47)await page.screenshot({path:`${out}/play-${width}-${height}-${camera}.png`,fullPage:true});
  // 画面を回して戻しても、盤面とキャンバスを同時に復帰させる。
  if(width===390&&height===844&&camera===0){await page.setViewportSize({width:844,height:390});await page.waitForTimeout(80);await page.setViewportSize({width,height});await page.waitForTimeout(180);const restored=await rects(page);assert.equal(restored.board.width,play.board.width);const canvas=await page.locator('#canvas').boundingBox();assert.ok(Math.abs(canvas.width-(play.board.width-6))<1);}
  if(width===390&&height===844&&camera===0){await page.locator('#btn-game-exit').click();await page.locator('#btn-end-confirm').click();await page.locator('#btn-run-modes').click();await page.locator('#btn-tutorial').click();await page.locator('#btn-tutorial-start').click();await page.waitForFunction(()=>window.__corogalism.state.gameMode==='tutorial');await page.locator('#btn-game-exit').click();await page.waitForFunction(()=>window.__corogalism.state.screen==='mode');assert.ok(Math.abs((await rects(page)).frame.y-top.frame.y)<1);}
  assert.deepEqual(errors,[]);rows.push({width,height,camera,bottom,top,play});await context.close();console.log('PASS '+width+'x'+height+' camera='+camera);
 }
}catch(error){
 const failure={error:String(error),url:activePage?.url(),errors:activeErrors};
 if(activePage&&!activePage.isClosed()){failure.dom=await activePage.locator('#screen-mode').evaluate(e=>({artReady:e.dataset.artReady,text:e.textContent.slice(0,100)})).catch(()=>null);await activePage.screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});}
 console.log(JSON.stringify(failure));await writeFile(`${out}/failure.json`,JSON.stringify(failure,null,2)+'\n');throw error;
}finally{await writeFile(`${out}/header-alignment.json`,JSON.stringify({base,engine,version,baseline,offline,rows},null,2)+'\n');await browser.close();if(server)await new Promise(done=>server.close(done));}
