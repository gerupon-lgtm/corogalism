import test from 'node:test';
import assert from 'node:assert/strict';
import {choosePuzzleVariation,PUZZLE_KINDS} from '../src/game/puzzleVariety.js';
import {chooseStageVariation} from '../src/game/stageVariety.js';
import {createRun} from '../src/game/run.js';

test('床の紹介を保ち、単独3種類を両モードで紹介した後に最初の組合せを出す',()=>{
 for(const level of ['easy','normal']){
  for(let stage=1;stage<=16;stage++)assert.equal(choosePuzzleVariation({seed:77,stage,level}),null);
  for(const [stage,kind] of [[17,'racket'],[19,'sequence'],[21,'timing'],[23,'openRacket']]){
   const profile=chooseStageVariation({seed:77,stage,level});
   assert.equal(profile.puzzleKind,kind);assert.equal(profile.puzzleEase,'relaxed');assert.equal(profile.puzzleFirstVisit,true);
  }
  for(const stage of [18,20,22])assert.equal(choosePuzzleVariation({seed:77,stage,level}),null);
 }
});

test('通常の10面ごとの演出面は可動壁の抽選で置き換えない',()=>{
 for(const stage of [20,30,100,200])for(const seed of [1,77,7919])assert.equal(choosePuzzleVariation({seed,stage,level:'normal'}),null);
 assert.equal(chooseStageVariation({seed:77,stage:20,level:'normal'}).themeId,'specialFlow');
});

test('紹介後は両モードに単独・組合せ・普通・息抜きが混ざり、組合せにも余裕のある面が出る',()=>{
 for(const level of ['easy','normal']){
  const run=createRun(77),late=[];
  for(let stage=1;stage<=250;stage++){
   const profile=run.currentVariation(level);if(stage>=24)late.push(profile);
   run.clearStage({timeMs:1000,noDamage:true});
  }
  const puzzles=late.filter(p=>p.puzzleKind);
  assert.equal(new Set(puzzles.map(p=>p.puzzleKind)).size,PUZZLE_KINDS.length);
  assert.ok(late.some(p=>p.shape==='short'));assert.ok(late.some(p=>p.shape==='classic'));
  assert.ok(puzzles.some(p=>p.size>=11));assert.ok(puzzles.some(p=>p.size===7));
  for(const kind of ['openRacket','sequenceTiming','racketTiming'])assert.ok(puzzles.some(p=>p.puzzleKind===kind&&p.puzzleEase==='relaxed'));
  assert.ok(puzzles.length>15&&puzzles.length<late.length*.5);
 }
});

test('同じ種と履歴なら面数だけで難化せず、続ける時に同じ面を保持する',()=>{
 const args={seed:77,stage:25,level:'easy',history:[]};
 assert.deepEqual(choosePuzzleVariation(args),choosePuzzleVariation({...args,stage:125}));
 const run=createRun(77);for(let n=1;n<23;n++){run.currentVariation('easy');run.clearStage({timeMs:1000,noDamage:true});}
 const before=run.currentVariation('easy');run.failStage('timeout');run.useContinue();assert.deepEqual(run.currentVariation('easy'),before);
});

test('最近の仕掛けを抑える重みでも候補を除外せず、通常迷路が間に入る',()=>{
 const histories=[[],Array.from({length:4},()=>({shape:'puzzle',puzzleKind:'sequence',puzzleEase:'focused'}))];
 const counts=histories.map(history=>{
  const kinds=new Set();let count=0,normal=0;
  for(let seed=1;seed<=8000;seed++){
   const p=choosePuzzleVariation({seed:seed*7919,stage:31,level:'easy',history});
   if(p){count++;kinds.add(p.puzzleKind);}else normal++;
  }
  assert.equal(kinds.size,PUZZLE_KINDS.length);assert.ok(normal>0);return count;
 });
 assert.ok(counts[1]<counts[0]);
});
