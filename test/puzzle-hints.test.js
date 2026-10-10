import test from 'node:test';
import assert from 'node:assert/strict';
import {createPuzzleHints} from '../src/game/puzzleHints.js';
import {createPuzzleStage} from '../src/world/puzzleStage.js';
import {createActor,goalCenter} from '../src/world/stage.js';
import {getCharacter} from '../src/world/characters.js';
import {BASE,TUNING,PUZZLE_HINTS} from '../src/config/gameConfig.js';
import {stepMovingWallPhysics} from '../src/physics/movingWalls.js';
import {createTiltVector} from '../src/input/tiltVector.js';

const kinds=['racket','sequence','timing','openRacket','sequenceTiming','racketTiming'];
const makeStage=(kind='racketTiming',seed=48)=>createPuzzleStage(seed,{size:7,puzzleKind:kind,puzzleEase:'relaxed'});
const actorAt=p=>({...p,vx:0,vy:0,r:getCharacter('default').sizeRatio/2});
function settle(hints,actor,tilt={x:0,y:0}){
 let hint;
 for(let i=0;i<12;i++)hint=hints.update({actor,tilt,elapsedMs:100});
 return hint;
}
function enterTiming(stage){
 const hints=createPuzzleHints(stage),op=stage.puzzle.verificationOperations.find(op=>op.kind==='route');
 const actor=actorAt(op.via.at(-1));
 // 組み合わせの前半をすでに抜けた状態は、現在の部屋から案内し直す。
 if(stage.puzzle.kind==='sequenceTiming'){
  const gate=stage.rackets.find(w=>w.id==='gate-1');
  gate[gate.axis]=stage.puzzle.anchors.gateStates.open[gate.id];
 }
 return {hints,actor};
}

test('六つの紹介面は現在位置から日本語の次の操作を案内し、物理を変更しない',()=>{
 for(const kind of kinds){
  const stage=makeStage(kind),before=JSON.stringify(stage),hints=createPuzzleHints(stage),actor=actorAt(stage.puzzle.anchors.start);
  const snapshot={...actor},hint=hints.update({actor,tilt:null,elapsedMs:16});
  assert.ok(hint?.id&&hint.text&&hint.phase,kind);
  assert.ok(hint.text.length<=38,`${kind}: ${hint.text}`);
  assert.ok([hint.direction.x,hint.direction.y,hint.target.x,hint.target.y].every(Number.isFinite));
  assert.deepEqual(actor,snapshot);
  assert.equal(JSON.stringify(stage),before);
 }
 assert.equal(createPuzzleHints({}).update({actor:actorAt({x:1,y:1})}),null);
});

test('回転・反転した戸は開く方向に対応し、閉じた戸を通過扱いしない',()=>{
 const transforms=new Set();
 for(let sample=1;sample<=32;sample++){
  const seed=Math.imul(sample,0x9e3779b9)>>>0;
  const stage=makeStage('sequence',seed),hints=createPuzzleHints(stage),gate=stage.rackets.find(w=>w.id==='gate-1');
  const actor=actorAt(stage.puzzle.anchors.waitingPoints[0]);
  const hint=hints.update({actor,tilt:{x:0,y:0},elapsedMs:16});
  const sign=Math.sign(stage.puzzle.anchors.gateStates.open[gate.id]-stage.puzzle.anchors.gateStates.closed[gate.id]);
  assert.equal(hint.phase,'open',`seed ${seed}`);
  assert.equal(Math.sign(hint.direction[gate.axis]),sign);
  const name=gate.axis==='x'?(sign<0?'左':'右'):(sign<0?'上':'下');
  assert.ok(hint.text.includes(name));
  transforms.add(`${stage.puzzle.rotation}/${stage.puzzle.mirror}`);
  gate[gate.axis]=stage.puzzle.anchors.gateStates.open[gate.id];
  const opened=createPuzzleHints(stage).update({actor,elapsedMs:16});
  assert.notEqual(opened.phase,'open');
 }
 assert.equal(transforms.size,8);
});

test('六面目は弱い上向きの勢いを作り、入口へ着いた時だけ即座に下へ切り返す',()=>{
 const stage=makeStage(),{hints,actor}=enterTiming(stage),gate=stage.rackets.find(w=>w.id==='timing-gate');
 gate.y=stage.puzzle.anchors.gateStates.closed[gate.id];
 const first=hints.update({actor,tilt:{x:0,y:0},elapsedMs:16});
 assert.equal(first.phase,'build-momentum');
 assert.ok(first.text.includes('左上'));
 Object.assign(actor,{x:4.395,y:1.65,vx:0,vy:-2.8});
 assert.equal(hints.update({actor,elapsedMs:16}).phase,'build-momentum');
 Object.assign(actor,{y:1.15});
 const next=hints.update({actor,tilt:{x:-.2,y:-.3},elapsedMs:16});
 assert.equal(next.phase,'cutback');
 assert.equal(next.urgent,true);
 assert.ok(next.text.includes('左')&&next.text.includes('下'));
 assert.ok(next.direction.x<0&&next.direction.y>0);
 assert.equal(gate.y,stage.puzzle.anchors.gateStates.closed[gate.id]);
});

test('球の勢いが強すぎると逆向きで減速する案内になり、文言と方向を一致させる',()=>{
 const stage=makeStage(),{hints,actor}=enterTiming(stage);
 hints.update({actor,elapsedMs:16});
 Object.assign(actor,{x:4.65,y:3,vx:0,vy:-3.5});
 const hint=settle(hints,actor);
 assert.equal(hint.phase,'build-momentum');
 assert.ok(hint.direction.y>0);
 assert.ok(hint.text.includes('左下')&&hint.text.includes('勢いを調整'));
 assert.ok(!hint.text.includes('左上'));
});

test('戻った球は同じ戸を試し直せ、途中で止まっても秒数だけで先へ進まない',()=>{
 const stage=makeStage(),{hints,actor}=enterTiming(stage),gate=stage.rackets.find(w=>w.id==='timing-gate');
 hints.update({actor,elapsedMs:16});
 Object.assign(actor,{x:3.2,y:1.1});
 gate.y=stage.puzzle.anchors.gateStates.open[gate.id];
 const after=settle(hints,actor);
 assert.notEqual(after.phase,'build-momentum');
 Object.assign(actor,{x:4.65,y:3.3,vy:0});
 const retry=settle(hints,actor);
 assert.equal(retry.phase,'build-momentum');
 for(let i=0;i<100;i++)assert.equal(hints.update({actor,elapsedMs:100}).phase,'build-momentum');
 hints.reset();
 assert.equal(hints.current,null);
});

test('普通の案内は境界付近で明滅せず、ポーズ中には表示の待ち時間も進まない',()=>{
 const stage=makeStage(),{hints,actor}=enterTiming(stage),first=hints.update({actor,elapsedMs:16});
 for(let i=0;i<24;i++){
  actor.vy=i%2?-3.5:0;
  assert.equal(hints.update({actor,elapsedMs:100}).id,first.id);
 }
 actor.vy=-3.5;
 actor.vy=0;hints.update({actor,elapsedMs:100});actor.vy=-3.5;
 const paused=hints.update({actor,elapsedMs:10000,status:'paused'});
 assert.equal(paused.id,first.id);
 assert.equal(hints.update({actor,elapsedMs:10000,status:'countdown'}).id,first.id);
 assert.equal(hints.update({actor,elapsedMs:100}).id,first.id);
 assert.equal(hints.update({actor,elapsedMs:100}).id,first.id);
 assert.notEqual(hints.update({actor,elapsedMs:100}).id,first.id);
});

test('方向の名前が同じでも、加速と減速の境界で文章を頻繁に切り替えない',()=>{
 const stage=makeStage(),{hints,actor}=enterTiming(stage);
 hints.update({actor,elapsedMs:16});
 Object.assign(actor,{x:4.65,y:3.1,vy:-2.78});
 const first=settle(hints,actor);
 for(let i=0;i<24;i++){
  actor.vy=i%2?-2.82:-2.78;
  const hint=hints.update({actor,elapsedMs:100});
  assert.equal(hint.text,first.text);
 }
});

test('傾きを弱めても前へ滑り続ける球は、落ち着くとは言わず勢いで進むと案内する',()=>{
 const stage=makeStage(),target=stage.puzzle.verificationOperations[0].via[0];
 const actor=actorAt({x:target.x,y:target.y-.8});actor.vy=1.247;
 const hint=createPuzzleHints(stage).update({actor,tilt:{x:0,y:0},elapsedMs:16});
 assert.equal(hint.phase,'coast');
 assert.equal(hint.text,'水平に戻して、球の勢いで進もう。');
 assert.deepEqual(hint.direction,{x:0,y:0});
 assert.ok(!hint.text.includes('落ち着かせ'));
});

test('開いた戸の前でも速い球には減速・水平の案内を残し、無理に通過を指示しない',()=>{
 const stage=makeStage('sequence'),gate=stage.rackets[0],actor=actorAt(stage.puzzle.anchors.waitingPoints[0]);
 gate[gate.axis]=stage.puzzle.anchors.gateStates.open[gate.id];
 const portal=stage.puzzle.portals[0],normal={x:portal.to.x-portal.from.x,y:portal.to.y-portal.from.y};
 actor.vx=normal.x*5;actor.vy=normal.y*5;
 const hint=createPuzzleHints(stage).update({actor,elapsedMs:16});
 assert.ok(['brake','coast','racket'].includes(hint.phase),hint.phase);
 assert.ok(!hint.text.includes('開いた通路へ'));
});

test('綿の向こうへ戻された場合も、壁を突き抜ける向きではなく端を回る通過点を案内する',()=>{
 const stage=makeStage('openRacket'),actor=actorAt({x:3.5,y:2.395}),hints=createPuzzleHints(stage);
 stage.rackets[0].x=stage.puzzle.anchors.gateStates.open[stage.rackets[0].id];
 const hint=settle(hints,actor);
 assert.ok(hint.target.y>=2.395||Math.abs(hint.target.x-actor.x)>.5,JSON.stringify(hint));
 assert.ok(Number.isFinite(hint.direction.x)&&Number.isFinite(hint.direction.y));
});

/** 数値入力による補助確認。人が文を読む速さや実機の遊びやすさを保証しない。 */
function runGuide(seed,kind,{responseDelay=0,maxSeconds=45}={}){
 const stage=makeStage(kind,seed),actor=createActor(stage.maze,getCharacter('default')),
  input=createTiltVector(),hints=createPuzzleHints(stage),goal=goalCenter(stage.maze);
 let clear=false,crossed=false,time=0,lastHint=null,applied=null,cutAt=Infinity;
 const phases=new Set();
 for(let i=0;i<Math.ceil(maxSeconds/.016)&&!clear;i++){
  const hint=hints.update({actor,tilt:input.value,elapsedMs:16});phases.add(hint.phase);
  if(hint.phase==='cutback'&&lastHint?.phase!=='cutback')cutAt=time;
  lastHint=hint;
  if(!(hint.phase==='cutback'&&time-cutAt<responseDelay&&applied))applied=hint;
  input.setRaw(applied.direction.x,applied.direction.y);input.update(.016,BASE.inputSmoothing);
  const result=stepMovingWallPhysics({actor,stage,tilt:input.value,base:BASE,dt:.016,settings:stage.racketSettings,
   onTravel(from,to){const dx=to.x-from.x,dy=to.y-from.y,len=dx*dx+dy*dy,
    t=len?Math.max(0,Math.min(1,((goal.x-from.x)*dx+(goal.y-from.y)*dy)/len)):0;
    if(Math.hypot(from.x+dx*t-goal.x,from.y+dy*t-goal.y)<TUNING.goalRadius)clear=true;},
  });
  assert.equal(result.halt,undefined);
  assert.ok([actor.x,actor.y,actor.vx,actor.vy].every(Number.isFinite));
  crossed||=actor.x<3.365;time+=.016;
 }
 return {clear,crossed,time,phases:[...phases],last:hints.current,position:{x:actor.x,y:actor.y}};
}

test('添付と同じ配置では案内の推奨方向を使い、球を移し替えずに入口を通過できる',()=>{
 const result=runGuide(48,'racketTiming');
 assert.equal(result.crossed,true,JSON.stringify(result));
 assert.ok(result.phases.includes('build-momentum')&&result.phases.includes('cutback'));
});

test('遅い切り返しで失敗した場合も破綻せず、入口へ戻って試し直す案内を出す',()=>{
 const result=runGuide(48,'racketTiming',{responseDelay:.3,maxSeconds:30});
 assert.ok(['build-momentum','cutback','route','brake','racket','coast','slide','goal'].includes(result.last.phase));
 assert.ok(Number.isFinite(result.position.x)&&Number.isFinite(result.position.y));
 assert.ok(result.phases.includes('cutback'));
 assert.ok(PUZZLE_HINTS.minimumDisplayMs>=PUZZLE_HINTS.candidateMs);
});
