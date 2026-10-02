import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const previous=execFileSync('git',['-c','safe.directory=C:/Users/user/Documents/AI連携ゲーム/corogalism','show','8945fa2:src/audio/ballMaterialAudio.js'],{encoding:'utf8'});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),rows=[];
try{for(const before of [true,false]){
 const p=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 if(before)await p.route('**/src/audio/ballMaterialAudio.js',r=>r.fulfill({contentType:'text/javascript',body:previous}));
 await p.addInitScript(()=>{
  window.__sources=[];
  const source=AudioContext.prototype.createBufferSource,gain=AudioContext.prototype.createGain;
  AudioContext.prototype.createGain=function(){const node=gain.call(this),target=node.gain.setTargetAtTime;node.gain.setTargetAtTime=function(value,...args){this.__target=value;return target.call(this,value,...args)};return node};
  AudioContext.prototype.createBufferSource=function(){const node=source.call(this),connect=node.connect,start=node.start;
   node.connect=function(target,...args){this.__gain=target.gain;return connect.call(this,target,...args)};
   node.start=function(...args){window.__sources.push(this);return start.apply(this,args)};return node};
  Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));
 });
 await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:8767/')+'ball-lab.html?debug=1');await p.waitForFunction(()=>!!window.__ballLab);
 const read=loop=>p.evaluate(loop=>window.__sources.filter(s=>s.loop===loop).at(-1).__gain.__target??window.__sources.filter(s=>s.loop===loop).at(-1).__gain.value,loop);
 const samples=[];
 for(const kind of ['metal','superball']){
  await p.locator(`[data-ball="${kind}"]`).click();await p.waitForFunction(()=>window.__ballLab.state.sound.context==='running');
  await p.evaluate(()=>window.__ballLab.teleport(2,.5,2,0));await p.clock.runFor(32);const rolling=await read(true);
  await p.waitForTimeout(150);await p.evaluate(()=>window.__ballLab.teleport(6.2,.5,4,0));await p.clock.runFor(150);const impact=await read(false);
  samples.push({kind,rolling,impact});
 }
 assert.deepEqual(errors,[]);rows.push({before,samples});await p.close();
}
for(let i=0;i<2;i++){
 assert.ok(Math.abs(rows[1].samples[i].rolling/rows[0].samples[i].rolling-.25)<1e-6,'転がり音だけ旧版の25%');
 assert.equal(rows[1].samples[i].impact,rows[0].samples[i].impact,'同じ衝突の音量を維持');
}
const output=process.env.MIX_OUTPUT||'docs/verification/ball-audio-mix';await mkdir(output,{recursive:true});await writeFile(output+'/mix.json',JSON.stringify(rows,null,2));console.log('PASS rolling gain 25%; impact gain unchanged (metal/superball)');
}finally{await browser.close()}
