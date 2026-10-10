import test from 'node:test';
import assert from 'node:assert/strict';
import {stepRacketPhysics} from '../src/lab/racketPhysics.js';
import {stepPhysics} from '../src/physics/integrator.js';
import {createBallLabStage} from '../src/lab/ballLabStage.js';
import {createActor} from '../src/world/stage.js';
import {CHARACTERS} from '../src/world/characters.js';
import {BASE,TUNING,FLOOR_CHALLENGE} from '../src/config/gameConfig.js';

const settings={racketSpeed:4,racketRestitution:1.08,aimAngleDeg:55,motionTransfer:0,ballTilt:1,speedLimit:30};
function setup({rackets=true}={}){
 const stage=createBallLabStage({floor:'ice',wall:'rubber'});stage.walls=[];
 stage.rackets=rackets?[{id:'vertical',x:3.4,y:2,w:.12,h:2,axis:'y',min:.5,max:4.5,home:2,vx:0,vy:0,materialId:'racket',physicsMaterial:{restitutionK:1.08/BASE.wallRestitution,damageK:0}}]:[];
 const actor=createActor(stage.maze,CHARACTERS.default);
 return {stage,actor};
}
const run=(state,extra={})=>stepRacketPhysics({...state,tilt:{x:0,y:0},base:BASE,dt:.02,settings,...extra});
const near=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} ≈ ${expected}`);
const separation=(a,w)=>Math.hypot(a.x-Math.max(w.x,Math.min(a.x,w.x+w.w)),a.y-Math.max(w.y,Math.min(a.y,w.y+w.h)));

test('ラケットなしの初期値は、本編の氷・ゴムの計算結果と毎フレーム一致する',()=>{
 const stage=createBallLabStage({floor:'ice',wall:'rubber'}),a=createActor(stage.maze,CHARACTERS.default),b={...a};
 const other=structuredClone(stage);other.rackets=[];
 for(let i=0;i<600;i++){
  const tilt={x:Math.sin(i/22),y:Math.cos(i/17)},dt=i%4===0?.035:1/60;
  const one=stepPhysics({actor:a,stage,base:BASE,dt,tilt}),two=stepRacketPhysics({actor:b,stage:other,base:BASE,dt,tilt,settings});
  for(const key of ['x','y','vx','vy'])assert.equal(a[key],b[key],`${i}: ${key}`);
  assert.equal(one.wallHits,two.wallHits);assert.deepEqual(one.params,two.params);
 }
});

test('傾きで指定方向へ動き、水平へ戻すとその場で止まる。負の移動設定も試せる',()=>{
 const state=setup(),w=state.stage.rackets[0];
 run(state,{tilt:{x:0,y:.5},settings:{...settings,ballTilt:0}});near(w.y,2.04);near(w.vy,2);
 run(state,{settings:{...settings,ballTilt:0}});near(w.y,2.04);assert.equal(w.vy,0);
 run(state,{tilt:{x:0,y:.5},settings:{...settings,ballTilt:0,racketSpeed:-4}});near(w.y,2);
 w.axis='x';w.x=2;w.w=2;w.h=.12;
 run(state,{tilt:{x:-.5,y:0},settings:{...settings,ballTilt:0}});near(w.x,1.96);assert.equal(w.vy,0);near(w.vx,-2);
});

test('長面の中心は正面、上端・下端はそれぞれ斜めへ狙って返せる',()=>{
 for(const [y,direction] of [[3,0],[2.15,-1],[3.85,1]]){
  const state=setup();Object.assign(state.actor,{x:3.08,y,vx:8,vy:0});
  const impacts=[],result=run(state,{onImpact:(speed,wall)=>impacts.push({speed,wall})});
  assert.equal(result.racketHits,1);assert.equal(impacts[0].wall.materialId,'racket');assert.equal(impacts[0].wall.physicsMaterial.damageK,0);
  assert.ok(state.actor.vx<0,'左面から左へ返す');
  if(direction===0)near(state.actor.vy,0);else assert.ok(Math.sign(state.actor.vy)===direction);
  const expectedAngle=(y-3)*55*Math.PI/180;
  near(Math.atan2(state.actor.vy,-state.actor.vx),expectedAngle);
  near(Math.hypot(state.actor.vx,state.actor.vy),8*Math.exp(-.2*.02)*1.08);
 }
});

test('横ラケットの左端・右端も打ち分ける。移動速度の上乗せは独立して調整できる',()=>{
 for(const [x,direction] of [[2.15,-1],[3.85,1]]){
  const state=setup(),w=state.stage.rackets[0];Object.assign(w,{x:2,y:3.4,w:2,h:.12,axis:'x'});Object.assign(state.actor,{x,y:3.08,vx:0,vy:8});
  const result=run(state);assert.equal(result.racketHits,1);assert.ok(state.actor.vy<0);assert.equal(Math.sign(state.actor.vx),direction);
 }
 const measure=transfer=>{const state=setup();Object.assign(state.actor,{x:3.08,y:3.04,vx:8,vy:0});run(state,{tilt:{x:0,y:1},settings:{...settings,ballTilt:0,aimAngleDeg:0,motionTransfer:transfer}});return state.actor;};
 near(measure(0).vy,0);near(measure(.5).vy,2);
});

test('高速の球も動くラケットもすり抜けず、短面は壁との相対速度で返る',()=>{
 const fast=setup();Object.assign(fast.actor,{x:2,y:3,vx:500,vy:0});
 const hit=run(fast,{dt:.01,settings:{...settings,speedLimit:0}});assert.equal(hit.racketHits,1);assert.ok(fast.actor.vx<0);assert.ok(fast.actor.x<3.4-fast.actor.r);
 const moving=setup();Object.assign(moving.actor,{x:3.46,y:4.7,vx:0,vy:0});
 const move=run(moving,{tilt:{x:0,y:1},settings:{...settings,ballTilt:0,racketSpeed:100}});
 assert.ok(move.racketHits>0,'動く短面で静止球を打つ');assert.ok(moving.actor.vy>100);assert.ok(separation(moving.actor,moving.stage.rackets[0])>=moving.actor.r-1e-8);
 const atEnd=setup();atEnd.stage.rackets[0].y=atEnd.stage.rackets[0].max;
 const stopped=run(atEnd,{tilt:{x:0,y:1},settings:{...settings,ballTilt:0,racketSpeed:1e12}});
 assert.equal(stopped.halt,undefined,'レール端の静止壁では不要な計算停止を起こさない');
 assert.equal(atEnd.stage.rackets[0].vy,0);
});

test('綿では壁へ向かう成分だけ吸収し、沿う方向は滑り続ける',()=>{
 const state=setup();state.stage.walls=[{x:5,y:0,w:.2,h:7,materialId:'cotton'}];Object.assign(state.actor,{x:4.71,y:1,vx:5,vy:3});
 run(state);near(state.actor.vx,0);near(state.actor.vy,3*Math.exp(-.2*.02));assert.ok(state.actor.y>1);
});

test('球を壁との間に挟む移動はラケットを接触位置で止め、球をすり抜けさせない',()=>{
 const state=setup(),w=state.stage.rackets[0];
 Object.assign(w,{x:3.4,y:2.9,w:.12,h:.8,min:.5,max:5});
 state.stage.walls=[{x:0,y:4.4,w:7,h:.2,materialId:'cotton'}];
 Object.assign(state.actor,{x:3.46,y:4.02,vx:0,vy:0});
 let blocked=false;
 for(let i=0;i<30;i++){
  const result=run(state,{tilt:{x:0,y:1},settings:{...settings,ballTilt:0,racketSpeed:10}});blocked ||= result.blockedRackets.includes(w.id);
  assert.ok(separation(state.actor,w)>=state.actor.r-2e-8,'球はラケット内へ入らない');
  assert.ok(separation(state.actor,state.stage.walls[0])>=state.actor.r-2e-8,'球は静止壁内へ入らない');
 }
 assert.ok(blocked);near(w.y+w.h,4.4-state.actor.r*2,2e-8);assert.ok(state.actor.y<=4.4-state.actor.r+1e-8);
});

test('氷の傾きは本編と同じ速度依存の加速を使い、ラケット操作中にも球へ作用する',()=>{
 const state=setup();Object.assign(state.actor,{x:1,y:1,vx:2,vy:0});
 const result=run(state,{tilt:{x:0,y:.5}});
 const accelK=FLOOR_CHALLENGE.iceMotion.minAccelK+(1-FLOOR_CHALLENGE.iceMotion.minAccelK)/(1+(2/FLOOR_CHALLENGE.iceMotion.transitionSpeed)**2);
 near(result.params.accel,BASE.tiltSensitivity*accelK);assert.ok(state.actor.vy>0);assert.ok(state.stage.rackets[0].y>2);
});

test('編集した速度上限と上限なしを区別し、有限値が壊れた時は理由を返す',()=>{
 for(const limit of [30,60,0]){
  const state=setup();Object.assign(state.actor,{x:1,y:1,vx:90,vy:0});state.stage.rackets=[];
  run(state,{dt:.001,settings:{...settings,speedLimit:limit}});
  near(state.actor.vx,limit>0?limit:90*Math.exp(-.2*.001));
 }
 const state=setup();state.actor.vx=Infinity;const result=run(state);assert.equal(result.halt.reason,'nonfinite');
 const overload=setup();Object.assign(overload.actor,{x:1,y:1,vx:1e8,vy:0});overload.stage.rackets=[];
 const stopped=run(overload,{settings:{...settings,speedLimit:0}});assert.equal(stopped.halt.reason,'workload');assert.equal(stopped.halt.steps,4096);
 assert.equal(TUNING.maxSpeed,30,'本編設定を変更しない');
});

test('本編へ委譲する比較も、有限の大きな傾き倍率による数値破綻を記録して止める',()=>{
 const state=setup({rackets:false}),before={...state.actor};
 const result=run(state,{tilt:{x:1,y:1},settings:{...settings,ballTilt:1e308}});
 assert.equal(result.halt.reason,'nonfinite');assert.equal(result.halt.steps,0);assert.deepEqual(state.actor,before,'破綻した計算を球へ反映しない');
 const safe=setup({rackets:false});run(safe,{tilt:{x:1,y:0},settings:{...settings,ballTilt:1e100}});
 near(Math.hypot(safe.actor.vx,safe.actor.vy),30); // 大きい編集値でも本編の上限計算が成り立つ場合は実行する。
 const tiny=setup({rackets:false});Object.assign(tiny.actor,{vx:30,r:1e-8});const initial={...tiny.actor};
 const overload=run(tiny);assert.equal(overload.halt.reason,'workload');assert.deepEqual(tiny.actor,initial);
});

test('ゲートの向きと移動軸は別で、横へ動く縦壁と縦へ動く横壁が静止球を打ち返す',()=>{
 for(const axis of ['x','y']){
  const state=setup(),w=state.stage.rackets[0];
  Object.assign(w,axis==='x'?{axis:'x',bounce:'reflect',x:3.4,y:2,w:.12,h:2}:{axis:'y',bounce:'reflect',x:2,y:3.4,w:2,h:.12});
  Object.assign(state.actor,axis==='x'?{x:3.88,y:3,vx:0,vy:0}:{x:3,y:3.88,vx:0,vy:0});
  const result=run(state,{dt:.05,tilt:axis==='x'?{x:1,y:0}:{x:0,y:1},settings:{...settings,ballTilt:0}});
  assert.equal(result.racketHits,1);near(axis==='x'?state.actor.vx:state.actor.vy,4*(1+1.08));
  near(axis==='x'?state.actor.vy:state.actor.vx,0);assert.ok(separation(state.actor,w)>=state.actor.r-1e-8);
 }
});

test('狙い打ちの中心と端は移動軸ではなく壁の長辺から決まる',()=>{
 const vertical=setup();vertical.stage.rackets[0].axis='x';Object.assign(vertical.actor,{x:3.08,y:2.15,vx:8,vy:0});
 run(vertical);near(Math.atan2(vertical.actor.vy,-vertical.actor.vx),-.85*55*Math.PI/180);
 const horizontal=setup();Object.assign(horizontal.stage.rackets[0],{x:2,y:3.4,w:2,h:.12,axis:'y'});Object.assign(horizontal.actor,{x:2.15,y:3.08,vx:0,vy:8});
 run(horizontal);near(Math.atan2(horizontal.actor.vx,-horizontal.actor.vy),-.85*55*Math.PI/180);
});

test('ゲートは中心・端を狙う処理をせず、斜め入力でも沿う速度を保って相対反射する',()=>{
 const state=setup(),w=state.stage.rackets[0];Object.assign(w,{axis:'x',bounce:'reflect'});
 Object.assign(state.actor,{x:3.83,y:2.2,vx:0,vy:0});
 const result=run(state,{dt:.05,tilt:{x:.5,y:.5}});
 assert.equal(result.racketHits,1);const inputVelocity=17*.5*.05*Math.exp(-.2*.05);
 near(state.actor.vy,inputVelocity);near(state.actor.vx,inputVelocity-(1+1.08)*(inputVelocity-2));
});

test('横へ閉じる縦ゲートは挟み込み位置で止まり、切り返せば球が押し戻されず離れられる',()=>{
 const state=setup(),w=state.stage.rackets[0];Object.assign(w,{axis:'x',bounce:'reflect',min:1,max:4.5});
 state.stage.walls=[{x:4.4,y:0,w:.2,h:7,materialId:'cotton'}];Object.assign(state.actor,{x:3.98,y:3,vx:0,vy:0});
 let blocked=false;
 for(let i=0;i<20;i++){
  const result=run(state,{tilt:{x:1,y:0},settings:{...settings,ballTilt:0}});blocked ||=result.blockedRackets.includes(w.id);
  assert.ok(separation(state.actor,w)>=state.actor.r-2e-8);assert.ok(separation(state.actor,state.stage.walls[0])>=state.actor.r-2e-8);
 }
 assert.ok(blocked);near(w.x+w.w,4.4-state.actor.r*2,2e-8);
 const trappedX=state.actor.x,gateX=w.x;
 for(let i=0;i<5;i++)run(state,{tilt:{x:-.7,y:0}});
 assert.ok(w.x<gateX);assert.ok(state.actor.x<trappedX);assert.ok(state.actor.vx<0);
 assert.ok(separation(state.actor,w)>state.actor.r,'ゲートが退いて球とのすき間が開く');
});
