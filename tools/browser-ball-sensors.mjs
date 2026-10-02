import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{for(const outcome of ['granted','denied','silent','unsupported']){
 const p=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(outcome=>{window.__events=[];
  Element.prototype.requestFullscreen=()=>{window.__events.push('fullscreen');return Promise.reject(Error('fixture'))};
  Object.defineProperty(window,'DeviceOrientationEvent',{value:outcome==='unsupported'?undefined:class{static requestPermission(){window.__events.push('sensor');return Promise.resolve(outcome==='denied'?'denied':'granted')}}});
  // 音声API非対応でも操作を継続できる。
  Object.defineProperty(window,'AudioContext',{value:undefined});Object.defineProperty(window,'webkitAudioContext',{value:undefined});
 },outcome);
 await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:8767/')+'ball-lab.html?debug=1');await p.waitForFunction(()=>!!window.__ballLab);
 await p.locator('#sensor').click();await p.clock.runFor(100);
 if(outcome==='granted'){
  for(let i=0;i<9;i++){await p.evaluate(()=>{const e=new Event('deviceorientation');Object.assign(e,{beta:18,gamma:0});dispatchEvent(e)});await p.clock.runFor(100)}
  assert.equal(await p.evaluate(()=>window.__ballLab.state.mode),'tilt');assert.equal(await p.evaluate(()=>window.__ballLab.state.needsCalibration),false);
  await p.evaluate(()=>{const e=new Event('deviceorientation');Object.assign(e,{beta:18,gamma:10});dispatchEvent(e)});await p.clock.runFor(600);
  assert.ok(await p.evaluate(()=>window.__ballLab.state.actor.x>.6));
  await p.locator('#calibrate').click();await p.clock.runFor(6200);assert.equal(await p.evaluate(()=>window.__ballLab.state.mode),'pointer');
 }else{await p.clock.runFor(6200);assert.equal(await p.evaluate(()=>window.__ballLab.state.mode),'pointer');}
 const events=await p.evaluate(()=>window.__events);if(outcome!=='unsupported')assert.ok(events.indexOf('sensor')<events.indexOf('fullscreen'));
 assert.deepEqual(errors,[]);console.log('PASS ball sensor '+outcome);await p.close();
}}finally{await b.close()}
