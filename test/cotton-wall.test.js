import test from 'node:test';
import assert from 'node:assert/strict';
import {createBallLabStage,BALL_LAB_WALLS} from '../src/lab/ballLabStage.js';
import {BALL_MATERIALS,getBallMaterial} from '../src/world/ballMaterials.js';
import {getMaterial} from '../src/world/materials.js';
import {createActor,createStage} from '../src/world/stage.js';
import {generateMaze} from '../src/maze/generator.js';
import {checkReachability} from '../src/maze/validator.js';
import {BASE} from '../src/config/gameConfig.js';
import {resolveParams} from '../src/physics/resolveParams.js';
import {stepPhysics} from '../src/physics/integrator.js';
import {applyExploration,describeExploration} from '../src/lab/exploration.js';
import {createImpactBuffer} from '../src/audio/ballMaterialAudio.js';

test('綿壁は素材や速さを問わず反発ゼロ。以前の調整でも同じ吸収を試せる',()=>{
 assert.equal(BALL_LAB_WALLS.cotton,'綿');
 assert.equal(getMaterial('cotton').id,'cotton');
 for(const character of Object.values(BALL_MATERIALS))for(const speed of [.5,4,40])for(const unrestricted of [true,false]){
  assert.equal(resolveParams({base:BASE,character,material:getMaterial('cotton'),impactSpeed:speed,policy:{unrestricted,settleBounce:false}}).restitution,0);
 }
});

test('部分的な綿壁は両面で配置数を変えられ、形・経路・氷・残るゴムを保つ',()=>{
 for(const layout of ['plaza','maze']){
  const original=createBallLabStage({layout,wall:'rubber',floor:'ice'});
  const geometry=s=>s.walls.map(({x,y,w,h})=>({x,y,w,h}));
  for(const cottonCount of [0,1,6,original.walls.length+10]){
   const stage=createBallLabStage({layout,wall:'rubber',floor:'ice',mixCotton:true,cottonCount});
   assert.equal(stage.walls.filter(w=>w.materialId==='cotton').length,Math.min(cottonCount,stage.walls.length));
   assert.equal(stage.walls.filter(w=>w.materialId==='rubber').length,Math.max(0,stage.walls.length-cottonCount));
   assert.deepEqual(geometry(stage),geometry(original));assert.deepEqual(stage.maze.path,original.maze.path);
   assert.deepEqual(stage.zones,original.zones);assert.equal(checkReachability(stage.maze).ok,true);
  }
  const repeat=createBallLabStage({layout,wall:'rubber',mixCotton:true,cottonCount:6});
  assert.deepEqual(repeat.walls,createBallLabStage({layout,wall:'rubber',mixCotton:true,cottonCount:6}).walls);
  assert.ok(original.walls.every(w=>w.materialId==='rubber'));
 }
 assert.ok(createStage(generateMaze(7,123),{dangerRatio:.3,spikeShare:.5,mossRatio:.1}).walls.every(w=>w.materialId!=='cotton'));
});

test('氷で綿へ斜めに当たると壁へ向かう速さを吸収し、壁沿いの滑りと次の操作を残す',()=>{
 for(const ball of Object.keys(BALL_MATERIALS))for(const speed of [2,8,40]){
  const stage=createBallLabStage({floor:'ice',wall:'cotton'});applyExploration(stage);
  stage.walls=[{x:6.88,y:2,w:.24,h:1.24,materialId:'cotton'}];
  const actor=createActor(stage.maze,getBallMaterial(ball));Object.assign(actor,{x:6.59,y:2.5,vx:speed,vy:1});
  const result=stepPhysics({actor,stage,base:BASE,dt:1/120,tilt:{x:0,y:0}});
  assert.equal(result.halt,undefined);assert.ok(Math.abs(actor.vx)<1e-10,`${ball}/${speed}: 吸収`);
  assert.ok(actor.vy>.99,'壁沿いは滑る');assert.ok(actor.x<=6.605+1e-10,'壁を抜けない');
  stepPhysics({actor,stage,base:BASE,dt:1/120,tilt:{x:-.5,y:0}});
  assert.ok(actor.vx<0,'傾ければすぐ離れられる');
 }
});

test('混在する反発を区別して表示し、検証者が綿の数値を変えることもできる',()=>{
 const stage=createBallLabStage({wall:'rubber',mixCotton:true,cottonCount:6,wallValues:{rubber:3,cotton:.2}});applyExploration(stage);
 const actor=createActor(stage.maze,getBallMaterial('superball'));
 assert.match(describeExploration(actor,stage),/綿/);assert.match(describeExploration(actor,stage),/ゴム/);
 assert.ok(stage.walls.filter(w=>w.materialId==='cotton').every(w=>w.physicsMaterial.restitutionK===.2));
 assert.ok(stage.walls.filter(w=>w.materialId==='rubber').every(w=>w.physicsMaterial.restitutionK===3));
});

test('綿の衝突音は短い接触音で、硬い壁やゴムの響きと区別できる',()=>{
 const context={createBuffer(_channels,n,sampleRate){const data=new Float32Array(n);return {sampleRate,length:n,getChannelData:()=>data};}};
 for(const ball of Object.keys(BALL_MATERIALS)){
  const cotton=createImpactBuffer(context,ball,'cotton'),rubber=createImpactBuffer(context,ball,'rubber');
  const data=cotton.getChannelData(0);assert.ok(data.some(v=>Math.abs(v)>1e-5));assert.ok(data.every(Number.isFinite));
  assert.ok(cotton.length<rubber.length,'短い余韻');
 }
});
