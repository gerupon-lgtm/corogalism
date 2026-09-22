import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
for(const mode of ['practice','challenge','tutorial','lab-pointer','lab-sensor']) for(const outcome of ['success','denied','unsupported']) {
 const p=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(outcome=>{
  window.__events=[];window.__full=false;
  Object.defineProperty(document,'fullscreenElement',{get:()=>window.__full?document.documentElement:null});
  Element.prototype.requestFullscreen=outcome==='unsupported'?undefined:()=>{
    window.__events.push({kind:'fullscreen',active:navigator.userActivation.isActive});
    if(outcome==='denied')return Promise.reject(Error('denied'));
    window.__full=true;return Promise.resolve();
  };
  Object.defineProperty(screen,'orientation',{value:{lock:async()=>{if(!window.__full)throw Error();}},configurable:true});
  Object.defineProperty(window,'DeviceOrientationEvent',{value:class{static requestPermission(){window.__events.push({kind:'sensor'});return Promise.resolve('denied');}},configurable:true});
  Object.defineProperty(window,'DeviceMotionEvent',{value:class{static requestPermission(){window.__events.push({kind:'motion'});return Promise.resolve('denied');}},configurable:true});
 },outcome);
 const lab=mode.startsWith('lab');
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+(lab?'floor-lab.html?debug=1':'?debug=1'));
 await p.waitForFunction(lab=>lab?!!window.__floorLab:!!window.__corogalism,lab);
 assert.equal(await p.evaluate(()=>window.__events.filter(e=>e.kind==='fullscreen').length),0);
 if(mode==='tutorial')await p.locator('#btn-tutorial').click();
 await p.locator(lab?(mode==='lab-sensor'?'#sensor':'#pointer'):mode==='tutorial'?'#btn-tutorial-start':'#btn-'+mode).click();
 await p.waitForFunction(lab=>lab?window.__floorLab.mode==='pointer':window.__corogalism.state.screen==='game',lab);
 const events=await p.evaluate(()=>window.__events);
 const requests=events.filter(e=>e.kind==='fullscreen');assert.equal(requests.length,outcome==='unsupported'?0:1);
 assert.ok(requests.every(e=>e.active));
 if(!lab || mode==='lab-sensor') { assert.ok(events.some(e=>e.kind==='sensor'));if(requests.length)assert.ok(events.findIndex(e=>e.kind==='sensor')<events.findIndex(e=>e.kind==='fullscreen')); }
 if(outcome==='success')await p.waitForFunction(()=>document.getElementById('portrait-note').textContent.includes('固定しました'));
 await p.evaluate(()=>{window.__full=false;document.dispatchEvent(new Event('fullscreenchange'));});
 if(lab)await p.locator('#pointer').click();
 else {await p.locator('#btn-game-exit').dispatchEvent('click');if(mode==='challenge')await p.locator('#btn-run-modes').click();await p.locator('#btn-practice').click();}
 assert.equal(await p.evaluate(()=>window.__events.filter(e=>e.kind==='fullscreen').length),requests.length);
 assert.deepEqual(errors,[]);await p.close();console.log('PASS start fullscreen '+mode+' '+outcome);
}
}finally{await b.close()}
