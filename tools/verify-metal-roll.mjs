import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {BALL_LAB_AUDIO} from '../src/config/gameConfig.js';
import {createRollingBuffer,createImpactBuffer} from '../src/audio/ballMaterialAudio.js';
const baseline='e474c1a',old=file=>execFileSync('git',['-c','safe.directory=C:/Users/user/Documents/AI連携ゲーム/corogalism','show',baseline+':'+file],{encoding:'utf8'});
const code=old('src/audio/ballMaterialAudio.js').replace(/import[^;]+;/,`const BALL_LAB_AUDIO=${JSON.stringify(BALL_LAB_AUDIO)};`);
const before=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const context={createBuffer(_channels,n,sampleRate){const data=new Float32Array(n);return {length:n,sampleRate,getChannelData:()=>data}}};
const hash=b=>b?createHash('sha256').update(Buffer.from(b.getChannelData(0).buffer)).digest('hex'):null;
const unchangedFiles=['src/physics/integrator.js','src/physics/resolveParams.js','src/physics/collision.js','src/config/gameConfig.js','src/world/ballMaterials.js'];
for(const file of unchangedFiles)assert.equal((await readFile(file,'utf8')).replaceAll('\r\n','\n'),old(file).replaceAll('\r\n','\n'));
const impacts=[],otherRolling=[];
for(const kind of ['metal','default','wood','superball','sponge'])for(const wall of ['default','rubber','stone','cork']){
 const previous=hash(before.createImpactBuffer(context,kind,wall)),current=hash(createImpactBuffer(context,kind,wall));assert.equal(current,previous);impacts.push({kind,wall,sha256:current});
}
for(const kind of ['default','wood','superball','sponge'])for(const floor of ['normal','ice','sand']){
 const previous=hash(before.createRollingBuffer(context,kind,floor)),current=hash(createRollingBuffer(context,kind,floor));assert.equal(current,previous);otherRolling.push({kind,floor,sha256:current});
}
function stats(buffer,speed=1){
 const data=buffer.getChannelData(0),n=Math.floor(data.length/speed),window=Math.round(buffer.sampleRate*.02),levels=[];let energy=0,peak=0;
 for(let start=0;start+window<=n;start+=window){let sum=0;
  for(let i=0;i<window;i++){const x=(start+i)*speed,lo=Math.floor(x),f=x-lo,v=data[lo]*(1-f)+data[(lo+1)%data.length]*f;sum+=v*v;peak=Math.max(peak,Math.abs(v));}
  energy+=sum;levels.push(Math.sqrt(sum/window));
 }
 const mean=levels.reduce((a,b)=>a+b)/levels.length,variation=Math.sqrt(levels.reduce((sum,v)=>sum+(v-mean)**2,0)/levels.length)/mean;
 return {rms:Math.sqrt(energy/(levels.length*window)),peak,variation};
}
const rolling=[];
for(const floor of ['normal','ice','sand'])for(const playbackRate of [.7,1,1.3]){
 const previous=stats(before.createRollingBuffer(context,'metal',floor),playbackRate),current=stats(createRollingBuffer(context,'metal',floor),playbackRate);
 assert.ok(current.variation<.3);assert.ok(current.variation<previous.variation*.5);assert.ok(Math.abs(current.rms/previous.rms-1)<.1,'音量をほぼ維持した比較');
 rolling.push({floor,playbackRate,before:previous,after:current});
}
const output=process.env.METAL_OUTPUT||'docs/verification/metal-roll';await mkdir(output,{recursive:true});
await writeFile(output+'/comparison.json',JSON.stringify({baseline,unchangedFiles,impacts,otherRolling,rolling},null,2)+'\n');
console.log('PASS 5 physics/config files, 20 impact PCM and 12 other rolling states unchanged');console.log(JSON.stringify(rolling,null,2));
