import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE} from '../src/config/gameConfig.js';
import {createStagePlay} from '../src/game/stagePlay.js';
import {createPuzzleTutorialCourse} from '../src/game/puzzleTutorial.js';
import {challengeDifficulty} from '../src/game/challenge.js';

const advance=(play,elapsedMs=16,dt=0)=>play.advance({dt,elapsedMs,tilt:{x:0,y:0},base:BASE});
const exhaust=play=>{for(let i=0;i<100&&play.hp.value>0;i++)play.hp.applyImpact(10,{materialId:'default'},i);};

test('紹介の通常壁でも実際の衝突でげんきが減る',()=>{
 const course=createPuzzleTutorialCourse(48);
 const play=createStagePlay(course.stageSeed,null,{tutorial:true,tutorialPuzzle:course.profile});
 const wall=play.stage.walls.find(w=>w.x<0&&w.h>w.w);
 assert.equal(wall.materialId,'default');
 play.teleport(wall.x+wall.w+play.actor.r+.001,wall.y+wall.h/2);
 play.actor.vx=-6;
 let hit=null;
 const damage=play.advance({dt:1/120,elapsedMs:1000/120,tilt:{x:0,y:0},base:BASE,onImpact:(speed,w)=>{hit={speed,id:w.materialId};}});
 assert.equal(hit.id,'default');assert.ok(damage>0);
 assert.ok(play.hp.value<play.hp.max);assert.equal(play.status,'playing');
});

test('基本紹介と動く壁の紹介は０でも動いてゴールできる',()=>{
 const course=createPuzzleTutorialCourse(48);
 for(const carry of [{tutorial:true},{tutorial:true,tutorialPuzzle:course.profile}]){
  const play=createStagePlay(48,null,carry);exhaust(play);
  assert.equal(play.hp.value,0);
  const before={x:play.actor.x,y:play.actor.y};
  play.advance({dt:1/60,elapsedMs:1000/60,tilt:{x:.2,y:.2},base:BASE});
  assert.equal(play.status,'playing');assert.equal(play.hp.value,0);
  assert.ok(Math.hypot(play.actor.x-before.x,play.actor.y-before.y)>0);
  play.teleport(play.stage.maze.goal.x+.5,play.stage.maze.goal.y+.5);advance(play);
  assert.equal(play.status,'clear');assert.equal(play.hp.value,0);assert.equal(play.limitSec,null);
 }
});

test('０の基本紹介でもキャンディとひとやすみを体験できる',()=>{
 for(const feature of ['recovery','rest']){
  const play=createStagePlay(48,null,{tutorial:true});exhaust(play);
  assert.equal(play.hp.value,0);
  const tile=play.stage[feature];play.teleport(tile.x,tile.y);advance(play);
  if(feature==='rest')advance(play,2100);
  assert.ok(play.hp.value>0);assert.equal(play.status,'playing');
  assert.equal(feature==='rest'?tile.used:tile.collected,true);
  assert.equal(play.hp.tookDamage,true);
 }
});

test('本編はげんき０で終了し、紹介用の復活は適用しない',()=>{
 for(const level of ['easy','normal']){
  const play=createStagePlay(48,challengeDifficulty(1,level));exhaust(play);
  assert.ok(play.hp.value<=0);assert.equal(play.hp.heal(100),0);
  play.teleport(play.stage.maze.goal.x+.5,play.stage.maze.goal.y+.5);advance(play);
  assert.equal(play.status,'dead');
 }
});
