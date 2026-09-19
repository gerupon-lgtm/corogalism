import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844}});await ctx.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true}));
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const base=process.env.BASE_URL||'http://127.0.0.1:8765/';
 await p.goto(base);await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>navigator.serviceWorker.controller);
 await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:'docs/verification/tutorial/title.png'});
 await ctx.setOffline(true);await p.goto(base+'?debug=1');await p.waitForFunction(()=>!!window.__corogalism);await p.locator('#btn-tutorial').click();
 assert.equal(await p.locator('.tutorial-hold').evaluate(i=>i.complete&&i.naturalWidth>0),true);
 await p.locator('#btn-tutorial-start').click();await p.waitForFunction(()=>window.__corogalism.state.countdownMs===0);
 await p.evaluate(()=>window.__corogalism.teleport(1.5,4.5));await p.waitForFunction(()=>window.__corogalism.state.tutorialOpen);
 assert.match(await p.locator('.tutorial-copy').innerText(),/0.5秒/);assert.deepEqual(errors,[]);
 console.log('PASS: offline tutorial image, modules, fixed stage and contact explanation');
}finally{await browser.close()}
