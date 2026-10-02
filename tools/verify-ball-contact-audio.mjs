import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {BALL_MATERIALS} from '../src/world/ballMaterials.js';
import {CHARACTERS} from '../src/world/characters.js';
import {BALL_LAB_AUDIO,BALL_LAB_BOUNCE} from '../src/config/gameConfig.js';
import {createRollingBuffer,createImpactBuffer} from '../src/audio/ballMaterialAudio.js';
const old=file=>execFileSync('git',['-c','safe.directory=C:/Users/user/Documents/AI連携ゲーム/corogalism','show','102bb53:'+file],{encoding:'utf8'});
const load=code=>import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const previous=await load(old('src/audio/ballMaterialAudio.js').replace(/import[^;]+;/,`const BALL_LAB_AUDIO=${JSON.stringify(BALL_LAB_AUDIO)};`));
const balls=await load(old('src/world/ballMaterials.js').replace(/import[^;]+;/,`const CHARACTERS=${JSON.stringify(CHARACTERS)};`).replace(/import[^;]+;/,`const BALL_LAB_BOUNCE=${JSON.stringify(BALL_LAB_BOUNCE)};`));
for(const id of Object.keys(BALL_MATERIALS)){
 const {hint:ignoredBefore,...before}=balls.BALL_MATERIALS[id],{hint:ignoredAfter,...after}=BALL_MATERIALS[id];
 assert.deepEqual(after,before,`${id}: 物理の値は維持`);
}
const context={createBuffer(_channels,n,sampleRate){const data=new Float32Array(n);return {length:n,sampleRate,getChannelData:()=>data}}};
const hash=b=>createHash('sha256').update(Buffer.from(b.getChannelData(0).buffer)).digest('hex');
const impacts=[];
for(const kind of Object.keys(BALL_MATERIALS))for(const wall of ['default','rubber','stone','cork']){
 const prior=hash(previous.createImpactBuffer(context,kind,wall)),current=hash(createImpactBuffer(context,kind,wall));assert.equal(current,prior);
 impacts.push({kind,wall,sha256:current,unchanged:true});
}
const rolling=[];
for(const kind of Object.keys(BALL_MATERIALS))for(const floor of ['normal','ice','sand']){
 const buffer=createRollingBuffer(context,kind,floor);
 if(!buffer){rolling.push({kind,floor,silent:true});continue;}
 const data=buffer.getChannelData(0);let sum=0,low=0,loSum=0,highLow=0,hiSum=0,zeros=0,peak=0;
 for(const v of data){sum+=v*v;low=.98*low+.02*v;loSum+=low*low;highLow=.84*highLow+.16*v;hiSum+=(v-highLow)**2;zeros+=Number(v===0);peak=Math.max(peak,Math.abs(v));}
 rolling.push({kind,floor,silent:false,rms:Math.sqrt(sum/data.length),peak,lowFraction:Math.sqrt(loSum/sum),highFraction:Math.sqrt(hiSum/sum),silentFraction:zeros/data.length,sha256:hash(buffer)});
}
const output=process.env.CONTACT_OUTPUT||'docs/verification/ball-contact-audio';await mkdir(output,{recursive:true});
await writeFile(output+'/comparison.json',JSON.stringify({baseline:'102bb53',physicsUnchanged:true,impacts,rolling},null,2)+'\n');
console.log('PASS unchanged physics and 20 impact PCM buffers');console.log(JSON.stringify(rolling,null,2));
