import test from 'node:test';
import assert from 'node:assert/strict';
import {createRacketStage,RACKET_DEFAULTS,RACKET_LAYOUTS} from '../src/lab/racketStage.js';
import {checkReachability} from '../src/maze/validator.js';
import {getCharacter} from '../src/world/characters.js';
import {createActor,sampleMaterial,sampleZone,goalCenter} from '../src/world/stage.js';
import {createFloorPracticeStage} from '../src/world/floorPractice.js';
import {resolveParams} from '../src/physics/resolveParams.js';
import {BASE,FLOOR_CHALLENGE,TUNING} from '../src/config/gameConfig.js';
import {stepRacketPhysics} from '../src/lab/racketPhysics.js';
import {crossesGoal} from '../src/lab/exploration.js';

const geometry=stage=>stage.walls.map(({x,y,w,h})=>({x,y,w,h}));
const separation=(a,b)=>Math.hypot(Math.max(a.x-b.x-b.w,b.x-a.x-a.w,0),Math.max(a.y-b.y-b.h,b.y-a.y-a.h,0));
const sweep=p=>p.axis==='x'?{x:p.min,y:p.y,w:p.max-p.min+p.w,h:p.h}:{x:p.x,y:p.min,w:p.w,h:p.max-p.min+p.h};
const blockedPath=(stage,from,to)=>{
 const radius=getCharacter('default').sizeRatio/2;
 for(let i=0;i<=400;i++){
  const t=i/400,p={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,w:0,h:0};
  if(stage.walls.some(w=>separation(p,w)<radius))return true;
 }
 return false;
};

test('ラケット比較の二つの面は静止壁のBFSと経路を持ち、三状態で同じ形を保つ',()=>{
 for(const layout of Object.keys(RACKET_LAYOUTS)){
  const states=['baseline','cotton','rackets'].map(mode=>createRacketStage({layout,mode}));
  for(const stage of states){
   assert.equal(checkReachability(stage.maze).ok,true);
   assert.equal(stage.maze.reachabilityScope,'static-walls');
   assert.equal(stage.maze.pathLength,stage.maze.path.length);
   assert.deepEqual(stage.maze.path[0],stage.maze.start);
   assert.deepEqual(stage.maze.path.at(-1),stage.maze.goal);
   assert.ok(stage.maze.turns>0);
  }
  for(const stage of states.slice(1)){
   assert.deepEqual(geometry(stage),geometry(states[0]));
   assert.deepEqual(stage.zones,states[0].zones);
   assert.deepEqual(stage.maze,states[0].maze);
  }
  assert.equal(states[0].rackets.length,0);
  assert.equal(states[1].rackets.length,0);
  assert.deepEqual(states[2].rackets.map(p=>p.axis),['y','x']);
 }
});

test('全氷の係数と速度による傾きの効き方は本編の氷と一致する',()=>{
 const stage=createRacketStage({mode:'baseline'}),practice=createFloorPracticeStage('ice');
 for(const speed of [0,.5,2,8,30]){
  const a=createActor(stage.maze,getCharacter('default'));a.x=3.5;a.y=.5;a.vx=speed;
  const args={base:BASE,character:a.character,material:sampleMaterial(stage,a),zone:sampleZone(stage,a)};
  const actual=resolveParams(args);
  assert.deepEqual(actual,resolveParams({...args,material:sampleMaterial(practice,a),zone:sampleZone(practice,a)}));
  assert.equal(stage.zones[0].frictionK,FLOOR_CHALLENGE.ice);
 }
 assert.equal(stage.zones[0].cells.length,49);
});

test('綿の有無を選べ、ラケットと綿の素材データには編集した反発値を保持する',()=>{
 assert.equal(createRacketStage({mode:'baseline'}).walls.filter(w=>w.materialId==='cotton').length,0);
 assert.equal(createRacketStage({mode:'cotton'}).walls.filter(w=>w.materialId==='cotton').length,6);
 assert.equal(createRacketStage({mode:'rackets',cotton:false}).walls.filter(w=>w.materialId==='cotton').length,0);
 const stage=createRacketStage({racketRestitution:2.5,cottonRestitution:.4});
 for(const p of stage.rackets){assert.equal(p.physicsMaterial.restitutionK,2.5/BASE.wallRestitution);assert.equal(p.physicsMaterial.damageK,0);}
 for(const w of stage.walls.filter(w=>w.materialId==='cotton')){assert.equal(w.physicsMaterial.restitutionK,.4/BASE.wallRestitution);assert.equal(w.physicsMaterial.damageK,0);}
 assert.equal(RACKET_DEFAULTS.ballTilt,1);
 assert.equal(RACKET_DEFAULTS.speedLimit,30);
});

test('ラケットの全移動範囲から静止壁と互いのラケットへ球一個以上の退避幅がある',()=>{
 const diameter=getCharacter('default').sizeRatio;
 for(const layout of Object.keys(RACKET_LAYOUTS)){
  const stage=createRacketStage({layout}),envelopes=stage.rackets.map(sweep);
  for(const [i,envelope] of envelopes.entries()){
   for(const wall of stage.walls)assert.ok(separation(envelope,wall)>=diameter-1e-10,`${layout}/${stage.rackets[i].id}: 静止壁まで ${separation(envelope,wall)}`);
   for(const point of [stage.labAnchors.start,stage.labAnchors.goal]){
    const distance=separation(envelope,{...point,w:0,h:0});
    assert.ok(distance>=diameter/2,`${layout}: 開始・終了がラケットに埋まらない`);
   }
  }
  assert.ok(separation(...envelopes)>=diameter);
 }
});

test('折り返し面は開始からゴールへの直線と外周のL字直行を静止壁で遮る',()=>{
 const stage=createRacketStage({mode:'baseline'});
 const start=stage.labAnchors.start,goal=stage.labAnchors.goal;
 assert.equal(blockedPath(stage,start,goal),true);
 for(const corner of [{x:start.x,y:goal.y},{x:goal.x,y:start.y}])assert.ok(blockedPath(stage,start,corner)||blockedPath(stage,corner,goal));
});

test('カップは内側の下向き入口にあり、上と左右の直行を遮り、入口は2セル幅を保つ',()=>{
 const stage=createRacketStage({mode:'baseline'}),goal=goalCenter(stage.maze);
 assert.deepEqual(stage.maze.goal,{x:5,y:4});
 assert.deepEqual(stage.labAnchors.goal,goal);
 assert.ok(goal.x<stage.maze.size-1&&goal.y<stage.maze.size-1);
 for(const from of [{x:5.5,y:3.4},{x:3.4,y:4.5},{x:6.6,y:4.5}])assert.equal(blockedPath(stage,from,goal),true);
 for(const x of [4.5,5,5.5])assert.equal(blockedPath(stage,{x,y:5.5},{x,y:4.5}),false);
 for(const x of [4,5]){
  assert.equal(stage.maze.cells[4*7+x].b,0);
  assert.equal(stage.maze.cells[5*7+x].t,0);
 }
 assert.equal(stage.maze.cells[4*7+4].l,1);
 assert.equal(stage.maze.cells[4*7+5].r,1);
 const left=stage.walls.find(w=>w.x>3.8&&w.x<4&&w.y>3.8&&w.y<4&&w.h>1);
 const right=stage.walls.find(w=>w.x>5.8&&w.x<6&&w.y>3.8&&w.y<4&&w.h>1);
 assert.ok(left&&right);
 assert.ok(right.x-(left.x+left.w)>getCharacter('default').sizeRatio+1,'入口は球だけに合わせた狭い一列ではない');
});

test('下端を沿うだけではカップへ入らず、旧最後の横移動もゴールとして判定されない',()=>{
 const settings={...RACKET_DEFAULTS,mode:'baseline'},stage=createRacketStage(settings),goal=goalCenter(stage.maze);
 const actor=createActor(stage.maze,getCharacter('default'));Object.assign(actor,stage.labAnchors.bottomProbe);
 let crossed=false;
 for(let i=0;i<200;i++){
  const result=stepRacketPhysics({actor,stage,tilt:{x:1,y:0},base:BASE,dt:1/120,settings,
   onTravel:(from,to)=>{if(crossesGoal(from,to,goal.x,goal.y,TUNING.goalRadius))crossed=true;},
  });
  assert.equal(result.halt,undefined);
 }
 assert.equal(crossed,false);
 assert.equal(crossesGoal({x:1.65,y:6.5},{x:6.5,y:6.5},goal.x,goal.y,TUNING.goalRadius),false);
});

test('同じ下段の入射と傾きなら横ラケットの端で返すと綿だけより早く抜けられる',()=>{
 const trial=mode=>{
  const settings={...RACKET_DEFAULTS,mode},stage=createRacketStage(settings),actor=createActor(stage.maze,getCharacter('default'));
  Object.assign(actor,stage.labAnchors.horizontalShot);const goal=goalCenter(stage.maze);
  let completed=null,faceHits=0;
  for(let i=0;i<200;i++){
   const result=stepRacketPhysics({actor,stage,tilt:{x:.3,y:0},base:BASE,dt:1/120,settings,
    onImpact:(_speed,w)=>{if(w.id==='horizontal'&&Math.abs(actor.y-(w.y-actor.r))<1e-8)faceHits++;},
    onTravel:(from,to)=>{if(completed===null&&crossesGoal(from,to,goal.x,goal.y,TUNING.goalRadius))completed=(i+1)/120;},
   });
   assert.equal(result.halt,undefined);
   if(completed!==null)break;
  }
  return {completed,faceHits};
 };
 const plain=trial('cotton'),racket=trial('rackets');
 assert.ok(plain.completed!==null&&racket.completed!==null,'両方ともゴールでき、利用を必須にしない');
 assert.ok(racket.faceHits>0,'横ラケットの長面で中心・端の返球を使う');
 assert.ok(racket.completed+.15<plain.completed,`綿のみ ${plain.completed}秒、ラケットあり ${racket.completed}秒`);
});
