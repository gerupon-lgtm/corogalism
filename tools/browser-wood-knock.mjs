import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8767/',output=process.env.WOOD_OUTPUT||'docs/verification/wood-knock';await mkdir(output,{recursive:true});const rows=[];
try{for(const [width,height]of [[320,568],[390,844],[576,1024]]){
 const p=await browser.newPage({viewport:{width,height},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));window.__woodHits=[];
  const create=AudioContext.prototype.createBufferSource;AudioContext.prototype.createBufferSource=function(){const s=create.call(this),start=s.start.bind(s);s.start=(...args)=>{if(!s.loop){const d=s.buffer.getChannelData(0);let all=0,late=0;for(let i=0;i<d.length;i++){all+=d[i]**2;if(i>=s.buffer.sampleRate*.06)late+=d[i]**2;}window.__woodHits.push({lateFraction:late/all});}return start(...args);};return s;};
 });
 await p.goto(base+'ball-lab.html?debug=1');try{await p.waitForFunction(()=>!!window.__ballLab);}catch(e){console.error({url:p.url(),status:await p.locator('#status').textContent(),errors});throw e;}await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
 const state=()=>p.evaluate(()=>window.__ballLab.state),hits=()=>p.evaluate(()=>window.__woodHits);
 await p.locator('[data-ball=wood]').click();await p.waitForFunction(()=>window.__ballLab.state.sound.context==='running');
 await p.locator('#physics').selectOption('legacy');await p.evaluate(()=>document.fonts.ready);await p.clock.runFor(128);await p.locator('#board').scrollIntoViewIfNeeded();
 const box=await p.locator('#board').boundingBox();await p.mouse.move(box.x+box.width*.9,box.y+box.height*.5);await p.mouse.down();await p.clock.runFor(2500);await p.mouse.up();
 assert.ok((await state()).sound.events.includes('hit:wood:default'),'実pointerで標準壁のコンが鳴る');
 const cases=[];
 for(const wall of ['default','rubber','stone','cork'])for(const speed of [1.5,4]){
  await p.locator('#wall').selectOption(wall);await p.locator('#reset').click();await p.waitForTimeout(120);const count=(await hits()).length;
  await p.evaluate(speed=>window.__ballLab.teleport(6.2,.5,speed,0),speed);await p.clock.runFor(650);
  const added=(await hits()).slice(count);assert.ok(added.length>0);assert.ok(added.every(h=>h.lateFraction<.001));assert.ok((await state()).sound.events.includes(`hit:wood:${wall}`));cases.push({wall,speed,hits:added});
 }
 await p.locator('#sound').click();const count=(await hits()).length;await p.evaluate(()=>window.__ballLab.teleport(6.2,.5,4,0));await p.clock.runFor(650);assert.equal((await hits()).length,count);
 await p.locator('#sound').click();await p.locator('#pause').click();await p.evaluate(()=>window.__ballLab.teleport(6.2,.5,4,0));const paused=(await state()).actor;await p.clock.runFor(650);assert.deepEqual((await state()).actor,paused);
 await p.locator('summary').click();await p.locator('#copy').click();assert.equal(JSON.parse(await p.locator('#settings-text').inputValue()).revision,7);
 assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await p.clock.runFor(64); // 設定展開によるcanvasのリサイズ後に描画を進めてから撮る。
 if(width===390)await p.screenshot({path:output+'/wood-390.png',fullPage:true});rows.push({width,cases,errors});console.log('PASS wood knock '+width);await p.close();
}}finally{await writeFile(output+'/browser.json',JSON.stringify(rows,null,2)+'\n');await browser.close();}
