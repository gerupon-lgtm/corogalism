import test from 'node:test';
import assert from 'node:assert/strict';
import {createPuzzleStage,validatePuzzleStructure,reachablePuzzlePoints} from '../src/world/puzzleStage.js';
import {PUZZLE_KINDS} from '../src/game/puzzleVariety.js';
import {checkReachability} from '../src/maze/validator.js';
import {solvePath,countTurns} from '../src/maze/path.js';
import {BASE,PUZZLE_MAIN,FLOOR_CHALLENGE,TUNING} from '../src/config/gameConfig.js';
import {createActor,sampleZone,goalCenter} from '../src/world/stage.js';
import {getCharacter} from '../src/world/characters.js';
import {stepMovingWallPhysics} from '../src/physics/movingWalls.js';
import {createTiltVector} from '../src/input/tiltVector.js';

test('6種類は全静止セルが連結し、球径を含めて開口・待機・やり直し経路が成立する',()=>{
 for(const kind of PUZZLE_KINDS)for(const size of [7,8,9,11,13,17])for(const seed of [1,42,77])for(const ease of ['relaxed','flow','focused']){
  const stage=createPuzzleStage(seed,{size,puzzleKind:kind,puzzleEase:ease});
  assert.equal(checkReachability(stage.maze).ok,true,`${kind}/${size}/${seed}/${ease}`);
  assert.deepEqual(stage.maze.path,solvePath(stage.maze));assert.equal(stage.maze.turns,countTurns(stage.maze.path));
  assert.equal(stage.maze.pathLength,stage.maze.path.length);
  for(const wall of stage.rackets){
   assert.ok(wall.min<=wall.home&&wall.home<=wall.max,`${kind}/${size}/${seed}/${ease}/${wall.id}: homeがレール内`);
   assert.equal(wall[wall.axis],wall.home);
  }
  assert.equal(stage.puzzle.verification.ok,true);assert.equal(stage.puzzle.verification.scope,'static-bfs-and-open-clearance');
  assert.ok(stage.puzzle.verification.openRetryReachable.every(Boolean));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const cell=stage.maze.cells[y*size+x];
   if(x<size-1)assert.equal(cell.r,stage.maze.cells[y*size+x+1].l);
   if(y<size-1)assert.equal(cell.b,stage.maze.cells[(y+1)*size+x].t);
  }
 }
});

test('同じ種は同じ配置を再現し、別の種で向き・仕切り・開口・開始地点が変わる',()=>{
 for(const kind of PUZZLE_KINDS){
  const stage=createPuzzleStage(77,{size:9,puzzleKind:kind});
  assert.deepEqual(stage,createPuzzleStage(77,{size:9,puzzleKind:kind}));
  const signatures=new Set();
  for(let seed=1;seed<=12;seed++){
   const generated=createPuzzleStage(seed,{size:9,puzzleKind:kind});
   signatures.add(JSON.stringify({cells:generated.maze.cells,start:generated.maze.start,goal:generated.maze.goal}));
  }
  assert.ok(signatures.size>=8,kind+'の固定迷路を巡回しない');
 }
});

test('氷は既存本編の速度補正を保ち、ゴム・綿・動く壁は全て無傷',()=>{
 for(const kind of PUZZLE_KINDS){
  const stage=createPuzzleStage(77,{puzzleKind:kind,size:7}),actor=createActor(stage.maze,getCharacter('default'));
  assert.deepEqual(stage.racketSettings,PUZZLE_MAIN.physics);
  assert.equal(stage.zones[0].cells.length,49);assert.equal(stage.zones[0].frictionK,FLOOR_CHALLENGE.ice);
  actor.vx=8;assert.ok(sampleZone(stage,actor).accelK<1);
  assert.ok(stage.walls.some(w=>w.materialId==='cotton'));
  assert.ok(stage.walls.every(w=>['rubber','cotton'].includes(w.materialId)));
  assert.ok(stage.rackets.every(w=>w.physicsMaterial.damageK===0));
  assert.ok(stage.walls.filter(w=>w.materialId==='cotton').every(w=>w.physicsMaterial.damageK===0));
  assert.ok(stage.puzzle.anchors.start.x>0&&stage.puzzle.anchors.start.y>0);
 }
});

test('順序面は1を閉じたまま2を開いてもゴールへ通れず、両方開ければ到達できる',()=>{
 for(const seed of [1,2,42,77])for(const size of [7,9,13]){
  const stage=createPuzzleStage(seed,{size,puzzleKind:'sequence'}),states=stage.puzzle.anchors.gateStates;
  const gates=openIds=>stage.rackets.map(w=>({...w,[w.axis]:states[openIds.includes(w.id)?'open':'closed'][w.id]}));
  assert.deepEqual(reachablePuzzlePoints(stage,stage.puzzle.anchors.start,[stage.puzzle.anchors.goal],{rackets:gates(['gate-2'])}),[false]);
  assert.deepEqual(reachablePuzzlePoints(stage,stage.puzzle.anchors.start,[stage.puzzle.anchors.goal],{rackets:gates(['gate-1','gate-2'])}),[true]);
  assert.deepEqual(stage.rackets.map(w=>w.label),['1','2']);
 }
});

test('閉鎖・収納・待機の破綻を検出し、静止BFSだけで成功と判定しない',()=>{
 const stage=createPuzzleStage(77,{size:7,puzzleKind:'sequence'}),gate=stage.rackets[0];
 stage.puzzle.anchors.gateStates.open[gate.id]=stage.puzzle.anchors.gateStates.closed[gate.id];
 assert.equal(checkReachability(stage.maze).ok,true);
 const result=validatePuzzleStructure(stage);assert.equal(result.ok,false);assert.ok(result.errors.some(e=>e.includes('open-clearance')));
});

const clamp=(n,max)=>Math.max(-max,Math.min(max,n));
/** 自動制御は到達性の確認。人の楽しさ・実機の傾きは別途ブラウザ/試遊で確かめる。 */
function runOperations(seed,profile){
 const stage=createPuzzleStage(seed,profile),actor=createActor(stage.maze,getCharacter('default')),goal=goalCenter(stage.maze),input=createTiltVector();
 let clear=false,hits=0,time=0;
 const tick=tilt=>{
  input.setRaw(tilt.x,tilt.y);input.update(.016,BASE.inputSmoothing);
  const result=stepMovingWallPhysics({actor,stage,tilt:input.value,base:BASE,dt:.016,settings:stage.racketSettings,
   onImpact:()=>hits++,onTravel(from,to){const dx=to.x-from.x,dy=to.y-from.y,len=dx*dx+dy*dy,t=len?Math.min(1,((goal.x-from.x)*dx+(goal.y-from.y)*dy)/len):0;
    const at=Math.max(0,t);if(Math.hypot(from.x+dx*at-goal.x,from.y+dy*at-goal.y)<TUNING.goalRadius)clear=true;},
  });time+=.016;
  assert.equal(result.halt,undefined);
  assert.ok([actor.x,actor.y,actor.vx,actor.vy,...stage.rackets.flatMap(w=>[w.x,w.y,w.vx,w.vy])].every(Number.isFinite));
 };
 const context=target=>JSON.stringify({kind:stage.puzzle.kind,seed,size:profile.size,target,actor:{x:actor.x,y:actor.y,vx:actor.vx,vy:actor.vy},rackets:stage.rackets.map(w=>({id:w.id,x:w.x,y:w.y}))});
 const operations=structuredClone(stage.puzzle.verificationOperations);
 if(['normalRubber','normalCork'].includes(profile.puzzleMaterialPattern)&&stage.puzzle.timingCount){
  const launch=operations.find(op=>op.kind==='until'),cut=operations[operations.indexOf(launch)+1],axis=launch.condition.axis;
  const approach=operations[operations.indexOf(launch)-1].via.at(-1),cross=axis==='x'?'y':'x';approach[cross]+=.8*Math.sign(cut.tilt[cross]);
  for(const key of ['min','max'])if(launch.condition[key]!==undefined)launch.condition[key]+=key==='min'?.9:-.9;
  launch.tilt[axis]*=4/7;launch.tilt[cross]=0;launch.maxSeconds=4;cut.maxSeconds=5;cut.tilt[axis]/=.7;cut.tilt[cross]/=.7;
 }
 for(const op of operations){
  if(clear)break;
  if(op.kind==='hold')for(let i=0;i<Math.ceil(op.seconds/.016)&&!clear;i++)tick(op.tilt);
  else if(op.kind==='until'){
   let reached=false;
   for(let i=0;i<Math.ceil(op.maxSeconds/.016)&&!clear;i++){
    tick(op.tilt);const p=actor[op.condition.axis];reached=(op.condition.min===undefined||p>=op.condition.min)&&(op.condition.max===undefined||p<=op.condition.max);if(reached)break;
   }
   assert.ok(reached||clear,'切り返し条件に届く '+context(op.condition));
  }else for(const target of op.via){
   let reached=false;
   for(let i=0;i<1100&&!clear;i++){
    const dx=target.x-actor.x,dy=target.y-actor.y;
    if(Math.hypot(dx,dy)<.045&&Math.hypot(actor.vx,actor.vy)<.1){reached=true;break;}
    tick({x:clamp((clamp(dx*2,1.3)-actor.vx)*.45,.7),y:clamp((clamp(dy*2,1.3)-actor.vy)*.45,.7)});
   }
   assert.ok(reached||clear,'構造から選んだ通過点に届く '+context(target));if(clear)break;
  }
 }
 assert.ok(clear,'開始から傾き操作だけでクリアする '+context(goal));
 return {time,hits};
}

for(const [i,kind] of PUZZLE_KINDS.entries())test(`${kind}: 異なる種・向き・大きさを開始地点から傾きだけで操作できる`,()=>{
 const tutorialSeed=(77+Math.imul(i+1,0x9e3779b9))>>>0;
 for(const [seed,size] of [[77,7],[42,9],[2,13],[3,7],[tutorialSeed,7]])runOperations(seed,{size,puzzleKind:kind,puzzleEase:'relaxed'});
});

for(const pattern of ['iceSandRubber','normalRubber','normalCork','iceSandCork','mixedStandard'])test(`${pattern}: 各仕掛けを共通の物理と傾きだけで開始からクリアできる`,()=>{
 for(const kind of PUZZLE_KINDS)runOperations(kind==='racketTiming'&&['iceSandCork','mixedStandard'].includes(pattern)?42:77,{size:7,puzzleKind:kind,puzzleEase:'relaxed',puzzleMaterialPattern:pattern});
});

test('通常床・通常壁の紹介序盤2面は同じ構造を保って開始から傾きだけでクリアできる',()=>{
 for(const [i,kind] of ['racket','sequence'].entries()){
  const seed=(77+Math.imul(i+1,0x9e3779b9))>>>0;
  runOperations(seed,{size:7,puzzleKind:kind,puzzleEase:'relaxed',puzzleMaterialPattern:'tutorialNormal'});
 }
});
