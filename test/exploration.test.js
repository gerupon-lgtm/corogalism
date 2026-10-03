import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE,LAB_EXPLORATION} from '../src/config/gameConfig.js';
import {resolveParams} from '../src/physics/resolveParams.js';
import {stepPhysics} from '../src/physics/integrator.js';
import {getBallMaterial} from '../src/world/ballMaterials.js';
import {getMaterial} from '../src/world/materials.js';
import {createActor,sampleZone} from '../src/world/stage.js';
import {createBallLabStage} from '../src/lab/ballLabStage.js';
import {applyExploration,crossesGoal} from '../src/lab/exploration.js';
import {trialKey} from '../src/lab/timeTrial.js';
import {createFloorLab,applyFloor} from '../src/lab/floorModel.js';

const raw={unrestricted:true,settleBounce:false};
const setup=(ball='superball',floor='normal',wall='default')=>{
 const stage=createBallLabStage({floor,wall});applyExploration(stage);
 const actor=createActor(stage.maze,getBallMaterial(ball));return {stage,actor};
};
const advance=(s,dt=1/120)=>stepPhysics({...s,tilt:{x:0,y:0},base:BASE,dt});

test('検証では通常壁とゴム壁の積が残り、反発1倍を超える候補も計算する',()=>{
 const character=getBallMaterial('superball');
 const params=id=>resolveParams({base:BASE,character,material:getMaterial(id),impactSpeed:4,policy:raw});
 assert.equal(params('default').restitution,.35*2.7);
 assert.equal(params('rubber').restitution,.35*2.7*2.6);
 assert.ok(params('rubber').restitution>2);
 const legacy=id=>resolveParams({base:BASE,character,material:getMaterial(id),impactSpeed:4});
 assert.equal(legacy('default').restitution,.94);assert.equal(legacy('rubber').restitution,.94);
});
test('氷と通常床の減速差を丸めず、加速・力場の倍率にも既存の範囲を使わない',()=>{
 const character={...getBallMaterial('superball'),accelK:.01,fieldK:5};
 const normal=resolveParams({base:BASE,character,policy:raw});
 const ice=resolveParams({base:BASE,character,zone:{frictionK:.08,forceX:2},policy:raw});
 assert.equal(normal.friction,.2);assert.equal(ice.friction,.016);
 assert.equal(ice.accel,.17);assert.equal(ice.forceX,10);
 assert.equal(resolveParams({base:BASE,character,zone:{frictionK:20},policy:raw}).friction,4);
});
test('反発の収束は比較可能な任意設定。弱い衝突も検証前にゼロへ丸めない',()=>{
 const args={base:BASE,character:getBallMaterial('superball'),material:getMaterial('rubber'),impactSpeed:.5};
 assert.ok(resolveParams({...args,policy:raw}).restitution>2);
 assert.equal(resolveParams({...args,policy:{...raw,settleBounce:true}}).restitution,0);
});
test('検証の氷は同じ素材の傾き加速を速さで弱めず、滑る勢いは残す',()=>{
 for(const ball of ['metal','superball','wood','sponge','default'])for(const speed of [0,3,6]){
  const normal=setup(ball,'normal'),ice=setup(ball,'ice');
  for(const s of [normal,ice]){s.stage.walls=[];Object.assign(s.actor,{x:3.5,y:3.5,vx:speed,vy:0});}
  const a=stepPhysics({...normal,base:BASE,dt:1/120,tilt:{x:0,y:.5}});
  const b=stepPhysics({...ice,base:BASE,dt:1/120,tilt:{x:0,y:.5}});
  assert.equal(a.params.accel,b.params.accel);assert.ok(ice.actor.vy>normal.actor.vy);
  if(speed)assert.ok(ice.actor.vx>normal.actor.vx);
  applyExploration(ice.stage,'legacy',true);
  if(speed)assert.ok(sampleZone(ice.stage,ice.actor).accelK<1);
  delete ice.stage.physicsPolicy;
  if(speed)assert.ok(sampleZone(ice.stage,ice.actor).accelK<1,'本編の未指定条件は既存の反応を維持');
 }
});
test('床の各氷配置で補正を外し、補助コースの力を設定値どおりにする',()=>{
 const s=createFloorLab(),settings={ice:.08,sand:3.2,force:6,radius:1.6};
 for(const pattern of ['single','iceRubber','iceSand','iceGravity','iceRepulsion','timeTrial','timeTrialAssist']){
  applyExploration(s.stage);applyFloor(s.stage,'ice',settings,pattern);
  const zone=s.stage.zones.find(z=>z.kind==='ice'),cell=zone.cells[0];Object.assign(s.actor,{x:cell.x+.5,y:cell.y+.5,vx:6,vy:0});
  assert.equal(sampleZone(s.stage,s.actor).accelK,1);
  if(pattern==='timeTrialAssist')assert.ok(s.stage.zones.filter(z=>z.kind==='radial').every(z=>Math.abs(z.strength)===6));
  applyExploration(s.stage,'legacy',true);applyFloor(s.stage,'ice',settings,pattern);
  assert.ok(sampleZone(s.stage,s.actor).accelK<1);
  if(pattern==='timeTrialAssist')assert.ok(s.stage.zones.filter(z=>z.kind==='radial').every(z=>Math.abs(z.strength)===6*.55));
 }
});
test('重なった力場も合成のまま計算し、以前の調整は同じ上限を保つ',()=>{
 const s=setup();s.actor.x=3;s.actor.y=3;
 s.stage.zones=Array.from({length:2},()=>({kind:'radial',x:4,y:3,radius:2,strength:6}));
 assert.equal(sampleZone(s.stage,s.actor).forceX,12);
 applyExploration(s.stage,'legacy',true);assert.equal(sampleZone(s.stage,s.actor).forceX,6);
});
test('検証の速度は素材別・共通の最高速で丸められない',()=>{
 const s=setup('metal');s.stage.walls=[];s.actor.x=2;s.actor.y=2;s.actor.vx=100;
 const result=advance(s);
 assert.equal(result.halt,undefined);assert.ok(s.actor.vx>99);
 applyExploration(s.stage,'legacy',true);advance(s);assert.ok(Math.hypot(s.actor.vx,s.actor.vy)<=6.8);
});
test('反発で途中加速しても移動刻みを再計算して壁の反対側へ抜けない',()=>{
 const s=setup('superball','ice','rubber');s.actor.x=6.59;s.actor.y=.5;s.actor.vx=4;
 assert.equal(advance(s).halt,undefined);assert.ok(s.actor.vx<-9);
 assert.ok(s.actor.x<=6.605&&s.actor.x>6.4);
});
test('計算し続けられない速度は丸めず、処理量または数値精度の理由を返す',()=>{
 const s=setup('superball','ice','rubber');s.actor.x=3.5;s.actor.y=.5;s.actor.vx=1e12;
 const result=advance(s);
 assert.ok(['workload','precision'].includes(result.halt?.reason));
 assert.ok(Math.hypot(s.actor.vx,s.actor.vy)>30);assert.ok(result.halt.steps<=LAB_EXPLORATION.maxSubsteps);
 assert.ok([s.actor.x,s.actor.y,s.actor.vx,s.actor.vy].every(Number.isFinite));
});
test('計算不能な数値のときは直前の有限な状態を保持する',()=>{
 const s=setup();s.actor.character={...s.actor.character,frictionK:-1e300};s.actor.vx=2;
 const before={...s.actor};assert.equal(advance(s).halt?.reason,'nonfinite');
 assert.equal(s.actor.x,before.x);assert.equal(s.actor.vx,before.vx);
});
test('高速で通り抜けたゴールも移動区間から検出する',()=>{
 assert.equal(crossesGoal({x:5,y:6.5},{x:6.9,y:6.5}),true);
 assert.equal(crossesGoal({x:5,y:5},{x:6.9,y:5}),false);
 const s=setup('default');s.actor.x=6;s.actor.y=6.5;s.actor.vx=100;
 let reached=false;
 stepPhysics({...s,base:BASE,dt:1/120,tilt:{x:0,y:0},onTravel:(from,to)=>{reached ||= crossesGoal(from,to);}});
 assert.equal(reached,true);
});
test('以前の記録を維持し、制限なし・収束設定ごとのタイム記録を分ける',()=>{
 const s={ice:.08,sand:3.2,force:6,radius:1.6};
 const old=trialKey(s,'pointer');assert.equal(old,trialKey(s,'pointer','timeTrial','legacy',true));
 assert.notEqual(old,trialKey(s,'pointer','timeTrial','explore',false));
 assert.notEqual(trialKey(s,'pointer','timeTrial','explore',true),trialKey(s,'pointer','timeTrial','explore',false));
 assert.notEqual(trialKey(s,'pointer','timeTrial','explore',false),old+'-explore-settle-false','氷の補正が残っていた旧検証記録とも分ける');
});
