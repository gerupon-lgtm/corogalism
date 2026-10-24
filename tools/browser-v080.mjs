/** 本編の見た目・保存・実入力・5曲の接続・オフラインを確認する。 */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const playwright=await import(process.env.PLAYWRIGHT_MODULE);
const engine=process.env.V080_ENGINE||'chromium';
const version=process.env.APP_VERSION||'0.8.0';
const base=process.env.BASE_URL||'http://127.0.0.1:8794/';
const out=process.env.V080_OUTPUT||'docs/verification/v0.8.0/local';
const phase=process.env.V080_PHASE||'ui';
await mkdir(out,{recursive:true});
const browser=await playwright[engine].launch({executablePath:engine==='webkit'?(process.env.WEBKIT_EXECUTABLE||'C:/Users/user/AppData/Local/ms-playwright/webkit-2336/Playwright.exe'):'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const rows=[];let active=null;
const record=(name,value={})=>{rows.push({name,...value});console.log('PASS '+name+' '+JSON.stringify(value));};
const state=p=>p.evaluate(()=>window.__corogalism.state);
async function fixture({width=390,height=780,audio=false,clock=false,workers='block',records=false,level='easy'}={}){
 const context=await browser.newContext({viewport:{width,height},serviceWorkers:workers});
 await context.addInitScript(({audio,records,level})=>{
  Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});
  Element.prototype.requestFullscreen=()=>Promise.reject(Error('verification fullscreen disabled'));
  if(!localStorage.getItem('corogalism-settings'))localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:level,soundEnabled:audio,bgmVolume:.6,seVolume:.8}));
  if(records&&!localStorage.getItem('corogalism-run-bests-puzzle-v1-easy')){
   const best={rulesVersion:'puzzle-v1',stages:107,totalTimeMs:1600000,at:'2026-10-24T00:00:00.000Z'};
   localStorage.setItem('corogalism-run-bests-puzzle-v1-easy',JSON.stringify({noContinue:{...best,stages:25},withContinue:best}));
   localStorage.setItem('corogalism-run-bests-easy',JSON.stringify({withContinue:{...best,stages:108}}));
  }
  // 本物の音声出力を解析し、スピーカーだけ消音する。
  window.__musicStarts=[];
  window.__audioCapabilities={context:typeof window.AudioContext,node:typeof window.AudioNode,source:typeof window.AudioBufferSourceNode};
  if(typeof window.AudioNode==='undefined'||typeof window.AudioContext==='undefined'||typeof window.AudioBufferSourceNode==='undefined')return;
  const connect=AudioNode.prototype.connect,Audio=window.AudioContext;
  window.AudioContext=class extends Audio{
   constructor(){super();const analyser=this.createAnalyser(),mute=this.createGain();analyser.fftSize=2048;mute.gain.value=0;connect.call(analyser,mute);connect.call(mute,this.destination);window.__audioProbe={context:this,analyser,mute};}
  };
  AudioNode.prototype.connect=function(destination,...args){const p=window.__audioProbe;if(p&&destination===p.context.destination&&this!==p.mute)return connect.call(this,p.analyser,...args);return connect.call(this,destination,...args);};
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args){if(this.loop&&this.buffer?.duration>20)window.__musicStarts.push({offset:args[1]||0,loop:this.loop,duration:this.buffer.duration,when:args[0]});return start.apply(this,args);};
 },{audio,records,level});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 if(clock){await page.clock.install();await page.clock.pauseAt(Date.now()+1000);}
 active=page;
 await page.goto(new URL('?debug=1&seed=77',base).href);
 await page.evaluate(()=>document.fonts.ready);
 if(clock)await page.clock.runFor(64);
 await page.waitForFunction(()=>window.__corogalism&&document.querySelector('#screen-mode').dataset.artReady==='true');
 return {context,page,errors};
}
async function close(f){assert.deepEqual(f.errors,[]);await f.context.close();active=null;}
async function ready(p,audio=false){
 await p.waitForFunction(()=>window.__corogalism.state.screen==='game',null,{polling:50});
 await p.clock.runFor(32);
 const s=await state(p);await p.clock.runFor(s.prepareMs+s.countdownMs+100);
 assert.equal((await state(p)).prepareMs,0);
 assert.equal((await state(p)).countdownMs,0);
 if(audio){await p.clock.runFor(1100);await p.waitForFunction(()=>window.__corogalism.state.audio.musicDelaySec===0,null,{polling:50,timeout:15000});await p.clock.runFor(64);await p.waitForFunction(()=>window.__corogalism.state.audio.music,null,{polling:50,timeout:20000});}
}
async function next(p){
 await p.evaluate(()=>{const g=window.__corogalism.state.goal;window.__corogalism.teleport(g.x,g.y);});
 await p.clock.runFor(950);assert.equal((await state(p)).screen,'clear');
 assert.equal((await state(p)).audio.music,false);
 await p.clock.runFor(1400);await p.locator('#btn-next').click();await p.clock.runFor(32);
}
async function ui(){
 for(const [width,height]of [[390,780],[360,740],[312,780]]){
  const f=await fixture({width,height,records:true}),{page}=f;
  assert.equal(await page.locator('.badge').first().textContent(),'v'+version);
  assert.equal(await page.locator('#btn-puzzle-tutorial').isVisible(),false);
  assert.equal(await page.locator('#btn-floor-practice').isVisible(),false);
  assert.equal(await page.locator('#mode-records').getAttribute('open'),null);
  for(const level of ['normal','easy']){
   await page.locator(`#screen-mode .difficulty [data-level=${level}]`).click();
   const bounds=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight,title:getComputedStyle(document.querySelector('.menu-scene h2')).fontSize}));
   assert.ok(bounds.scrollWidth<=width&&bounds.scrollHeight<=height,JSON.stringify(bounds));
   assert.equal(bounds.title,'26px');
   await page.screenshot({path:`${out}/home-${width}-${level}.png`,fullPage:true});
   record('home',{width,height,level,bounds});
  }
  const saved=await page.evaluate(()=>localStorage.getItem('corogalism-run-bests-puzzle-v1-easy'));
  await page.locator('#mode-records summary').click();
  assert.match(await page.locator('#mode-best-continue').textContent(),/107/);
  assert.match(await page.locator('#mode-legacy').textContent(),/108/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('corogalism-run-bests-puzzle-v1-easy')),saved);
  await page.locator('#mode-records summary').click();
  await page.locator('#btn-guide').click();assert.equal(await page.locator('#play-guide').evaluate(d=>d.open),true);
  await page.locator('#play-guide .guide-close').click();
  await page.locator('#btn-mode-settings').click();assert.equal((await state(page)).screen,'settings');
  await page.locator('#btn-settings-close').click();assert.equal((await state(page)).screen,'mode');
  await page.locator('#btn-tutorial').click();assert.equal((await state(page)).screen,'tutorial-intro');
  await page.locator('#btn-tutorial-back').click();
  record('records-and-entries',{width,preservedSyntheticBest:107,legacy:108});
  await close(f);
 }
 const f=await fixture({clock:true}),{page}=f;
 await page.locator('#btn-practice').click();await ready(page);
 const before=(await state(page)).actor,b=await page.locator('#board').boundingBox();
 await page.mouse.move(b.x+b.width*.75,b.y+b.height*.6);await page.mouse.down();await page.clock.runFor(500);await page.mouse.up();
 const after=(await state(page)).actor;
 assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>.01);
 await page.locator('#btn-pause').click();assert.equal((await state(page)).paused,true);
 await page.locator('#btn-resume').click();assert.equal((await state(page)).paused,false);
 await page.locator('#btn-game-exit').click();assert.equal((await state(page)).screen,'mode');
 record('actual-practice-pointer',{before,after,pauseResume:true});
 await page.locator('#btn-tutorial').click();await page.locator('#btn-tutorial-start').click();await ready(page);
 assert.equal((await state(page)).gameMode,'tutorial');
 assert.ok((await state(page)).zones.some(z=>z.kind==='sand'));
 assert.ok((await state(page)).walls.some(w=>w.materialId==='rubber'));
 record('tutorial-start',{hp:(await state(page)).hp});
 await close(f);
}
async function music(){
 const f=await fixture({audio:true,clock:true}),{page}=f;
 await page.locator('#btn-challenge').click();
 const seen=new Set(),stop=Number(process.env.V080_MUSIC_STAGES||21);
 const rotating=process.env.ROTATING_MUSIC==='1';let remaining=new Set(['slide','force','puzzle']),lastRotating=null;
 for(let n=1;n<=stop;n++){
  assert.equal((await state(page)).audio.music,false,'countdown is silent');
  await ready(page,true);
  const s=await state(page),expected=await page.evaluate(async()=>{const m=await import('./src/audio/musicTracks.js');const s=window.__corogalism.state;return m.musicTrackForStage({theme:s.theme,puzzle:s.puzzle});});
  assert.equal(s.stageIndex,n);
  if(rotating&&['slide','force','puzzle'].includes(expected)){
   if(!remaining.size){remaining=new Set(['slide','force','puzzle']);assert.notEqual(s.audio.musicTrack,lastRotating);}
   assert.ok(remaining.has(s.audio.musicTrack),'rotating tracks must cover the bag');remaining.delete(s.audio.musicTrack);lastRotating=s.audio.musicTrack;
  }else assert.equal(s.audio.musicTrack,expected);
  const selected=s.audio.musicTrack;assert.equal(s.audio.requestedTrack,selected);
  await page.waitForFunction(()=>{const p=window.__audioProbe,v=new Float32Array(2048);p.analyser.getFloatTimeDomainData(v);return v.some(x=>Math.abs(x)>.001);},null,{polling:50});
  const played=await page.evaluate(()=>{const p=window.__audioProbe,v=new Float32Array(2048);p.analyser.getFloatTimeDomainData(v);return {rms:Math.sqrt(v.reduce((s,x)=>s+x*x,0)/v.length),last:window.__musicStarts.at(-1)};});
  assert.ok(played.rms>.0001,JSON.stringify(played));assert.equal(played.last.loop,true);assert.equal(played.last.offset,0);
  if(!seen.has(selected)){
   seen.add(selected);await page.screenshot({path:`${out}/music-${selected}.png`,fullPage:true});
   await page.locator('#btn-pause').click();await page.clock.runFor(180);assert.equal((await state(page)).audio.music,false);
   await page.locator('#btn-resume').click();await ready(page,true);assert.equal((await state(page)).audio.musicTrack,selected);
  }
  record('stage-music',{stage:n,theme:s.theme.id,puzzle:s.puzzle?.kind,baseline:expected,track:selected,audio:played});
  if(n<stop)await next(page);
 }
 assert.deepEqual([...seen].sort(),['default','force','puzzle','rest','slide']);
 const finalTrack=(await state(page)).audio.musicTrack;
 await page.locator('#btn-sound').click();assert.equal((await state(page)).audio.music,false);
 await page.locator('#btn-sound').click();await page.clock.runFor(32);assert.equal((await state(page)).audio.musicTrack,finalTrack);
 record('five-tracks-pause-mute',{tracks:[...seen]});
 await close(f);
}
async function offline(){
 const f=await fixture({workers:'allow',audio:true}),{page,context}=f;
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const cache=await page.evaluate(async()=>{const name=(await caches.keys()).find(n=>n.startsWith('corogalism-'));return {name,keys:(await(await caches.open(name)).keys()).map(r=>new URL(r.url).pathname)};});
 assert.equal(cache.keys.length,Number(process.env.PRECACHE_COUNT||129));for(const key of ['home.css','src/ui/homeDecoration.js','assets/audio/bgm-rest.wav','assets/audio/bgm-puzzle.wav'])assert.ok(cache.keys.some(k=>k.endsWith('/'+key)));
 await context.setOffline(true);await page.reload();await page.waitForFunction(()=>document.querySelector('#screen-mode').dataset.artReady==='true');
 await page.clock.install();await page.clock.pauseAt(Date.now()+1000);await page.clock.runFor(32);
 await page.locator('#btn-challenge').click();await ready(page,true);
 const seen=new Set();
 for(let n=1;n<=17;n++){
  if(n>1)await ready(page,true);
  const s=await state(page);seen.add(s.audio.musicTrack);
  if(n<17)await next(page);
 }
 assert.deepEqual([...seen].sort(),['default','force','puzzle','rest','slide']);
 record('offline-all-five-music',{cache:cache.name,files:cache.keys.length,tracks:[...seen]});
 await close(f);
}
try{if(phase==='ui')await ui();else if(phase==='music')await music();else if(phase==='offline')await offline();else throw Error('unknown phase');}
catch(error){rows.push({name:'failure',error:String(error),state:active&&!active.isClosed()?await state(active).catch(()=>null):null});if(active&&!active.isClosed())await active.screenshot({path:`${out}/failure.png`,fullPage:true});throw error;}
finally{await writeFile(`${out}/results-${phase}.json`,JSON.stringify({base,version,phase,rows},null,2)+'\n');await browser.close();}
