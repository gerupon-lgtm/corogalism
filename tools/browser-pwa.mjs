import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
let epoch=1,broken=false;
const root=resolve('.');
const server=createServer(async(req,res)=>{
 try {
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const filename=resolve(root,'.'+(path==='/'?'/index.html':path));
  if(!filename.startsWith(root+sep))throw Error('outside');
  if(broken&&path==='/assets/toy-wall-atlas.png'){res.writeHead(503);res.end();return;}
  let data=await readFile(filename);
  if(path==='/sw.js')data=Buffer.from(data.toString()+`\n// fixture ${epoch}\n`);
  if(path==='/precache.js')data=Buffer.from(data.toString().replace(/PRECACHE_VERSION = '[^']+'/ ,`PRECACHE_VERSION = 'fixture-${epoch}'`));
  if(path==='/'||path==='/index.html')data=Buffer.from(data.toString().replace('<body>',`<body data-fixture="${epoch}">`));
  const types={js:'text/javascript',html:'text/html',css:'text/css',webmanifest:'application/manifest+json',svg:'image/svg+xml',png:'image/png',wav:'audio/wav',woff2:'font/woff2'};
  res.writeHead(200,{'Content-Type':types[filename.split('.').pop()]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);
 await context.setOffline(true);await page.goto(base+'?debug=1&seed=1');
 await page.locator('#btn-practice').click();await page.waitForTimeout(3800);assert.equal(await page.evaluate(()=>window.__corogalism.state.screen),'game');
 assert.equal(await page.evaluate(async()=>{const r=await fetch('assets/audio/bgm.wav');return (await r.arrayBuffer()).byteLength;}),6773804);
 assert.ok((await page.evaluate(()=>caches.keys())).length===1);await context.setOffline(false);
 epoch=2;await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
 await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting));
 assert.equal(await page.locator('#pwa-notice').isVisible(),false);assert.equal(await page.locator('body').getAttribute('data-fixture'),'1');
 await page.locator('#btn-game-exit').click();await page.locator('#btn-pwa-update').click();await page.waitForFunction(()=>document.body.dataset.fixture==='2');
 const second=await context.newPage();await second.goto(base);await second.locator('#btn-practice').click();
 epoch=3;await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update();});await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting));
 await page.locator('#btn-pwa-update').click();await page.waitForFunction(()=>document.querySelector('#pwa-message').textContent.includes('ほかのタブ'));
 assert.equal(await second.locator('body').getAttribute('data-fixture'),'2');assert.equal(await page.locator('body').getAttribute('data-fixture'),'2');
 await second.close();await page.locator('#btn-pwa-update').click();await page.waitForFunction(()=>document.body.dataset.fixture==='3');
 assert.deepEqual(await page.evaluate(()=>caches.keys()),['corogalism-fixture-3']);assert.deepEqual(errors,[]);await context.close();
 broken=true;const failed=await browser.newContext();await failed.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true}));
 const fallback=await failed.newPage();await fallback.goto(base);await fallback.waitForFunction(()=>document.querySelector('#pwa-status').textContent.includes('完了できません'));
 await fallback.locator('#btn-practice').click();assert.equal(await fallback.locator('body').getAttribute('data-screen'),'game');await failed.close();
 console.log('PASS: complete offline launch/audio; update waits for title; other tab protected; failed precache leaves online game usable.');
}finally{await browser.close();server.close();}
