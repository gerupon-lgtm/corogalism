import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {BALL_MATERIALS} from '../src/world/ballMaterials.js';
import {CHARACTERS} from '../src/world/characters.js';
import {createBallLabStage} from '../src/lab/ballLabStage.js';
import {createActor} from '../src/world/stage.js';
import {stepPhysics} from '../src/physics/integrator.js';
import {BASE} from '../src/config/gameConfig.js';
import {createRollingBuffer,createImpactBuffer} from '../src/audio/ballMaterialAudio.js';
const old=file=>execFileSync('git',['-c','safe.directory=C:/Users/user/Documents/AI連携ゲーム/corogalism','show','81627e8:'+file],{encoding:'utf8'});
const load=code=>import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const previous=await load(old('src/world/ballMaterials.js').replace(/import[^;]+;/,`const CHARACTERS=${JSON.stringify(CHARACTERS)};`));
const audioBefore=await load(old('src/audio/ballMaterialAudio.js').replace(/import[^;]+;/,'const BALL_LAB_AUDIO={rollingGain:.25};'));
const rows=[];
for(const before of [true,false])for(const id of ['superball','wood','sponge','metal'])for(const held of [false,true]){
 const stage=createBallLabStage({wall:'rubber'}),actor=createActor(stage.maze,(before?previous.BALL_MATERIALS:BALL_MATERIALS)[id]);actor.x=3.5;actor.vx=6;
 const bounces=[];let restingContacts=0;
 for(let i=0;i<1440;i++){
  const contacts=[];stepPhysics({actor,stage,tilt:{x:held?1:0,y:0},base:BASE,dt:1/120,onImpact:speed=>contacts.push({speed,incoming:actor.vx})});
  for(const c of contacts)if(actor.vx*c.incoming<0){if(bounces.length<30)bounces.push({t:i/120,incoming:c.speed,outgoing:Math.abs(actor.vx),x:actor.x})}else restingContacts++;
 }
 rows.push({before,id,held,bounces,restingContacts,end:{x:actor.x,vx:actor.vx}});
}
const context={createBuffer(_channels,n,sampleRate){const data=new Float32Array(n);return {length:n,sampleRate,getChannelData:()=>data}}};
const hash=b=>createHash('sha256').update(Buffer.from(b.getChannelData(0).buffer)).digest('hex');
const impacts=[];
for(const kind of Object.keys(BALL_MATERIALS))for(const wall of ['default','rubber','stone','cork']){
 const prior=hash(audioBefore.createImpactBuffer(context,kind,wall)),current=hash(createImpactBuffer(context,kind,wall));assert.equal(current,prior);
 impacts.push({kind,wall,sha256:current,unchanged:true});
}
const tones=[];
for(const before of [true,false])for(const kind of ['metal','wood','superball']){
 const buffer=(before?audioBefore.createRollingBuffer:createRollingBuffer)(context,kind);
 if(!buffer){tones.push({before,kind,silent:true});continue;}
 const data=buffer.getChannelData(0),rms=Math.sqrt(data.reduce((sum,x)=>sum+x*x,0)/data.length);let peak=0;
 for(let hz=40;hz<=450;hz+=2){let s=0,c=0;for(let i=0;i<data.length;i++){const a=2*Math.PI*hz*i/buffer.sampleRate;s+=data[i]*Math.sin(a);c+=data[i]*Math.cos(a)}peak=Math.max(peak,Math.hypot(s,c)*2/data.length)}
 tones.push({before,kind,rms,dominantToneRatio:peak/rms});
}
const output=process.env.FEEL_VERIFY_OUTPUT||'docs/verification/ball-feel';await mkdir(output,{recursive:true});await writeFile(output+'/comparison.json',JSON.stringify({rows,impacts,tones},null,2));
for(const r of rows.filter(r=>!r.before))console.log(JSON.stringify({id:r.id,held:r.held,bounces:r.bounces.slice(0,5),end:r.end}));
console.log('PASS impact PCM unchanged: '+impacts.length);console.log(JSON.stringify(tones));
