import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagePlay} from '../src/game/stagePlay.js';
import {challengeDifficulty} from '../src/game/challenge.js';
import {createHp} from '../src/game/hp.js';
import {BASE,PUZZLE_MAIN} from '../src/config/gameConfig.js';
import {puzzleTimeAllowanceSec,stageTimeLimitSec} from '../src/game/progression.js';
import {chooseStageVariation} from '../src/game/stageVariety.js';
import {createPuzzleTutorialCourse} from '../src/game/puzzleTutorial.js';
import {loadLegacyRunBests,loadRunBests,saveRunBest} from '../src/record/storage.js';

test('両モードに個別紹介と組合せが入り、げんきは経路の式、時間は操作負担を加える',()=>{
 for(const level of ['easy','normal'])for(const [index,kind] of PUZZLE_MAIN.introduction){
  const difficulty=challengeDifficulty(index,level),variation=chooseStageVariation({seed:913,stage:index,level});
  const play=createStagePlay(913,difficulty,{variation});
  assert.equal(play.stage.puzzle.kind,kind);
  assert.equal(play.hp.max,40+play.stage.maze.turns*4);
  const baseline=stageTimeLimitSec(play.stage.maze,difficulty,{...play.stage,puzzle:null});
  assert.ok(play.limitSec>=baseline+puzzleTimeAllowanceSec(play.stage,level)-1);
 }
});

test('動く壁も綿も無傷で、直後に通常壁へぶつかった時のダメージは残る',()=>{
 const hp=createHp({turns:2,hpPerTurn:4});
 for(const materialId of ['racket','cotton','rubber'])assert.equal(hp.applyImpact(30,{materialId},1),0);
 assert.ok(hp.applyImpact(4,{materialId:'stone'},1)>0);
});

test('紹介コース6面は無制限時間で、実際の壁と球が同じ傾きに反応する',()=>{
 const course=createPuzzleTutorialCourse(913);
 for(let i=0;i<6;i++){
  const play=createStagePlay(course.stageSeed,null,{tutorial:true,tutorialPuzzle:course.profile});
  assert.equal(play.limitSec,null);assert.equal(play.hp.max,100);
  const before=play.stage.rackets.map(w=>({id:w.id,x:w.x,y:w.y}));
  const wall=play.stage.rackets[0],axis=wall.axis,direction=wall[axis]>=wall.max-.01?-1:1;
  const tilt={x:axis==='x'?direction*.2:0,y:axis==='y'?direction*.2:0};
  for(let frame=0;frame<12;frame++)play.advance({dt:1/60,elapsedMs:1000/60,tilt,base:BASE});
  assert.ok(play.stage.rackets.some((w,j)=>Math.hypot(w.x-before[j].x,w.y-before[j].y)>.01));
  const positions=play.stage.rackets.map(w=>({x:w.x,y:w.y}));
  play.advance({dt:1/60,elapsedMs:1000/60,tilt:{x:0,y:0},base:BASE});
  assert.deepEqual(play.stage.rackets.map(w=>({x:w.x,y:w.y})),positions);
  assert.equal(play.lastPhysicsResult.halt,undefined);
  assert.ok([play.actor.x,play.actor.y,play.actor.vx,play.actor.vy].every(Number.isFinite));
  if(i<5)assert.equal(course.next(),true);
 }
});

test('コンティニューは同じ仕掛けと初期位置を再現して、時間を回復する',()=>{
 const difficulty=challengeDifficulty(19,'easy'),variation=chooseStageVariation({seed:77,stage:19,level:'easy'});
 const first=createStagePlay(77,difficulty,{variation}),initial=first.stage.rackets.map(w=>({...w}));
 for(let frame=0;frame<40;frame++)first.advance({dt:1/60,elapsedMs:1000/60,tilt:{x:.3,y:.3},base:BASE});
 const resumed=createStagePlay(77,difficulty,{variation});
 assert.deepEqual(resumed.stage.rackets,initial);
 assert.equal(resumed.remainingSec,resumed.limitSec);
 assert.equal(resumed.hp.value,resumed.hp.max);
});

test('新記録を保存しても旧迷路の107面の記録を保ち、参考表示へ読める',()=>{
 const old={stages:107,totalTimeMs:1600000,at:'2026-10-07T00:00:00Z',rulesVersion:'maze-v1'};
 const values=new Map([['corogalism-run-bests-maze-v1-easy',JSON.stringify({withContinue:old})]]);
 globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 try{
  assert.deepEqual(loadLegacyRunBests('easy').withContinue,old);
  assert.equal(loadRunBests('easy').withContinue,null);
  assert.equal(saveRunBest({level:'easy',stages:1,totalTimeMs:1000,usedContinue:true}).saved,true);
  assert.equal(loadRunBests('easy').withContinue.rulesVersion,'puzzle-v1');
  assert.deepEqual(JSON.parse(values.get('corogalism-run-bests-maze-v1-easy')).withContinue,old);
 }finally{delete globalThis.localStorage;}
});
