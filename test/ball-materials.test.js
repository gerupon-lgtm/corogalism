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
 assert.ok(actors.metal.vx>1.4);assert.ok(actors.default.vx<.5);assert.ok(actors.sponge.vx<.25);
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
test('弱い接触では跳ね返りが収まり、最初の強いゴム球の反発は保つ',()=>{
 const stage=createBallLabStage({wall:'rubber'});
 for(const id of ['superball','wood','sponge']){
  const a=createActor(stage.maze,getBallMaterial(id));a.x=6.604;a.vx=.3;
  step(a,stage);assert.equal(a.vx,0,`${id}: 微小接触で振動しない`);
 }
 const bounce=speed=>{const a=createActor(stage.maze,getBallMaterial('superball'));a.x=6.604;a.vx=speed;step(a,stage);return -a.vx/speed};
 assert.ok(bounce(5)>.9,'最初の勢いは維持');assert.ok(bounce(1.5)<.6,'弱くなった反発は減衰');
});
test('木とスポンジは入力を離しても急停止せず、素材の順に滑らかに減速する',()=>{
 const stage=createBallLabStage(),vel={};
 for(const id of ['wood','sponge']){
  const a=createActor(stage.maze,getBallMaterial(id));a.vx=2;
  for(let i=0;i<42;i++)step(a,stage);vel[id]=a.vx;
 }
 assert.ok(vel.wood>.8&&vel.wood<1.5);assert.ok(vel.sponge>.35&&vel.sponge<vel.wood);
});
test('転がり音は一定音程の持続音を主成分にしない',()=>{
 for(const id of ['metal','wood','default']){
  const b=createRollingBuffer(context,id),data=b.getChannelData(0);let peak=0;
  for(let hz=40;hz<=450;hz+=2){let s=0,c=0;for(let i=0;i<data.length;i++){const angle=2*Math.PI*hz*i/b.sampleRate;s+=data[i]*Math.sin(angle);c+=data[i]*Math.cos(angle)}peak=Math.max(peak,Math.hypot(s,c)*2/data.length)}
  assert.ok(peak/rms(b)<.35,`${id}: 固定音程が目立たない`);
 }
});
test('柔らかい球は床によらず転がり音を持たず、衝突音は残す',()=>{
 for(const id of ['superball','sponge'])for(const floor of ['normal','ice','sand']){
  assert.equal(createRollingBuffer(context,id,floor),null,`${id}/${floor}: 転がるだけでは鳴らさない`);
  assert.ok(rms(createImpactBuffer(context,id,'rubber'))>.001);
 }
});
test('硬い球は金属の低域、木の乾いた接触、ガラスの細かな高域を分ける',()=>{
 for(const id of ['metal','wood','default'])for(const floor of ['normal','ice','sand']){
  const b=createRollingBuffer(context,id,floor);assert.ok(rms(b)>.001);
  assert.ok(b.getChannelData(0).every(v=>Number.isFinite(v)&&Math.abs(v)<1));
 }
 const metal=createRollingBuffer(context,'metal'),marble=createRollingBuffer(context,'default');
 const lowRms=b=>{let low=0,sum=0;for(const x of b.getChannelData(0)){low=.98*low+.02*x;sum+=low*low}return Math.sqrt(sum/b.length)};
 assert.ok(lowRms(metal)>lowRms(marble)*2);
 const highFraction=b=>{let low=0,sum=0;for(const x of b.getChannelData(0)){low=.84*low+.16*x;sum+=(x-low)**2}return Math.sqrt(sum/b.length)/rms(b)};
 const wood=createRollingBuffer(context,'wood');
 assert.ok(highFraction(marble)>highFraction(wood)*1.5,'ガラスは木より明るい接触音');
 for(const b of [wood,marble])assert.ok(b.getChannelData(0).filter(v=>v===0).length>b.length*.1,'接触の間を無音にし、常時の擦れを重ねない');
 assert.ok(rms(createImpactBuffer(context,'metal','stone'))>rms(createImpactBuffer(context,'metal','cork'))*2);
 for(const id of Object.keys(BALL_MATERIALS))for(const wall of Object.keys(BALL_LAB_WALLS))assert.ok(createImpactBuffer(context,id,wall).getChannelData(0).every(v=>Number.isFinite(v)&&Math.abs(v)<1));
});
