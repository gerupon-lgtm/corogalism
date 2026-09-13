import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:320,height:480},hasTouch:true,isMobile:true,serviceWorkers:'block'});
 await ctx.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});});
 const page=await ctx.newPage();await page.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+'?debug=1');await page.waitForFunction(()=>Boolean(window.__corogalism));await page.locator('#btn-practice').tap();await page.locator('#btn-pause').tap();
 await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 // 傾きモードと同じ3ボタン構成でネイティブスワイプを検証する。
 await page.evaluate(()=>document.querySelector('#btn-pause-calibrate').hidden=false);
 await page.locator('.pause-card').scrollIntoViewIfNeeded();
 const box=await page.locator('.pause-card').boundingBox(),cdp=await ctx.newCDPSession(page);
 const x=box.x+box.width*.8,y=box.y+box.height-12;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*15}]});await new Promise(r=>setTimeout(r,25));}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.ok(await page.locator('.pause-card').evaluate(e=>e.scrollTop>0));
 assert.ok((await page.evaluate(()=>window.__corogalism.state)).paused);console.log('PASS native swipe in small 3-button PAUSE card.');
}finally{await browser.close()}
