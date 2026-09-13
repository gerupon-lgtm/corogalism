import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844}});
 await ctx.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true}));
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.BASE_URL||'https://corogalism.sikumilab.com/';
 await page.goto(base);assert.equal(await page.locator('.badge').innerText(),'v0.4.5');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);
 const cache=await page.evaluate(async()=>{const names=await caches.keys();return {names,files:(await (await caches.open(names[0])).keys()).length};});assert.equal(cache.files,74);
 await ctx.setOffline(true);await page.goto(base+'?debug=1&seed=1');await page.locator('#btn-challenge').click();await page.waitForTimeout(3800);
 assert.equal(await page.evaluate(()=>window.__corogalism.state.screen),'game');
 assert.equal(await page.evaluate(async()=>{const r=await fetch('assets/audio/bgm.wav');return (await r.arrayBuffer()).byteLength;}),6773804);
 assert.deepEqual(errors,[]);console.log('PASS: formal URL v0.4.5, all 74 resources saved, offline navigation/gameplay/BGM available; no page errors.');
}finally{await browser.close();}
