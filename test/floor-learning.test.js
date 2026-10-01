import {createFloorContactGuide,floorContact} from '../src/world/floorLearning.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagePlay} from '../src/game/stagePlay.js';
import {challengeDifficulty} from '../src/game/challenge.js';
import {FLOOR_CHALLENGE} from '../src/config/gameConfig.js';
import {checkReachability} from '../src/maze/validator.js';

test('やさしいの初登場で砂と単独力場を2–3箇所、力場は離し90秒を確保',()=>{
 for(let seed=1;seed<=100;seed++)for(const n of [3,5,7]){
  const p=createStagePlay(seed*7919,challengeDifficulty(n,'easy'));
  assert.equal(p.stage.theme.learning,true);assert.ok(p.limitSec>=90);
  if(n===3){const z=p.stage.zones.find(z=>z.kind==='sand');assert.ok(z.cells.length>=4&&z.cells.length<=6);}
  else{const fields=p.stage.zones.filter(z=>z.kind==='radial');assert.ok(fields.length>=2&&fields.length<=3);
   for(let i=0;i<fields.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(fields[i].x-fields[j].x,fields[i].y-fields[j].y)>=fields[i].radius+fields[j].radius);
  }
 }
 assert.equal(createStagePlay(7919,challengeDifficulty(3,'normal')).stage.theme.learning,false);
 assert.equal(createStagePlay(7919,challengeDifficulty(10,'easy')).stage.theme.learning,false);
});
test('床の練習は同じ広い面、制限なし、本編の係数を使う',()=>{
 let layout;
 for(const kind of ['normal','sand','ice','gravity','repulsion']){
  const p=createStagePlay(1,challengeDifficulty(20,'normal'),{floorPractice:kind});
  assert.equal(p.stage.theme.id,'floor-practice');assert.equal(p.hp,null);assert.equal(p.limitSec,null);
  assert.equal(checkReachability(p.stage.maze).ok,true);
  const cells=JSON.stringify(p.stage.maze.cells);if(layout)assert.equal(cells,layout);else layout=cells;
  assert.ok(p.stage.walls.every(w=>w.materialId==='cork'));
  if(kind==='sand'||kind==='ice')assert.equal(p.stage.zones[0].frictionK,FLOOR_CHALLENGE[kind]);
  if(kind==='gravity'||kind==='repulsion'){assert.equal(p.stage.zones.length,3);assert.equal(p.stage.zones[0].strength,(kind==='gravity'?1:-1)*FLOOR_CHALLENGE.assistForce);}
 }
});

test('接触説明は少し待って出し、停止では時間を消費せず再接触で繰り返せる',()=>{
 const guide=createFloorContactGuide();
 assert.equal(guide.tick('sand',200,true),'');
 assert.match(guide.tick('sand',100,true),/砂で減速/);
 assert.match(guide.tick('sand',9000,false),/砂で減速/);
 assert.equal(guide.tick('sand',3500,true),'');
 guide.tick(null,10,true);assert.match(guide.tick('sand',300,true),/砂で減速/);
 guide.reset();assert.equal(guide.tick('ice',100,true),'');
 assert.match(guide.tick('ice',200,true),/逆へ傾け/);
});
test('床と力場の接触を区別し、混合面では力の説明を優先する',()=>{
 const p=createStagePlay(1,null,{floorPractice:'gravity'});
 assert.equal(floorContact(p.stage,{x:3.5,y:.5}),'gravity');
 assert.equal(floorContact(p.stage,{x:.5,y:.5}),'normal');
 const q=createStagePlay(1,null,{floorPractice:'repulsion'});
 assert.equal(floorContact(q.stage,{x:4.5,y:4.5}),'repulsion');
});
