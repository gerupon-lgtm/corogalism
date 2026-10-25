import test from 'node:test';
import assert from 'node:assert/strict';
import {applyProgressiveWalls} from '../src/world/progressiveWalls.js';
import {generateMaze} from '../src/maze/generator.js';
import {checkReachability} from '../src/maze/validator.js';
import {createStage} from '../src/world/stage.js';
import {createPuzzleStage,validatePuzzleStructure} from '../src/world/puzzleStage.js';
import {challengeDifficulty} from '../src/game/challenge.js';

const fixture=(seed=77)=>({
 maze:{seed,size:7,start:{x:0,y:0},goal:{x:6,y:6}},wallThickness:.24,
 walls:[{x:-.12,y:-.12,w:7.24,h:.24,materialId:'rubber'},
  {x:1.5,y:3,w:4,h:.24,materialId:'rubber'},
  {x:3,y:1.5,w:.24,h:4,materialId:'cork'}],
 zones:[{kind:'ice',cells:[{x:2,y:2}]}],
});

test('32面以前・本編以外・対象の床も仕掛けもない面は完全に維持する',()=>{
 for(const difficulty of [null,{stage:33},{themed:true,stage:1},{themed:true,stage:32}]){
  const stage=fixture(),before=structuredClone(stage);
  assert.equal(applyProgressiveWalls(stage,difficulty),stage);
  assert.deepEqual(stage,before);
 }
 const plain=fixture();plain.zones=[];const before=structuredClone(plain);
 applyProgressiveWalls(plain,{themed:true,stage:33,level:'normal'});
 assert.deepEqual(plain,before);
});

test('33面以降も原配合を残し、種と面番号から同じ配合を再現する',()=>{
 for(const level of ['easy','normal']){
  const seen=new Set();
  for(let seed=1;seed<=128;seed++){
   const difficulty={themed:true,stage:33,level},stage=fixture(seed),before=structuredClone(stage);
   applyProgressiveWalls(stage,difficulty);seen.add(stage.wallVariety?.profile);
   const again=fixture(seed);applyProgressiveWalls(again,difficulty);
   assert.deepEqual(stage,again);
   if(stage.wallVariety?.profile==='original')assert.deepEqual(stage.walls,before.walls);
  }
  assert.deepEqual(seen,new Set(['original','mixed','accent']));
 }
});

function assertSameWallUnion(before,after){
 for(const wall of before){
  const horizontal=wall.w>=wall.h,axis=horizontal?'x':'y',length=horizontal?'w':'h';
  const pieces=after.filter(w=>w.id===wall.id).sort((a,b)=>a[axis]-b[axis]);
  assert.ok(pieces.length);
  let end=wall[axis];
  for(const piece of pieces){
   assert.ok(Math.abs(piece[axis]-end)<1e-10,'分割区間に穴・重複を作らない');
   assert.equal(piece[horizontal?'y':'x'],wall[horizontal?'y':'x']);
   assert.equal(piece[horizontal?'h':'w'],wall[horizontal?'h':'w']);
   end=piece[axis]+piece[length];
  }
  assert.ok(Math.abs(end-wall[axis]-wall[length])<1e-10);
 }
}

test('固定壁の合併形状と外周・綿・可動壁・既存の危険素材・入口を保つ',()=>{
 const added=new Set();
 for(let seed=1;seed<=128;seed++){
  const stage=fixture(seed);stage.walls[0].id='outer';stage.walls[1].id='horizontal';stage.walls[2].id='vertical';
  const protectedWalls=[
   {id:'cotton',x:1.5,y:2,w:1,h:.24,materialId:'cotton',physicsMaterial:{damageK:0}},
   {id:'stone',x:2,y:2,w:1,h:.24,materialId:'stone'},
   {id:'spike',x:4,y:4,w:1,h:.24,materialId:'spike'},
   {id:'moss',x:2,y:4,w:1,h:.24,materialId:'moss'},
   {id:'start',x:.5,y:1.1,w:1,h:.24,materialId:'cork'},
   {id:'goal',x:5.7,y:5.7,w:1,h:.24,materialId:'rubber'},
   {id:'portal-from',x:4.8,y:1.6,w:.8,h:.24,materialId:'rubber'},
   {id:'portal-to',x:4.8,y:2.8,w:.8,h:.24,materialId:'rubber'},
   {id:'waiting',x:1.5,y:4.9,w:1,h:.24,materialId:'cork'},
  ];
  stage.walls.push(...protectedWalls);
  stage.rackets=[{id:'gate',materialId:'racket',x:5,y:2,w:.24,h:1,axis:'x',min:4,max:6,physicsMaterial:{damageK:0}}];
  stage.puzzle={portals:[{from:{x:5,y:2},to:{x:5,y:3.2}}],anchors:{start:{x:.5,y:.5},goal:{x:6.5,y:6.5},waitingPoints:[{x:2,y:5.5}]}};
  const before=structuredClone(stage);
  applyProgressiveWalls(stage,{themed:true,stage:33,level:'normal'});
  for(const wall of [before.walls[0],...protectedWalls])assert.deepEqual(stage.walls.filter(w=>w.id===wall.id),[wall]);
  const {walls:oldWalls,...oldRest}=before,{walls:newWalls,wallVariety,collisionWalls,...newRest}=stage;
  assert.deepEqual(newRest,oldRest);
  assertSameWallUnion(oldWalls,newWalls);
  const changed=newWalls.filter(w=>['horizontal','vertical'].includes(w.id)&&w.materialId!==oldWalls.find(old=>old.id===w.id).materialId);
  if(wallVariety.profile!=='original')assert.ok(changed.length>=1);
  for(const wall of changed){added.add(wall.materialId);assert.ok(Math.max(wall.w,wall.h)<=1.24+1e-10,'長壁全体を危険にしない');}
  assert.equal(wallVariety.changedSegments,changed.length);
 }
 assert.ok(added.has('default'));assert.ok(added.has('stone'));assert.ok(added.has('spike'));
});

test('候補が一つでも変更の最低数は合計一つだけで、全素材を強制しない',()=>{
 let fallback=0,changed=0;
 for(let seed=1;seed<=128;seed++){
  const stage=fixture(seed);stage.walls=stage.walls.slice(0,1);
  const short={x:3,y:3,w:1,h:.24,materialId:'rubber'};stage.walls.push(short);
  const before=structuredClone(stage);
  applyProgressiveWalls(stage,{themed:true,stage:33,level:'normal'});
  const info=stage.wallVariety;
  assert.equal(info.eligibleSegments,1);assert.equal(stage.walls.length,2);
  assert.deepEqual(stage.walls[0],before.walls[0]);
  if(info.profile==='original'){assert.deepEqual(stage.walls,before.walls);continue;}
  changed++;assert.equal(info.changedSegments,1);assert.notEqual(stage.walls[1].materialId,'rubber');
  assert.ok(info.shortfall.length>=1,'少候補で欠ける素材は記録する');
  const {materialId,...geometry}=stage.walls[1],{materialId:old,...oldGeometry}=short;
  assert.deepEqual(geometry,oldGeometry,'一マス以下の壁を細分化しない');
  if(info.minimumChanged)fallback++;
 }
 assert.ok(changed>0);assert.ok(fallback>0);
});

test('7/13マス・全6種のパズルでも迷路・到達性・戸口の球径を維持する',()=>{
 const stages=[];
 for(const size of [7,13])for(const seed of [1,42,77]){
  const maze=generateMaze(size,seed);maze.variation={size,shape:'classic',themeId:'iceRubber'};
  stages.push(createStage(maze,challengeDifficulty(33,'normal')));
  for(const puzzleKind of ['racket','sequence','timing','openRacket','sequenceTiming','racketTiming']){
   stages.push(createPuzzleStage(seed,{size,puzzleKind,puzzleMaterialPattern:'mixedStandard'}));
  }
 }
 for(const stage of stages){
  stage.walls.forEach((wall,i)=>{wall.id=`fixed-${i}`;});
  const before=structuredClone(stage),difficulty={themed:true,stage:33,level:'normal'};
  applyProgressiveWalls(stage,difficulty);
  const {walls:oldWalls,...oldRest}=before,{walls:newWalls,wallVariety,collisionWalls,...newRest}=stage;
  assert.deepEqual(newRest,oldRest,'迷路・床・可動壁・時間負担の入力を変えない');
  assertSameWallUnion(oldWalls,newWalls);
  assert.deepEqual(checkReachability(stage.maze),checkReachability(before.maze));
  if(stage.puzzle)assert.equal(validatePuzzleStructure(stage).ok,true);
  const again=structuredClone(before);applyProgressiveWalls(again,difficulty);assert.deepEqual(stage,again);
 }
});

test('面数が進んでも配合抽選を一律に危険へ寄せず、原配合を残す',()=>{
 for(const level of ['easy','normal'])for(const number of [33,100,1000]){
  const count={original:0,mixed:0,accent:0};
  for(let seed=1;seed<=256;seed++){
   const stage=fixture(seed);applyProgressiveWalls(stage,{themed:true,stage:number,level});count[stage.wallVariety.profile]++;
  }
  assert.ok(count.original>=80&&count.original<=165,'後半も原配合を十分に残す');
  assert.ok(count.mixed>=65&&count.mixed<=140);
  assert.ok(count.accent>=8&&count.accent<=65,'少量のアクセントが消えず一律にもならない');
 }
});

const rectangle=wall=>({x:wall.x,y:wall.y,w:wall.w,h:wall.h});
const materialRegion=wall=>({...rectangle(wall),materialId:wall.materialId});

test('表示用の長壁を分割しても衝突用の個数・順序・矩形を保ち、全素材区間を対応させる',()=>{
 let split=0,unchangedRegion=false,shortMaterialMirrored=false;
 for(let seed=1;seed<=128;seed++){
  const stage=fixture(seed);stage.walls.forEach((wall,i)=>{wall.id=`wall-${i}`;});
  stage.walls.push({id:'short',x:1.8,y:4.8,w:1,h:.24,materialId:'rubber'});
  const before=structuredClone(stage);
  applyProgressiveWalls(stage,{themed:true,stage:33,level:'normal'});
  if(!stage.wallVariety.splitWalls){
   assert.equal(Object.hasOwn(stage,'collisionWalls'),false,'形を分割しない面へ衝突配列を足さない');
   continue;
  }
  split++;
  assert.ok(Array.isArray(stage.collisionWalls),'表示の継ぎ目を衝突の角にしないため元の矩形を持つ');
  assert.deepEqual(stage.collisionWalls.map(rectangle),before.walls.map(rectangle),'元の壁の順序・個数・座標を保つ');
  for(let i=0;i<before.walls.length;i++){
   const old=before.walls[i],collision=stage.collisionWalls[i],visual=stage.walls.filter(w=>w.id===old.id);
   if(visual.length>1){
    assert.equal(collision.materialId,old.materialId,'長壁の基底素材は元のまま');
    assert.deepEqual(collision.materialRegions,visual.map(materialRegion),'未変更片も含めて表示用の全区間を持つ');
    if(collision.materialRegions.some(region=>region.materialId===old.materialId))unchangedRegion=true;
   }else{
    assert.equal(collision.materialId,visual[0].materialId,'短壁の素材変更は衝突用にも反映する');
    assert.equal(Object.hasOwn(collision,'materialRegions'),false);
    if(old.id==='short'&&collision.materialId!==old.materialId)shortMaterialMirrored=true;
   }
  }
  assert.deepEqual(JSON.parse(JSON.stringify(stage.collisionWalls)),stage.collisionWalls,'衝突情報は循環参照や関数のない値');
  assert.doesNotThrow(()=>JSON.stringify(stage));
 }
 assert.ok(split>0);assert.equal(unchangedRegion,true);assert.equal(shortMaterialMirrored,true);
});
