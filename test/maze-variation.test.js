import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseStageVariation} from '../src/game/stageVariety.js';
import {generateVariedMaze} from '../src/maze/variation.js';
import {checkReachability} from '../src/maze/validator.js';
import {solvePath,countTurns} from '../src/maze/path.js';
import {createRun} from '../src/game/run.js';
import {createStagePlay} from '../src/game/stagePlay.js';
import {challengeDifficulty} from '../src/game/challenge.js';
import {stageTimeLimitSec} from '../src/game/progression.js';
import {BASE} from '../src/config/gameConfig.js';
import {assignTheme,themeAt} from '../src/world/themes.js';
import {loadRunBests,loadLegacyRunBests,saveRunBest} from '../src/record/storage.js';

test('後半の面数で難しさを上げず、同じ種と履歴なら同じ選択になる',()=>{
 const args={seed:77,stage:25,level:'easy',history:[]};
 assert.deepEqual(chooseStageVariation(args),chooseStageVariation({...args,stage:125}));
 for(const level of ['easy','normal']){
  const run=createRun(77),profiles=[];
  for(let n=1;n<=150;n++){profiles.push(run.currentVariation(level));run.clearStage({timeMs:1000,noDamage:true});}
  for(const slice of [profiles.slice(1,16),profiles.slice(96,128)]){
   assert.ok(new Set(slice.map(p=>p.size)).size>=3);
   assert.ok(slice.some(p=>p.size>=11));
   assert.ok(slice.some(p=>p.shape==='short'));
   assert.ok(new Set(slice.map(p=>p.shape)).size>=3);
  }
  assert.notDeepEqual(profiles.slice(16,32),profiles.slice(32,48));
 }
});

test('各形状と大きさは再現可能で全セルへ到達でき、壁が双方向に一致する',()=>{
 for(const size of [7,8,9,11,13,15,21])for(const shape of ['classic','intricate','short','roomy','open'])for(const seed of [77,913,7919]){
  const profile={size,shape};const a=generateVariedMaze(profile,seed),b=generateVariedMaze(profile,seed);
  assert.deepEqual(a,b);assert.equal(checkReachability(a).ok,true);
  assert.deepEqual(a.path,solvePath(a));assert.equal(a.turns,countTurns(a.path));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const cell=a.cells[y*size+x];
   if(x<size-1)assert.equal(cell.r,a.cells[y*size+x+1].l);
   if(y<size-1)assert.equal(cell.b,a.cells[(y+1)*size+x].t);
   if(!y)assert.equal(cell.t,1);if(!x)assert.equal(cell.l,1);
   if(y===size-1)assert.equal(cell.b,1);if(x===size-1)assert.equal(cell.r,1);
  }
 }
});

test('入り組んだ7×7と素直な7×7では道の長さに違いがある',()=>{
 let intricate=0,short=0;
 for(let seed=1;seed<=80;seed++){
  intricate+=generateVariedMaze({size:7,shape:'intricate'},seed*7919).pathLength;
  short+=generateVariedMaze({size:7,shape:'short'},seed*7919).pathLength;
 }
 assert.ok(intricate>short*1.5);
});

test('コンティニューで形・大きさ・素材を再抽選しない',()=>{
 const run=createRun(913);for(let n=1;n<25;n++){run.currentVariation('easy');run.clearStage({timeMs:1000,noDamage:true});}
 const before=run.currentVariation('easy');run.failStage('timeout');run.useContinue();
 assert.deepEqual(run.currentVariation('easy'),before);
 const difficulty=challengeDifficulty(25,'easy');
 const a=createStagePlay(run.currentSeed(),difficulty,{variation:before});
 const b=createStagePlay(run.currentSeed(),difficulty,{variation:run.currentVariation('easy')});
 assert.deepEqual(a.stage,b.stage);
});

test('新しい面でも初期げんきと制限時間は既存の計算を使う',()=>{
 for(const size of [7,11,13])for(const shape of ['intricate','short','open']){
  const d=challengeDifficulty(107,'easy');const p=createStagePlay(913,d,{variation:{size,shape,themeId:'iceAssist'}});
  assert.equal(p.stage.maze.size,size);assert.equal(p.stage.maze.variation.shape,shape);
  assert.equal(p.hp.max,40+p.stage.maze.turns*4);
  assert.equal(p.limitSec,stageTimeLimitSec(p.stage.maze,d,p.stage));
 }
});

test('短い道や広場でも選ばれた重力・反重力が消えない',()=>{
 for(const size of [7,9,13])for(const shape of ['classic','short','intricate','roomy','open'])
 for(const themeId of ['gravityAssist','repulsionAssist','iceAssist','gravityHinder','repulsionHinder'])for(const seed of [5,9,17,28]){
  const p=createStagePlay(seed,challengeDifficulty(107,'easy'),{variation:{size,shape,themeId}});
  const fields=p.stage.zones.filter(z=>z.kind==='radial');
  assert.ok(fields.length,{size,shape,themeId,seed});
  assert.ok(fields.some(z=>themeId.startsWith('repulsion')?z.strength<0:z.strength>0));
  if(themeId==='iceAssist')assert.ok(fields.some(z=>z.strength<0));
 }
});

test('広場の基本壁はゴムにし、選んだ石・トゲ・こけと面名を保持する',()=>{
 for(const themeId of ['careful','trial','rest','sticky']){
  let themed=0;
  for(const seed of [908419,77,913,7919]){
   const d=challengeDifficulty(12,'easy'),p=createStagePlay(seed,d,{variation:{size:11,shape:'open',themeId}});
   const expected={...p.stage,walls:p.stage.walls.map(w=>({...w,materialId:'rubber'}))};
   const theme=themeAt(12,'easy',themeId);assignTheme(expected,d,theme);
   assert.deepEqual(p.stage.walls.map(w=>w.materialId),expected.walls.map(w=>w.materialId));
   assert.ok(p.stage.theme.label.includes(theme.label));
   themed+=p.stage.walls.filter(w=>w.materialId!=='rubber').length;
  }
  if(themeId!=='sticky')assert.ok(themed>0);
 }
});

test('高速でゴール範囲を横切った時もクリアし、死亡・時間切れは優先する',()=>{
 const make=()=>{
  const p=createStagePlay(913,challengeDifficulty(17,'easy'));
  p.stage.maze.goal={x:3,y:3};p.stage.walls=[];p.stage.sticky=[];p.stage.zones=[];
  p.teleport(3,3.75);p.actor.vx=30;return p;
 };
 const advance=p=>p.advance({dt:1/30,elapsedMs:1000/30,tilt:{x:0,y:0},base:BASE});
 const p=make();advance(p);assert.equal(p.status,'clear');
 const dead=make();for(let i=0;i<10;i++)dead.hp.applyImpact(30,{materialId:'spike'},i);advance(dead);assert.equal(dead.status,'dead');
 const timeout=make();timeout.advance({dt:1/30,elapsedMs:(timeout.limitSec+1)*1000,tilt:{x:0,y:0},base:BASE});assert.equal(timeout.status,'timeout');
});

test('107面の旧記録を保持・参考表示し、新構成の記録と比較しない',()=>{
 const old={stages:107,totalTimeMs:1600000,at:'2026-10-07T00:00:00Z',rulesVersion:'floor-v1'};
 const values=new Map([['corogalism-run-bests-floor-v1-easy',JSON.stringify({withContinue:old})]]);
 globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 try{
  assert.equal(loadRunBests('easy').withContinue,null);
  assert.deepEqual(loadLegacyRunBests('easy').withContinue,old);
  const saved=saveRunBest({level:'easy',stages:1,totalTimeMs:1000,usedContinue:true});
  assert.equal(saved.updated,true);assert.equal(saved.best.rulesVersion,'maze-v1');
  assert.deepEqual(JSON.parse(values.get('corogalism-run-bests-floor-v1-easy')).withContinue,old);
 }finally{delete globalThis.localStorage;}
});
