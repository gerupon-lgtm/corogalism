import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{for(const failure of ['constructor','rolling','impact']){
 const p=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(failure=>{
  Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));
  const Original=window.AudioContext;
  window.AudioContext=class extends Original {
   constructor(){super();if(failure==='constructor'){this.close();throw Error('fixture')}}
   createBuffer(channels,length,rate){if(failure==='rolling'||failure==='impact'&&length<20000)throw Error('fixture');return super.createBuffer(channels,length,rate)}
  };
 },failure);
 await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:8767/')+'ball-lab.html?debug=1');await p.waitForFunction(()=>!!window.__ballLab);
 await p.locator('[data-ball="metal"]').click();
 if(failure==='impact')await p.evaluate(()=>window.__ballLab.teleport(6.2,.5,4,0));
 const box=await p.locator('#board').boundingBox();
 await p.mouse.move(box.x+box.width*.9,box.y+box.height*.5);await p.mouse.down();await p.clock.runFor(900);await p.mouse.up();
 assert.equal(await p.evaluate(()=>window.__ballLab.state.sound.failed),true);
 await p.locator('#sound-note').waitFor({state:'visible'});
 const before=await p.evaluate(()=>window.__ballLab.state.actor);
 await p.clock.runFor(300);const after=await p.evaluate(()=>window.__ballLab.state.actor);
 assert.notEqual(after.x,before.x,'音声の失敗後も物理と描画を継続');
 assert.deepEqual(errors,[]);console.log('PASS audio failure '+failure);await p.close();
}}finally{await browser.close()}
