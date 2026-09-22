// 現行のテンポ・画面検証と、端末センサー開始経路の検証。
await import('./browser-tutorial-pacing.mjs');
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8765/';
try{
 // 既存基準を持つ端末でも、開始姿勢を測り直す。無信号はタッチへ。
 for(const sensor of ['granted','denied','silent']){
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await ctx.addInitScript(sensor=>{
  localStorage.setItem('corogalism-settings',JSON.stringify({mode:'tilt',calibration:{beta:40,gamma:10}}));
  Object.defineProperty(window,'DeviceOrientationEvent',{value:class{static async requestPermission(){return sensor==='denied'?'denied':'granted'}},configurable:true});
 },sensor);
 const p=await ctx.newPage();await p.clock.install();await p.clock.pauseAt(Date.now()+1000);await p.goto(base+'?debug=1');await p.waitForFunction(()=>!!window.__corogalism);
 await p.locator('#btn-tutorial').click();await p.locator('#btn-tutorial-start').click();await p.clock.runFor(100);await p.waitForFunction(()=>window.__corogalism.state.gameMode==='tutorial');
 if(sensor==='granted'){
 for(let i=0;i<7;i++){await p.evaluate(()=>{const e=new Event('deviceorientation');Object.assign(e,{beta:15,gamma:0});dispatchEvent(e)});await p.clock.runFor(100);}
 assert.deepEqual(await p.evaluate(()=>window.__corogalism.state.calibration),{beta:15,gamma:0});
 await p.clock.runFor(3800);assert.equal(await p.evaluate(()=>window.__corogalism.state.mode),'tilt');
 }else{await p.clock.runFor(5500);assert.equal(await p.evaluate(()=>window.__corogalism.state.mode),'pointer');}
 await ctx.close();console.log('PASS tutorial sensor: '+sensor);
 }
}finally{await browser.close()}
