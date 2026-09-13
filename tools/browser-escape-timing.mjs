import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 for(const sensor of [false,true]){
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await ctx.addInitScript(sensor=>{
 Object.defineProperty(window,'DeviceOrientationEvent',{value:sensor?class{}:undefined,configurable:true});
 window.emit=()=>{const e=new Event('deviceorientation');Object.assign(e,{beta:20,gamma:0});window.dispatchEvent(e);};

 },sensor);
 const page=await ctx.newPage();await page.clock.install();await page.clock.pauseAt(Date.now()+1000);await page.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+'?debug=1&seed=1');await page.locator('#btn-challenge').tap();
 if(sensor)for(let i=0;i<14;i++){await page.evaluate(()=>emit());await page.clock.runFor(100);}
 await page.clock.runFor(3700);
 for(let i=0;i<2;i++){await page.evaluate(()=>{const a=window.__corogalism;a.teleport(a.state.goal.x,a.state.goal.y);});await page.clock.runFor(32);await page.locator('#btn-next').tap();await page.clock.runFor(3700);}
 await page.evaluate(()=>{const a=window.__corogalism;const t=a.state.sticky[0];a.teleport(t.x,t.y);});await page.clock.runFor(32);
 const board=await page.locator('#board').boundingBox();
 for(let i=0;i<6;i++) { if(i)await page.clock.runFor(80); await page.touchscreen.tap(board.x+board.width/2,board.y+board.height/2); }
 const before=await page.evaluate(()=>window.__corogalism.state.trap);
 assert.equal(before.target,.5);assert.ok(before.elapsed<.5);
 await page.clock.runFor(100);
 assert.equal(await page.evaluate(()=>window.__corogalism.state.trap),null);
 console.log(`PASS native touch: ${sensor?'tilt':'pointer'}, 6 taps produce 3 reductions, escape at 0.5s (frame tolerance).`);
 await ctx.close();
 }
}finally{await browser.close();}
