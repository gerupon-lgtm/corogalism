import test from 'node:test';
import assert from 'node:assert/strict';
import {createPuzzleStage} from '../src/world/puzzleStage.js';
import {PUZZLE_MATERIALS} from '../src/world/puzzleMaterials.js';
import {PUZZLE_KINDS} from '../src/game/puzzleVariety.js';
import {sampleZone} from '../src/world/stage.js';
import {getMaterial} from '../src/world/materials.js';
import {BASE,FLOOR_CHALLENGE} from '../src/config/gameConfig.js';

test('紹介用の通常床・通常壁は固定壁の例外設定も氷も綿も残さない',()=>{
 for(const kind of PUZZLE_KINDS){
  const stage=createPuzzleStage(77,{puzzleKind:kind,puzzleMaterialPattern:'tutorialNormal'});
  assert.equal(stage.zones.length,0);assert.equal(stage.floorLoad.sandCells,0);
  assert.ok(stage.walls.every(w=>w.materialId==='default'&&!w.physicsMaterial));
  assert.ok(stage.rackets.every(w=>w.physicsMaterial.damageK===0));
  assert.equal(sampleZone(stage,{x:1,y:1,vx:3,vy:0}).frictionK,1);
 }
});

test('6組合せ・6仕掛け・大小と回転反転で、素材が重複せず通常・氷・砂を網羅する',()=>{
 const patterns=Object.keys(PUZZLE_MATERIALS).filter(p=>p!=='tutorialNormal'),turns=new Set();
 for(const pattern of patterns)for(const kind of PUZZLE_KINDS)for(const [seed,size] of [[1,7],[42,9],[77,13],[790123,7]]){
  const stage=createPuzzleStage(seed,{size,puzzleKind:kind,puzzleMaterialPattern:pattern}),seen=new Set();
  turns.add(stage.puzzle.rotation+'/'+stage.puzzle.mirror);
  for(const z of stage.zones)for(const c of z.cells){
   assert.ok(Number.isInteger(c.x)&&Number.isInteger(c.y)&&c.x>=0&&c.y>=0&&c.x<size&&c.y<size);
   const id=c.y*size+c.x;assert.ok(!seen.has(id),'床の重複は先勝ちにならない');seen.add(id);
   const resolved=sampleZone(stage,{x:c.x+.5,y:c.y+.5,vx:4,vy:0});
   assert.equal(resolved.frictionK,z.kind==='ice'?FLOOR_CHALLENGE.ice:FLOOR_CHALLENGE.sand);
  }
  assert.equal(Object.values(stage.puzzle.materialCells).reduce((sum,n)=>sum+n,0),size**2);
  assert.ok(stage.walls.some(w=>w.materialId==='cotton'));
  assert.ok(stage.walls.filter(w=>w.materialId==='cotton').every(w=>getMaterial(w.materialId).damageK===0&&w.physicsMaterial.damageK===0&&w.physicsMaterial.restitutionK===0));
  assert.ok(stage.rackets.every(w=>w.materialId==='racket'&&w.physicsMaterial.damageK===0));
  assert.equal(stage.puzzle.verification.ok,true);
  const sand=stage.zones.find(z=>z.kind==='sand')?.cells??[];
  assert.equal(stage.floorLoad.sandCells,stage.maze.path.filter(c=>sand.some(s=>s.x===c.x&&s.y===c.y)).length);
  assert.equal(stage.puzzle.materialPattern,pattern);assert.equal(stage.theme.materialLabel,PUZZLE_MATERIALS[pattern].label);
  if(PUZZLE_MATERIALS[pattern].sand)assert.ok(sand.length>=2&&sand.length<=size,'砂は局所的な減速場所');
  for(const c of sand)assert.ok(!stage.puzzle.timingCells.some(t=>t.x===c.x&&t.y===c.y),'切り返し入口・助走へ砂を置かない');
  if(pattern==='mixedStandard')assert.ok(stage.puzzle.materialCells.ice>0&&stage.puzzle.materialCells.normal>0);
 }
 assert.ok(turns.size>=3,'異なる向きでも配置を検査');
});

test('素材選択は決定的で、迷路・開口・可動壁の形や反発係数を変更しない',()=>{
 for(const kind of PUZZLE_KINDS){
  const baseline=createPuzzleStage(42,{size:9,puzzleKind:kind});
  for(const pattern of Object.keys(PUZZLE_MATERIALS)){
   const args={size:9,puzzleKind:kind,puzzleMaterialPattern:pattern},stage=createPuzzleStage(42,args);
   assert.deepEqual(stage,createPuzzleStage(42,args));
   assert.deepEqual(stage.maze.cells,baseline.maze.cells);assert.deepEqual(stage.maze.start,baseline.maze.start);assert.deepEqual(stage.maze.goal,baseline.maze.goal);
   assert.deepEqual(stage.rackets,baseline.rackets);assert.deepEqual(stage.puzzle.portals,baseline.puzzle.portals);assert.deepEqual(stage.racketSettings,baseline.racketSettings);
   assert.equal(stage.puzzle.openingSeconds,baseline.puzzle.openingSeconds);
   assert.deepEqual(stage.walls.map(({x,y,w,h})=>({x,y,w,h})),baseline.walls.map(({x,y,w,h})=>({x,y,w,h})));
  }
 }
 assert.throws(()=>createPuzzleStage(77,{puzzleMaterialPattern:'unknown'}),/未定義/);
 assert.equal(BASE.friction,2.5);
});
