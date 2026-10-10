/** 複数世代の保存記録が同時にある条件で、旧自己ベスト・現ルールの記録・保存本文を確認する。 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const base=process.env.BASE_URL||'http://127.0.0.1:8775/';
const output=process.env.RECORD_OUTPUT||'docs/verification/legacy-records/local';
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const rows=[];
const best=(stages,totalTimeMs)=>({stages,totalTimeMs,at:'2026-10-07T00:00:00Z'});
const initial={
 'corogalism-settings':JSON.stringify({mode:'pointer',challengeLevel:'easy',masterVolume:0}),
 'corogalism-run-bests-floor-v1-easy':JSON.stringify({withContinue:best(107,1600000)}),
 'corogalism-run-bests-maze-v1-easy':JSON.stringify({noContinue:best(10,140810),withContinue:best(16,240240)}),
 'corogalism-run-bests-puzzle-v1-easy':JSON.stringify({noContinue:best(25,454660),withContinue:best(73,1497960)}),
 'corogalism-run-bests':JSON.stringify({noContinue:best(30,7000),withContinue:best(40,9000)}),
 'corogalism-run-bests-floor-v1':JSON.stringify({noContinue:best(30,5000),withContinue:best(20,3000)}),
 'corogalism-run-bests-maze-v1':JSON.stringify({noContinue:best(10,1000),withContinue:best(35,4000)}),
 'corogalism-run-bests-puzzle-v1':JSON.stringify({noContinue:best(3,1000),withContinue:best(4,2000)}),
};
const keys=Object.keys(initial).filter(k=>k.startsWith('corogalism-run-bests'));
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
async function boot(width,height,seed={},workers='block'){
 const context=await browser.newContext({viewport:{width,height},serviceWorkers:workers});
 await context.addInitScript(data=>{if(!sessionStorage.getItem('record-fixture')){for(const[k,v]of Object.entries(data))localStorage.setItem(k,v);sessionStorage.setItem('record-fixture','1');}},seed);
 const page=await context.newPage(),errors={page:[],console:[],requests:[],http:[]},loaded={};
 page.on('pageerror',e=>errors.page.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.console.push(m.text());});
 page.on('requestfailed',r=>errors.requests.push({url:r.url(),error:r.failure()?.errorText}));
 const responses=[];page.on('response',r=>{if(r.status()>=400)errors.http.push({url:r.url(),status:r.status()});const path=new URL(r.url()).pathname;if(['/src/record/storage.js','/src/ui/runScreens.js'].includes(path))responses.push(r.body().then(body=>{loaded[path]=createHash('sha256').update(body).digest('hex');}));});
 await page.goto(base+'?debug=1');await page.waitForFunction(()=>!!window.__corogalism);
 assert.equal(await page.locator('.badge').innerText(),'v'+version);
 return {context,page,errors,loaded,responses};
}
const bodies=(page)=>page.evaluate(ks=>Object.fromEntries(ks.map(k=>[k,localStorage.getItem(k)])),keys);
try{
 for(const[width,height]of [[312,720],[412,915],[576,1024]]){
  const f=await boot(width,height,initial),{page}=f;
  await page.locator('#mode-records summary').click();
  for(const level of ['easy','normal']){
   await page.locator('#mode-records [data-level="'+level+'"]').click();
   const legacy=await page.locator('#mode-legacy').innerText();
   assert.match(legacy,level==='easy'?/ノーコン 10面.*続行 107面/:/ノーコン 30面.*5\.00 秒.*続行 40面/);
   const current=[await page.locator('#mode-best-no').innerText(),await page.locator('#mode-best-continue').innerText()];
   assert.match(current[0],level==='easy'?/25 面/:/3 面/);assert.match(current[1],level==='easy'?/73 面/:/4 面/);
   assert.deepEqual(await bodies(page),Object.fromEntries(keys.map(k=>[k,initial[k]])));
   const layout=await page.locator('#mode-legacy').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,width:r.width,height:r.height,scroll:el.scrollWidth,client:el.clientWidth,viewport:innerWidth};});
   assert.ok(layout.x>=0&&layout.x+layout.width<=width+1);assert.ok(layout.scroll<=layout.client+1);
   await page.screenshot({path:output+'/'+level+'-'+width+'.png',fullPage:true});
   rows.push({name:'legacy-visible',width,level,current,legacy,layout,recordBodiesUnchanged:true});
  }
  await page.reload();await page.waitForFunction(()=>!!window.__corogalism);
  await page.locator('#mode-records summary').click();await page.locator('#mode-records [data-level="easy"]').click();assert.match(await page.locator('#mode-legacy').innerText(),/107面/);
  const saved=await page.evaluate(async()=>{const {saveRunBest}=await import('/src/record/storage.js');return saveRunBest({level:'easy',stages:80,totalTimeMs:1700000,usedContinue:true});});
  assert.equal(saved.updated,true);assert.equal(saved.best.stages,80);
  const oldKeys=keys.filter(k=>!k.includes('puzzle-v1-easy'));
  assert.deepEqual(await page.evaluate(ks=>Object.fromEntries(ks.map(k=>[k,localStorage.getItem(k)])),oldKeys),Object.fromEntries(oldKeys.map(k=>[k,initial[k]])));
  await page.reload();await page.waitForFunction(()=>!!window.__corogalism);await page.locator('#mode-records summary').click();
  assert.match(await page.locator('#mode-best-continue').innerText(),/80 面/);assert.match(await page.locator('#mode-legacy').innerText(),/107面/);
  await Promise.all(f.responses);for(const[path,digest]of Object.entries(f.loaded))assert.equal(digest,createHash('sha256').update(await readFile(new URL('..'+path,import.meta.url))).digest('hex'));
  assert.deepEqual(f.errors,{page:[],console:[],requests:[],http:[]});
  rows.push({name:'reload-and-save',width,actualStorageSave:true,currentStages:80,legacyStages:107,oldBodiesUnchanged:true,loaded:f.loaded,errors:f.errors});
  await f.context.close();console.log('PASS records width '+width);
 }
 const f=await boot(412,915),{page}=f;await page.locator('#mode-records summary').click();assert.equal(await page.locator('#mode-legacy').isVisible(),false);assert.match(await page.locator('#mode-best-no').innerText(),/これから挑戦/);assert.match(await page.locator('#mode-best-continue').innerText(),/これから挑戦/);
 rows.push({name:'empty-records',noFabricatedRecords:true});await f.context.close();
 const offline=await boot(412,915,initial,'allow');
 await offline.page.evaluate(()=>navigator.serviceWorker.ready);await offline.page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const cache=await offline.page.evaluate(async()=>{const names=await caches.keys();const name=names.find(n=>n.startsWith('corogalism-'));return {name,count:(await(await caches.open(name)).keys()).length};});
 assert.equal(cache.name,'corogalism-7da95b332c20edb1');assert.equal(cache.count,122);
 await offline.context.setOffline(true);await offline.page.reload();await offline.page.waitForFunction(()=>!!window.__corogalism);
 await offline.page.locator('#mode-records summary').click();assert.match(await offline.page.locator('#mode-legacy').innerText(),/107面/);assert.match(await offline.page.locator('#mode-best-continue').innerText(),/73 面/);
 assert.deepEqual(await bodies(offline.page),Object.fromEntries(keys.map(k=>[k,initial[k]])));
 assert.deepEqual(offline.errors,{page:[],console:[],requests:[],http:[]});
 rows.push({name:'offline-records',cache,legacyStages:107,currentStages:73,recordBodiesUnchanged:true,errors:offline.errors});await offline.context.close();console.log('PASS records offline 122');
}finally{await writeFile(output+'/results.json',JSON.stringify({base,version,syntheticFixtures:true,actualPhoneStorageInspected:false,rows},null,2)+'\n');await browser.close();}
