import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {BALL_LAB_AUDIO} from '../src/config/gameConfig.js';
import {createImpactBuffer,createRollingBuffer} from '../src/audio/ballMaterialAudio.js';
const baseline='a913759',old=file=>execFileSync('git',['-c','safe.directory=C:/Users/user/Documents/AI連携ゲーム/corogalism','show',baseline+':'+file],{encoding:'utf8'});
const prior=old('src/audio/ballMaterialAudio.js').replace(/import[^;]+;/,`const BALL_LAB_AUDIO=${JSON.stringify(BALL_LAB_AUDIO)};`);
const previous=await import('data:text/javascript;base64,'+Buffer.from(prior).toString('base64'));
const context={createBuffer(_channels,n,sampleRate){const data=new Float32Array(n);return {length:n,sampleRate,getChannelData:()=>data}}},hash=b=>b?createHash('sha256').update(Buffer.from(b.getChannelData(0).buffer)).digest('hex'):null;
const unchangedFiles=['src/physics/integrator.js','src/physics/resolveParams.js','src/physics/collision.js','src/config/gameConfig.js','src/world/ballMaterials.js'];
for(const file of unchangedFiles)assert.equal((await readFile(file,'utf8')).replaceAll('\r\n','\n'),old(file).replaceAll('\r\n','\n'));
function stats(b){const data=b.getChannelData(0);let energy=0,late=0,peak=0,total=0,t99=0;for(let i=0;i<data.length;i++){energy+=data[i]**2;if(i>=b.sampleRate*.06)late+=data[i]**2;peak=Math.max(peak,Math.abs(data[i]));}for(let i=0;i<data.length;i++){total+=data[i]**2;if(total>=energy*.99){t99=i/b.sampleRate;break;}}return {peak,lateFraction:late/energy,t99Ms:t99*1000};}
const impacts=[],rolling=[];
for(const kind of ['metal','wood','default','superball','sponge'])for(const wall of ['default','rubber','stone','cork']){
 const a=previous.createImpactBuffer(context,kind,wall),b=createImpactBuffer(context,kind,wall),unchanged=hash(a)===hash(b);
 assert.equal(unchanged,kind!=='wood');if(kind==='wood')assert.ok(stats(b).lateFraction<.001);
 impacts.push({kind,wall,unchanged,before:stats(a),after:stats(b),sha256:hash(b)});
}
for(const kind of ['metal','wood','default','superball','sponge'])for(const floor of ['normal','ice','sand']){const before=hash(previous.createRollingBuffer(context,kind,floor)),after=hash(createRollingBuffer(context,kind,floor));assert.equal(after,before);rolling.push({kind,floor,sha256:after});}
const output=process.env.WOOD_OUTPUT||'docs/verification/wood-knock';await mkdir(output+'/samples',{recursive:true});
await writeFile(output+'/comparison.json',JSON.stringify({baseline,unchangedFiles,impacts,rolling},null,2)+'\n');
console.log('PASS wood 4 sounds changed; other 16 impacts, all 15 rolling states and physics unchanged');console.log(JSON.stringify(impacts.filter(r=>r.kind==='wood'),null,2));
if(process.env.PLAYWRIGHT_MODULE){
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{const p=await browser.newPage({serviceWorkers:'block'});await p.goto((process.env.BASE_URL||'http://127.0.0.1:8767/')+'ball-lab.html?debug=1');await p.waitForFunction(()=>!!window.__ballLab);
  for(const before of [true,false]){
   const values=await p.evaluate(async({before,prior})=>{
    const audio=before?await import(URL.createObjectURL(new Blob([prior],{type:'text/javascript'}))):await import('/src/audio/ballMaterialAudio.js');
    const rate=22050,c=new OfflineAudioContext(1,rate*3.5,rate),volume=c.createGain(),compressor=c.createDynamicsCompressor();volume.gain.value=.6;compressor.threshold.value=-16;compressor.ratio.value=8;volume.connect(compressor);compressor.connect(c.destination);
    for(const [i,wall]of ['default','rubber','stone','cork'].entries()){const source=c.createBufferSource(),gain=c.createGain();source.buffer=audio.createImpactBuffer(c,'wood',wall);gain.gain.value=.12+Math.sqrt(3/8)*.65;source.connect(gain);gain.connect(volume);source.start(.4+i*.8);}
    return Array.from((await c.startRendering()).getChannelData(0));
   },{before,prior});
   const peak=values.reduce((a,v)=>Math.max(a,Math.abs(v)),0);assert.ok(peak>0&&peak<1);
   const wave=Buffer.alloc(44+values.length*2);wave.write('RIFF',0);wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(22050,24);wave.writeUInt32LE(44100,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(values.length*2,40);for(let i=0;i<values.length;i++)wave.writeInt16LE(Math.round(values[i]*32767),44+i*2);
   await writeFile(output+'/samples/wood-'+(before?'before':'after')+'.wav',wave);console.log('PASS rendered wood '+(before?'before':'after')+', peak '+peak.toFixed(3));
  }
 }finally{await browser.close();}
}
