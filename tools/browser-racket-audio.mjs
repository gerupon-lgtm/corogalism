/** 実AudioContextでの音源開始・停止を確認。音の好みや実機音質の評価ではない。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8771/',output=process.env.RACKET_AUDIO_OUTPUT||'docs/verification/racket-lab/audio';
await mkdir(output,{recursive:true});const rows=[];
async function fixture(unsupported=false){
 const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2.625,serviceWorkers:'block'});
 await context.addInitScript(unsupported=>{
  Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});Element.prototype.requestFullscreen=()=>Promise.reject(Error('test fullscreen rejection'));
  window.__audioStarts=[];window.__audioStops=[];
  if(unsupported){Object.defineProperty(window,'AudioContext',{value:undefined});Object.defineProperty(window,'webkitAudioContext',{value:undefined});return;}
  const create=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){
   const source=create.call(this),start=source.start.bind(source),stop=source.stop.bind(source),audio=this;
   source.start=(...args)=>{
    const data=source.buffer.getChannelData(0);let sum=0,count=0;for(let i=0;i<data.length;i+=Math.max(1,Math.floor(data.length/1024))){sum+=data[i]**2;count++;}
    window.__audioStarts.push({loop:source.loop,length:source.buffer.length,sampleRate:source.buffer.sampleRate,currentTime:audio.currentTime,rms:Math.sqrt(sum/count)});return start(...args);
   };
   source.stop=(...args)=>{window.__audioStops.push({loop:source.loop,currentTime:audio.currentTime});return stop(...args);};return source;
  };
 },unsupported);
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'racket-lab.html?debug=1');await page.waitForFunction(()=>!!window.__racketLab);await page.evaluate(()=>document.fonts.ready);
 const state=()=>page.evaluate(()=>window.__racketLab.state);
 if(!(await state()).sound.enabled)await page.locator('#sound').click();await page.locator('#reset').click();
 const pointer=async(x,y,ms)=>{
  await page.locator('#board').scrollIntoViewIfNeeded();const box=await page.locator('#board').boundingBox();
  await page.mouse.move(box.x+box.width*(.5+x/2),box.y+box.height*(.5+y/2));await page.mouse.down();await page.waitForTimeout(ms);await page.mouse.up();
 };
 return {context,page,errors,state,pointer};
}
try{
 const f=await fixture(),{context,page,errors,state,pointer}=f;
 await page.waitForFunction(()=>window.__racketLab.state.sound.context==='running');
 await pointer(.6,0,450);await page.waitForTimeout(40);const rolling=await state();
 assert.equal(rolling.sound.rolling,true);assert.ok(rolling.sound.events.includes('roll:default:ice'));assert.ok(rolling.actor.x>.55);
 const rollSources=await page.evaluate(()=>window.__audioStarts.filter(s=>s.loop));assert.ok(rollSources.some(s=>s.length===88200&&s.rms>0),'実音源で氷上のビー玉の転がり音を開始する');
 await page.locator('#layout').selectOption('practice');await page.waitForTimeout(120);
 // 接触前の配置だけをデバッグで用意し、以後は実pointerと実時間で衝突させる。
 await page.evaluate(()=>{const lab=window.__racketLab,w=lab.state.rackets.find(w=>w.axis==='y');lab.teleport(w.x-lab.state.actor.r-.45,w.y+w.h/2);});
 await pointer(.8,0,400);await page.waitForTimeout(40);const racket=await state();
 assert.ok(racket.racketHits>0);assert.ok(racket.sound.events.includes('hit:default:rubber'));
 const impactSources=await page.evaluate(()=>window.__audioStarts.filter(s=>!s.loop));assert.ok(impactSources.some(s=>s.length===11025&&s.rms>0),'ラケット衝突で実音源を開始する');
 await page.waitForTimeout(150);await page.evaluate(()=>{const lab=window.__racketLab,a=lab.state.stage.labAnchors.cottonBrake;lab.teleport(a.x,a.y);});
 await pointer(.8,0,400);await page.waitForTimeout(40);const cotton=await state();assert.ok(cotton.sound.events.includes('hit:default:cotton'));
 const cottonSources=await page.evaluate(()=>window.__audioStarts.filter(s=>!s.loop&&s.length===2646));assert.ok(cottonSources.some(s=>s.rms>0),'綿接触で120msの実音源を開始する');
 await page.evaluate(()=>window.__racketLab.teleport(2.5,.75,3,0));await page.waitForFunction(()=>window.__racketLab.state.sound.rolling);
 await page.locator('#sound').click();const muted=await state(),mutedSources=await page.evaluate(()=>window.__audioStarts.length);assert.equal(muted.sound.enabled,false);assert.equal(muted.sound.rolling,false);
 await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__audioStarts.length),mutedSources);assert.deepEqual((await state()).sound.events,muted.sound.events);
 await page.locator('#sound').click();await page.evaluate(()=>window.__racketLab.teleport(2.5,.75,3,0));await page.waitForFunction(()=>window.__racketLab.state.sound.rolling);
 await page.locator('#pause').click();const paused=await state();assert.equal(paused.paused,true);assert.equal(paused.sound.rolling,false);assert.equal(paused.sound.voices,0);
 await page.waitForTimeout(250);assert.deepEqual((await state()).actor,paused.actor);
 await page.locator('#pause').click();await page.evaluate(()=>window.__racketLab.teleport(2.5,.75,3,0));await page.waitForFunction(()=>window.__racketLab.state.sound.rolling);
 await page.evaluate(()=>dispatchEvent(new Event('blur')));const blurred=await state();assert.equal(blurred.paused,true);assert.equal(blurred.sound.rolling,false);assert.equal(blurred.sound.voices,0);
 const emitted=await page.evaluate(()=>({starts:window.__audioStarts,stops:window.__audioStops}));assert.ok(emitted.stops.some(s=>s.loop));assert.deepEqual(errors,[]);
 rows.push({actualAudioContext:true,realTime:true,pointerRolling:true,impactSetup:'debug placement followed by actual pointer',rolling:rolling.sound,racket:{hits:racket.racketHits,sound:racket.sound},cotton:cotton.sound,muteStops:true,pauseStops:true,blurStops:true,emitted,errors});
 console.log('PASS racket actual audio: rolling/racket/cotton, mute/pause/blur stop');await context.close();
 const unsupported=await fixture(true);await unsupported.pointer(.6,0,450);const unsupportedState=await unsupported.state();
 assert.equal(unsupportedState.sound.failed,true);assert.equal(unsupportedState.sound.context,'none');assert.equal(unsupportedState.sound.rolling,false);assert.ok(unsupportedState.actor.x>.55);
 assert.equal(await unsupported.page.locator('#sound-note').isVisible(),true);assert.equal(unsupportedState.lastHalt,null);assert.deepEqual(unsupported.errors,[]);
 await unsupported.page.screenshot({path:output+'/audio-unsupported-412.png',fullPage:true});rows.push({unsupported:true,movement:unsupportedState.actor,sound:unsupportedState.sound,visibleNote:true,errors:unsupported.errors});
 console.log('PASS racket audio unsupported: visible note, movement continues');await unsupported.context.close();
}finally{await writeFile(output+'/results.json',JSON.stringify(rows,null,2)+'\n');await browser.close();}
