/** 本番コードは変更せず、ローカル配信のキャッシュ版と音源応答だけを制御する。 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const manifest=await readFile(resolve(root,'precache.js'),'utf8');
const paths=JSON.parse(manifest.match(/self\.PRECACHE_FILES\s*=\s*(\[.*?\]);/s)[1]);
const sizes=await Promise.all(paths.map(async path=>({path,bytes:(await stat(resolve(root,path))).size})));
const report={version:JSON.parse(await readFile(resolve(root,'package.json'),'utf8')).version,runtimeFiles:paths.length,runtimeBytes:sizes.reduce((n,r)=>n+r.bytes,0),bgmBytes:sizes.filter(r=>r.path.startsWith('assets/audio/bgm')).reduce((n,r)=>n+r.bytes,0),cases:[],errors:[],boundary:'isolated local browser; actual pwa.js and sw.js; controlled precache revision and blocked audio response'};
let revision=0,releaseGate,gateRequested,gateNotice;
function prepareGate(){gateNotice=new Promise(resolve=>gateRequested=resolve);return new Promise(resolve=>releaseGate=resolve);}
let gate;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.woff2':'font/woff2','.wav':'audio/wav','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),relative=p.endsWith('/')?p+'index.html':p,f=resolve(root,'.'+relative);if(!f.startsWith(root+sep))throw Error('outside root');
  if(revision>0&&p==='/assets/audio/bgm-slide.wav'&&gate){gateRequested();await gate;}
  let data=await readFile(f);if(p==='/precache.js')data=Buffer.from(manifest.replace(/self\.PRECACHE_VERSION\s*=\s*'[^']+'/,'self.PRECACHE_VERSION = '+JSON.stringify('audit-'+revision)));
  res.writeHead(200,{'content-type':mime[extname(f)]||'application/octet-stream','cache-control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end();}
});
let browser;
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/`;
try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext({viewport:{width:393,height:740},serviceWorkers:'allow'});
 await context.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',soundEnabled:false}));});
 const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(base);await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const state=()=>page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {disabled:document.getElementById('btn-pwa-check').disabled,label:document.getElementById('btn-pwa-check').textContent,result:document.getElementById('pwa-check-result').textContent,installing:r.installing?.state||null,waiting:r.waiting?.state||null,noticeVisible:!document.getElementById('pwa-notice').hidden};});
 async function apply(){await page.locator('#btn-pwa-update').click();await page.waitForFunction(async()=>!(await navigator.serviceWorker.getRegistration())?.waiting);await page.waitForFunction(()=>document.getElementById('btn-pwa-check')&&!document.getElementById('btn-pwa-check').disabled);await page.evaluate(()=>navigator.serviceWorker.ready);}
 let start=performance.now();await page.locator('#btn-pwa-check').click();await page.waitForFunction(()=>!document.getElementById('btn-pwa-check').disabled);const latest=await state();assert.equal(latest.result,'最新版です。');report.cases.push({kind:'no-new-version',elapsedMs:Math.round(performance.now()-start),...latest});
 revision=1;gate=prepareGate();start=performance.now();await page.locator('#btn-pwa-check').click();await Promise.race([gateNotice,new Promise((_,reject)=>setTimeout(()=>reject(Error('audio gate not requested')),8000))]);
 const blocked=await state();assert.equal(blocked.installing,'installing');assert.equal(blocked.disabled,true);report.cases.push({kind:'new-version-found-but-audio-blocked',elapsedMs:Math.round(performance.now()-start),...blocked});
 releaseGate();gate=null;await page.waitForFunction(()=>!document.getElementById('btn-pwa-check').disabled);const prepared=await state();assert.equal(prepared.waiting,'installed');assert.match(prepared.result,/新しいバージョン/);report.cases.push({kind:'audio-released',elapsedMs:Math.round(performance.now()-start),...prepared});
 await apply();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 revision=2;gate=prepareGate();start=performance.now();await page.locator('#btn-pwa-check').click();await Promise.race([gateNotice,new Promise((_,reject)=>setTimeout(()=>reject(Error('second audio gate not requested')),8000))]);
 await page.waitForFunction(()=>!document.getElementById('btn-pwa-check').disabled);const timedOut=await state();assert.match(timedOut.result,/更新を確認できませんでした/);assert.equal(timedOut.installing,'installing');report.cases.push({kind:'timeout-while-download-still-running',elapsedMs:Math.round(performance.now()-start),...timedOut});
 releaseGate();gate=null;await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.waiting);await page.waitForFunction(()=>!document.getElementById('pwa-notice').hidden);const late=await state();assert.match(late.result,/更新を確認できませんでした/);assert.equal(late.waiting,'installed');report.cases.push({kind:'download-completes-after-ui-timeout',elapsedMs:Math.round(performance.now()-start),...late});
 await page.screenshot({path:resolve(root,'docs/verification/pwa-check-audit/late-update.png')});
 assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));await writeFile(resolve(root,'docs/verification/pwa-check-audit/results.json'),JSON.stringify(report,null,2)+'\n');
}finally{releaseGate?.();if(browser)await browser.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
