import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagePlay} from '../src/game/stagePlay.js';
import {challengeDifficulty} from '../src/game/challenge.js';
import {sampleZone} from '../src/world/stage.js';
import {stableFloorPoint} from '../src/world/floorThemes.js';
import {restFloors} from '../src/world/stageFeatures.js';
import {BASE} from '../src/config/gameConfig.js';

const room=(maze,p)=>p[maze.baffle.axis]<maze.baffle.coord?0:1;
const make=(size,themeId,seed=77,n=17)=>createStagePlay(seed,challengeDifficulty(n,'easy'),{variation:{size,shape:'open',themeId}});
const key=p=>`${p.x},${p.y}`;

test('広場の砂は両区画の複数箇所にあり、端点を避けて実際に減速する',()=>{
 for(const size of [7,13,21])for(const theme of ['sand','iceSand','iceAssist'])for(const seed of [5,77,913,7919]){
  const {stage}=make(size,theme,seed,theme==='sand'?3:17),maze=stage.maze;
  const cells=stage.zones.filter(z=>z.kind==='sand').flatMap(z=>z.cells);
  assert.equal(cells.length,new Set(cells.map(key)).size);
  for(const side of [0,1]){
   const own=cells.filter(c=>room(maze,{x:c.x+.5,y:c.y+.5})===side);
   assert.ok(own.length>=4,JSON.stringify({size,theme,seed,side,cells}));
   const along=maze.baffle.axis==='x'?'y':'x';assert.ok(new Set(own.map(c=>c[along])).size>=2);
   assert.equal(sampleZone(stage,{x:own[0].x+.5,y:own[0].y+.5,vx:1,vy:0}).frictionK,3.2);
  }
  for(const c of cells){assert.ok(c.x>=0&&c.x<size&&c.y>=0&&c.y<size);assert.ok(Math.hypot(c.x,c.y)>1.5&&Math.hypot(c.x-size+1,c.y-size+1)>1.5);}
 }
});

test('広場の力場は選んだ向きを両区画へ配置し、端点と出口を保護する',()=>{
 for(const size of [7,9,13,21])for(const theme of ['gravityAssist','repulsionAssist','iceAssist','gravityHinder','repulsionHinder'])for(const seed of [5,77,913,7919]){
  const p=make(size,theme,seed),{stage}=p,maze=stage.maze,fields=stage.zones.filter(z=>z.kind==='radial');
  const signs=theme==='iceAssist'?[1,-1]:theme.startsWith('repulsion')?[-1]:[1];
  for(const side of [0,1]){
   const own=fields.filter(z=>room(maze,z)===side);assert.ok(own.length>=2,JSON.stringify({size,theme,seed,side,fields}));
   for(const sign of signs)assert.ok(own.some(z=>Math.sign(z.strength)===sign));
   assert.ok(own.some(z=>{const f=sampleZone(stage,{x:z.x+.17,y:z.y,vx:0,vy:0});return Math.hypot(f.forceX,f.forceY)>.01;}));
  }
  for(const z of fields){
   assert.equal(Math.abs(z.strength),3.3);assert.equal(z.radius,1.6);
   assert.ok(z.x>.5&&z.y>.5&&z.x<size-.5&&z.y<size-.5);
   assert.ok(Math.hypot(z.x-.5,z.y-.5)>z.radius+.35);
   assert.ok(Math.hypot(z.x-size+.5,z.y-size+.5)>z.radius+.35);
   for(const b of maze.baffles){
    assert.ok(Math.hypot(z[b.axis]-b.coord,z[b.axis==='x'?'y':'x']-(b.gapStart+b.gapEnd)/2)>z.radius+.35);
   }
  }
  const f=sampleZone(stage,p.actor);assert.equal(f.forceX,0);assert.equal(f.forceY,0);
 }
});

test('休憩の広場は両区画に止まれる足場があり、回復と継続での使用状態が働く',()=>{
 for(const size of [7,13])for(const seed of [77,913,7919]){
  const p=make(size,'rest',seed),{stage}=p,rests=restFloors(stage);
  assert.ok(rests.some(r=>room(stage.maze,r)===0));assert.ok(rests.some(r=>room(stage.maze,r)===1));
  assert.ok(rests.every(r=>stableFloorPoint(stage,r)));
  assert.equal(new Set(rests.map(key)).size,rests.length);
  p.hp.applyImpact(3,{materialId:'stone'},0);const before=p.hp.value;
  const r=rests[0];p.teleport(r.x,r.y);
  for(let i=0;i<130;i++)p.advance({dt:1/60,elapsedMs:1000/60,tilt:{x:0,y:0},base:BASE});
  assert.equal(r.used,true);assert.ok(p.hp.value>before);assert.equal(p.extendedSec,2);
  const continued=createStagePlay(seed,challengeDifficulty(17,'easy'),{variation:{size,shape:'open',themeId:'rest'},restUsedCells:[{x:r.x,y:r.y}]});
  assert.ok(restFloors(continued.stage).find(q=>key(q)===key(r)).used);
  assert.deepEqual(rests.map(key),restFloors(continued.stage).map(key));
 }
});

test('とりもちの広場は両区画に配置し、取得物は経路上で床と重ならない',()=>{
 for(const size of [7,13,21])for(const seed of [77,913,7919]){
  const p=make(size,'sticky',seed),{stage}=p;
  for(const side of [0,1])assert.ok(stage.sticky.filter(t=>room(stage.maze,t)===side).length>=2);
  const rests=restFloors(stage),items=[stage.recovery,stage.leaf,stage.hourglass].filter(Boolean);
  assert.equal(new Set([...rests,...stage.sticky,...items].map(key)).size,rests.length+stage.sticky.length+items.length);
  for(const item of items)assert.ok(stage.maze.path.some(c=>c.x+.5===item.x&&c.y+.5===item.y));
  const first=stage.sticky[0];p.teleport(first.x,first.y);p.advance({dt:1/60,elapsedMs:1000/60,tilt:{x:0,y:0},base:BASE});assert.ok(p.trap);
  const again=make(size,'sticky',seed);assert.deepEqual(again.stage,p.stage);
 }
});

test('砂・氷・力場の広場にもとりもちを抽選し、壁際で実際に勢いが止まる',()=>{
 for(const theme of ['sand','iceRubber','gravityAssist','repulsionAssist']){
  let found=0,absent=0;
  for(let i=1;i<=24;i++){
   const seed=i*7919,p=make(7,theme,seed),{stage}=p;
   if(!stage.sticky.length){absent++;continue;}found++;
   const again=make(7,theme,seed);assert.deepEqual(stage.sticky,again.stage.sticky);
   for(const t of stage.sticky){
    assert.ok(stage.walls.some(w=>Math.hypot(t.x-Math.max(w.x,Math.min(t.x,w.x+w.w)),t.y-Math.max(w.y,Math.min(t.y,w.y+w.h)))<.8));
    assert.ok(Math.hypot(t.x-.5,t.y-.5)>1.5&&Math.hypot(t.x-6.5,t.y-6.5)>1.5);
    assert.ok(![stage.recovery,stage.leaf,stage.hourglass,...restFloors(stage)].filter(Boolean).some(a=>key(a)===key(t)));
   }
   const t=stage.sticky[0];p.teleport(t.x,t.y);p.actor.vx=.5;
   p.advance({dt:1/60,elapsedMs:1000/60,tilt:{x:0,y:0},base:BASE});
   assert.ok(p.trap);assert.equal(p.actor.vx,0);assert.equal(p.actor.vy,0);
  }
  assert.ok(found>0,theme);assert.ok(absent>0,theme);
 }
});

test('全面氷の広場でも休憩の抽選成功を保ち、両区画の足場で回復できる',()=>{
 for(const level of ['easy','normal']){
  const absent=createStagePlay(1,challengeDifficulty(17,level),{variation:{size:7,shape:'open',themeId:'iceRubber'}});
  assert.equal(restFloors(absent.stage).length,0,'外れた抽選に休憩を追加しない');
 }
 // 既存の休憩抽選で両難易度とも当選する種。配置できる通常床が元々ない例。
 for(const level of ['easy','normal'])for(const size of [7,13])for(const seed of [5,7,8,9]){
  const difficulty=challengeDifficulty(17,level),carry={variation:{size,shape:'open',themeId:'iceRubber'}};
  const p=createStagePlay(seed,difficulty,carry),rests=restFloors(p.stage);
  const features=[...rests,...p.stage.sticky,p.stage.recovery,p.stage.leaf,p.stage.hourglass].filter(Boolean);
  assert.equal(new Set(features.map(key)).size,features.length);
  for(const side of [0,1]){
   const r=rests.find(r=>room(p.stage.maze,r)===side);
   assert.ok(r,JSON.stringify({level,size,seed,side,rests}));
   assert.ok(stableFloorPoint(p.stage,r));
   p.hp.applyImpact(3,{materialId:'stone'},side*10);const before=p.hp.value;
   p.teleport(r.x,r.y);
   for(let i=0;i<130;i++)p.advance({dt:1/60,elapsedMs:1000/60,tilt:{x:0,y:0},base:BASE});
   assert.ok(r.used);assert.ok(p.hp.value>before);
  }
  assert.equal(p.extendedSec,4);
  const again=createStagePlay(seed,difficulty,{...carry,restUsedCells:rests.map(r=>({x:r.x,y:r.y}))});
  assert.deepEqual(restFloors(again.stage).map(key),rests.map(key));
  assert.ok(restFloors(again.stage).every(r=>r.used));
 }
});
