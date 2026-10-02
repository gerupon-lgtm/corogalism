import test from 'node:test';
import assert from 'node:assert/strict';
import {BALL_MATERIALS,getBallMaterial} from '../src/world/ballMaterials.js';
import {createBallLabStage,BALL_LAB_FLOORS,BALL_LAB_WALLS} from '../src/lab/ballLabStage.js';
import {createActor} from '../src/world/stage.js';
import {stepPhysics} from '../src/physics/integrator.js';
import {resolveParams} from '../src/physics/resolveParams.js';
import {BASE,TUNING} from '../src/config/gameConfig.js';
import {MATERIALS} from '../src/world/materials.js';
import {checkReachability} from '../src/maze/validator.js';
import {createRollingBuffer,createImpactBuffer} from '../src/audio/ballMaterialAudio.js';
const step=(actor,stage,tilt={x:0,y:0})=>stepPhysics({actor,stage,tilt,base:BASE,dt:1/120});
test('金属は初動が鈍く、水平で勢いが残り、スポンジは速く止まる',()=>{
 const stage=createBallLabStage(),actors={};
 for(const id of ['metal','default','sponge']){
  const a=createActor(stage.maze,getBallMaterial(id));actors[id]=a;
  for(let i=0;i<18;i++)step(a,stage,{x:.5,y:0});
 }
 assert.ok(actors.metal.vx<actors.default.vx);assert.ok(actors.sponge.vx>actors.metal.vx);
 for(const a of Object.values(actors)){a.vx=2;for(let i=0;i<72;i++)step(a,stage);}
 assert.ok(actors.metal.vx>1.4);assert.ok(actors.default.vx<.5);assert.ok(actors.sponge.vx<.05);
 for(let i=0;i<12;i++)step(actors.metal,stage,{x:-.2,y:0});assert.ok(actors.metal.vx>0,'逆へ傾けても即反転しない');
});
test('素材による力場の初動と反発が異なる、既存の係数は維持',()=>{
 const stage=createBallLabStage({floor:'gravity'}),vel={};
 for(const id of ['metal','wood','sponge']){
  const a=createActor(stage.maze,getBallMaterial(id));a.x=3.5;
  for(let i=0;i<10;i++)step(a,stage);vel[id]=a.vx;
 }
 assert.ok(vel.sponge>vel.wood&&vel.wood>vel.metal);
 const metal=resolveParams({base:BASE,character:getBallMaterial('metal'),material:MATERIALS.default});
 const rubber=resolveParams({base:BASE,character:getBallMaterial('superball'),material:MATERIALS.default});
 const sponge=resolveParams({base:BASE,character:getBallMaterial('sponge'),material:MATERIALS.default});
 assert.ok(rubber.restitution>.9&&rubber.restitution<1);assert.ok(metal.restitution>sponge.restitution);
 assert.deepEqual(resolveParams({base:BASE,character:getBallMaterial('default')}),{accel:17,friction:2.5,restitution:.35,forceX:0,forceY:0});
});
test('全240組合せで到達性・同じ球径・有限値・速度上限・盤内を維持',()=>{
 for(const layout of ['plaza','maze'])for(const floor of Object.keys(BALL_LAB_FLOORS))for(const wall of Object.keys(BALL_LAB_WALLS))for(const id of Object.keys(BALL_MATERIALS)){
  const stage=createBallLabStage({layout,floor,wall}),a=createActor(stage.maze,getBallMaterial(id));
  assert.equal(checkReachability(stage.maze).ok,true);assert.equal(a.r,.275);
  for(let i=0;i<360;i++){
   step(a,stage,{x:Math.sin(i/45),y:Math.cos(i/43)});
   assert.ok([a.x,a.y,a.vx,a.vy].every(Number.isFinite));
   assert.ok(a.x>=a.r&&a.y>=a.r&&a.x<=7-a.r&&a.y<=7-a.r);
   assert.ok(Math.hypot(a.vx,a.vy)<=Math.min(a.character.maxSpeed??TUNING.maxSpeed,TUNING.maxSpeed)+1e-8);
  }
 }
});
const context={createBuffer(_channels,n,sampleRate){const data=new Float32Array(n);return {sampleRate,length:n,getChannelData:()=>data}}};
const rms=b=>Math.sqrt(b.getChannelData(0).reduce((sum,x)=>sum+x*x,0)/b.length);
test('転がり音は全素材と床で有限、金属には低域、壁ごとに衝突の響きを変える',()=>{
 for(const id of Object.keys(BALL_MATERIALS))for(const floor of ['normal','ice','sand']){
  const b=createRollingBuffer(context,id,floor);assert.ok(rms(b)>.001);
  assert.ok(b.getChannelData(0).every(v=>Number.isFinite(v)&&Math.abs(v)<1));
 }
 const metal=createRollingBuffer(context,'metal'),marble=createRollingBuffer(context,'default');
 const energy=b=>{let s=0,c=0;for(const [i,x]of b.getChannelData(0).entries()){s+=x*Math.sin(2*Math.PI*74*i/b.sampleRate);c+=x*Math.cos(2*Math.PI*74*i/b.sampleRate)}return Math.hypot(s,c)*2/b.length};
 assert.ok(energy(metal)>energy(marble)*10);assert.ok(rms(metal)>rms(createRollingBuffer(context,'sponge'))*3);
 assert.ok(rms(createImpactBuffer(context,'metal','stone'))>rms(createImpactBuffer(context,'metal','cork'))*2);
 for(const id of Object.keys(BALL_MATERIALS))for(const wall of Object.keys(BALL_LAB_WALLS))assert.ok(createImpactBuffer(context,id,wall).getChannelData(0).every(v=>Number.isFinite(v)&&Math.abs(v)<1));
});
