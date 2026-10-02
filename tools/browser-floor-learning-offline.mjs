import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const c=await b.newContext({viewport:{width:390,height:844}});
 await c.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer'}));});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const base=process.env.BASE_URL||'https://corogalism.sikumilab.com/';
 await p.goto(base);assert.equal(await p.locator('.badge').textContent(),'v0.6.9');
 await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>navigator.serviceWorker.controller);
 const cache=await p.evaluate(async()=>{const names=await caches.keys();return {names,files:(await (await caches.open(names[0])).keys()).length}});
 assert.equal(cache.files,100);
 await c.setOffline(true);await p.goto(base+'?debug=1');await p.locator('#btn-floor-practice').click();
 await p.waitForFunction(()=>{const s=window.__corogalism.state;return s.screen==='game'&&!s.prepareMs&&!s.countdownMs});
 for(const kind of ['sand','ice','gravity','repulsion','normal']){
  await p.locator(`[data-floor=${kind}]`).click();assert.equal(await p.evaluate(()=>window.__corogalism.state.theme.practiceKind),kind);
 }
 assert.equal(await p.evaluate(()=>window.__corogalism.state.hp),null);
 await p.locator('#btn-game-exit').click();await p.locator('#btn-tutorial').click();await p.locator('#btn-tutorial-start').click();
 await p.waitForFunction(()=>{const s=window.__corogalism.state;return s.screen==='game'&&!s.prepareMs&&!s.countdownMs});
 assert.equal(await p.evaluate(()=>window.__corogalism.state.zones.length),4);
 await p.evaluate(()=>window.__corogalism.teleport(3.5,3.5));
 await p.waitForFunction(()=>document.querySelector('#tutorial-lesson').dataset.lesson==='ice');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({version:'0.6.9',offlineFloors:5,offlineTutorial:true,...cache}));
}finally{await b.close()}
