import {execFileSync} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {BALL_LAB_AUDIO} from '../src/config/gameConfig.js';
const prior=execFileSync('git',['-c','safe.directory=C:/Users/user/Documents/AI連携ゲーム/corogalism','show','e474c1a:src/audio/ballMaterialAudio.js'],{encoding:'utf8'}).replace(/import[^;]+;/,`const BALL_LAB_AUDIO=${JSON.stringify(BALL_LAB_AUDIO)};`);
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const output=process.env.METAL_OUTPUT||'docs/verification/metal-roll';await mkdir(output+'/samples',{recursive:true});const rows=[];
try{const p=await browser.newPage({serviceWorkers:'block'}),failures=[];
 p.on('requestfailed',r=>failures.push({url:r.url(),failure:r.failure()}));p.on('pageerror',e=>failures.push({error:e.message}));
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:8767/')+'ball-lab.html?debug=1');
 await p.waitForFunction(()=>!!window.__ballLab).catch(e=>{console.error(JSON.stringify(failures));throw e});
 for(const floor of ['normal','ice','sand'])for(const before of [true,false]){
  const values=await p.evaluate(async({floor,before,prior})=>{
   const old=before?await import(URL.createObjectURL(new Blob([prior],{type:'text/javascript'}))):null;
   const audio=old||await import('/src/audio/ballMaterialAudio.js'),{BALL_LAB_AUDIO:A}=await import('/src/config/gameConfig.js');
   const rate=22050,c=new OfflineAudioContext(1,rate*8,rate),output=c.createGain(),compressor=c.createDynamicsCompressor(),source=c.createBufferSource(),gain=c.createGain();
   output.gain.value=.6;compressor.threshold.value=-16;compressor.ratio.value=8;output.connect(compressor);compressor.connect(c.destination);
   source.buffer=audio.createRollingBuffer(c,'metal',floor);source.loop=true;source.playbackRate.value=.7+3/7*.6;
   const target=A.rollingGain*.8*Math.pow((3-A.rollingMinSpeed)/(A.rollingFullSpeed-A.rollingMinSpeed),.8);
   gain.gain.setValueAtTime(0,0);gain.gain.linearRampToValueAtTime(target,.06);gain.gain.setValueAtTime(target,7.94);gain.gain.linearRampToValueAtTime(0,8);
   source.connect(gain);gain.connect(output);source.start();return Array.from((await c.startRendering()).getChannelData(0));
  },{floor,before,prior});
  const peak=values.reduce((a,v)=>Math.max(a,Math.abs(v)),0);assert.ok(peak>0&&peak<1);
  const wave=Buffer.alloc(44+values.length*2);wave.write('RIFF',0);wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(22050,24);wave.writeUInt32LE(44100,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(values.length*2,40);
  for(let i=0;i<values.length;i++)wave.writeInt16LE(Math.round(values[i]*32767),44+i*2);
  const name=`metal-${floor}-${before?'before':'after'}.wav`;await writeFile(output+'/samples/'+name,wave);rows.push({name,peak,seconds:8,speed:3,volume:.6});console.log('PASS rendered '+name);
 }
}finally{await writeFile(output+'/render.json',JSON.stringify(rows,null,2)+'\n');await browser.close()}
