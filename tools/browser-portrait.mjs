import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
for(const route of ['', 'floor-lab.html']) for(const scenario of ['auto','fullscreen','unsupported','denied']) {
 const p=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(scenario=>{
  window.__lockCalls=[];window.__fullscreenCalls=0;let full=false;
  Object.defineProperty(document,'fullscreenElement',{get:()=>full?document.documentElement:null});
  Element.prototype.requestFullscreen=async()=>{window.__fullscreenCalls++;if(scenario==='denied')throw Error('denied');full=true;};
  Object.defineProperty(screen,'orientation',{configurable:true,value:scenario==='unsupported'?{}:{lock:async direction=>{window.__lockCalls.push(direction);if(scenario==='denied'||(scenario==='fullscreen'&&!full))throw Error('not allowed');}}});
 },scenario);
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+route);
 await p.waitForFunction(()=>document.getElementById('portrait-note')?.textContent!== '対応端末では縦向きに固定します。');
 assert.equal(await p.evaluate(()=>window.__fullscreenCalls),0);
 if(scenario==='auto')assert.match(await p.locator('#portrait-note').textContent(),/固定しました/);
 // 本編の設定は非表示のため、検証では該当ボタンのイベントを発火させる。
 if (!route) await p.locator('#btn-mode-settings').click();
 await p.locator('#portrait-lock').click();
 await p.waitForFunction(()=>!document.getElementById('portrait-lock').disabled);
 assert.match(await p.locator('#portrait-note').textContent(),scenario==='auto'||scenario==='fullscreen'?/固定しました/:/自動回転/);
 assert.ok(await p.evaluate(()=>window.__lockCalls.every(x=>x==='portrait-primary')));
 assert.deepEqual(errors,[]);await p.close();console.log('PASS portrait '+route+' '+scenario);
}
}finally{await b.close()}
