import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8767/',output=process.env.CONTACT_OUTPUT||'docs/verification/ball-contact-audio';
await mkdir(output,{recursive:true});const rows=[];
try{for(const [width,height]of [[320,568],[390,844],[576,1024]]){
 const p=await browser.newPage({viewport:{width,height},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});
  Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));
  window.__audioStarts=[];const create=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){const s=create.call(this),start=s.start.bind(s);s.start=(...args)=>{window.__audioStarts.push({loop:s.loop,length:s.buffer.length});return start(...args)};return s;};
 });
 await p.goto(base+'ball-lab.html?debug=1');await p.waitForFunction(()=>!!window.__ballLab).catch(async e=>{console.error(JSON.stringify({errors,status:await p.locator('#status').textContent()}));throw e});
 await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
 const state=()=>p.evaluate(()=>window.__ballLab.state),starts=()=>p.evaluate(()=>window.__audioStarts.length);
 assert.match(await p.locator('header span').textContent(),/おためし5/);
 await p.locator('[data-ball=metal]').click();await p.waitForFunction(()=>window.__ballLab.state.sound.context==='running');
 await p.evaluate(()=>window.__ballLab.teleport(2,.5,2,0));await p.clock.runFor(100);assert.equal((await state()).sound.rolling,true);
 const hardToSoft=(await state()).actor;await p.locator('[data-ball=sponge]').click();assert.deepEqual((await state()).actor,hardToSoft);
 assert.equal((await state()).sound.rolling,false);await p.waitForTimeout(100);
 const soft=[];
 for(const kind of ['superball','sponge'])for(const floor of ['normal','ice','sand','gravity','repulsion','mixed']){
  await p.locator(`[data-ball=${kind}]`).click();await p.locator('#floor').selectOption(floor);
  await p.locator('#reset').click();await p.evaluate(()=>window.__ballLab.teleport(2,.5,2,0));const before=await starts();
  await p.clock.runFor(120);const s=await state();assert.ok(s.actor.x>2);assert.equal(s.sound.rolling,false);assert.equal(await starts(),before,'転がっても音源を開始しない');
  assert.ok(!s.sound.events.some(e=>e.startsWith('roll:'+kind+':')));soft.push({kind,floor,x:s.actor.x,rolling:s.sound.rolling,sourcesStarted:0});
 }
 await p.locator('#floor').selectOption('normal');await p.locator('#wall').selectOption('rubber');
 for(const kind of ['superball','sponge']){
  await p.locator(`[data-ball=${kind}]`).click();await p.waitForTimeout(120);await p.evaluate(()=>window.__ballLab.teleport(6.2,.5,4,0));await p.clock.runFor(250);
  assert.ok((await state()).sound.events.includes(`hit:${kind}:rubber`),'柔らかい球も壁で発音');assert.equal((await state()).sound.rolling,false);
 }
 const hard=[];
 for(const kind of ['default','wood','metal']){
  await p.locator(`[data-ball=${kind}]`).click();await p.locator('#reset').click();const r=await p.locator('#board').boundingBox();
  await p.mouse.move(r.x+r.width*.75,r.y+r.height*.5);await p.mouse.down();await p.clock.runFor(500);await p.mouse.up();
  const s=await state();assert.ok(s.actor.x>.5);assert.ok(s.sound.events.includes(`roll:${kind}:normal`));hard.push({kind,x:s.actor.x,rolling:s.sound.rolling});
 }
 await p.locator('#pause').click();assert.equal((await state()).sound.rolling,false);await p.locator('#pause').click();
 await p.locator('#sound').click();const muted=await starts();await p.clock.runFor(200);assert.equal(await starts(),muted);assert.equal((await state()).sound.rolling,false);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 await p.screenshot({path:`${output}/contact-${width}.png`,fullPage:true});rows.push({width,soft,hard,sound:(await state()).sound,errors});console.log('PASS contact audio '+width);await p.close();
}}finally{await writeFile(output+'/browser-contact.json',JSON.stringify(rows,null,2)+'\n');await browser.close()}
