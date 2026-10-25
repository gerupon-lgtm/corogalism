import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveCollisions} from '../src/physics/collision.js';
import {stepPhysics} from '../src/physics/integrator.js';
import {stepMovingWallPhysics} from '../src/physics/movingWalls.js';
import {resolveParams} from '../src/physics/resolveParams.js';
import {createHp} from '../src/game/hp.js';
import {getMaterial} from '../src/world/materials.js';
import {getCharacter} from '../src/world/characters.js';
import {BASE} from '../src/config/gameConfig.js';

const character=getCharacter('default');
const hp=()=>createHp({turns:15,hpPerTurn:4,damageMult:.5});
function geometry(vertical=true){
 const wall=vertical?{x:3,y:1,w:.24,h:4,materialId:'default'}:{x:1,y:3,w:4,h:.24,materialId:'default'};
 const pieces=vertical?[{...wall,h:2},{...wall,y:3,h:2}]:[{...wall,w:2},{...wall,x:3,w:2}];
 return {wall,pieces};
}
function integrate(input,wall,pieces,path){
 const stage={maze:{size:7},floors:Array(49).fill('default'),zones:[],walls:pieces??[wall]};
 if(pieces)stage.collisionWalls=[{...wall,materialRegions:pieces}];
 if(path==='exploration')stage.physicsPolicy={unrestricted:true};
 if(path==='moving')stage.rackets=[{id:'remote',x:.5,y:.5,w:.12,h:1,axis:'y',min:.5,max:1.5,materialId:'racket',vx:0,vy:0}];
 const actor={...input,character},health=hp(),impacts=[];
 const result=(path==='moving'?stepMovingWallPhysics:stepPhysics)({actor,stage,base:BASE,dt:.01,tilt:{x:0,y:0},settings:{speedLimit:30},onImpact:(speed,w)=>impacts.push({speed,id:w.materialId,dealt:health.applyImpact(speed,w,0)})});
 return {actor,hits:result.wallHits,impacts,hpLost:health.max-health.value};
}
test('12例の継ぎ目で、素材分割した表示壁でも元の一枚壁と位置・反射・HPが一致する',()=>{
 const cases=[];
 for(const offset of [-.05,0,.05])for(const tangent of [0,1.5])cases.push({vertical:true,offset,tangent});
 for(const offset of [-.05,.05])for(const tangent of [0,1.5])cases.push({vertical:false,offset,tangent});
 for(const offset of [-.05,.05])cases.push({vertical:true,offset,tangent:0,reverse:true});
 assert.equal(cases.length,12);
 for(const c of cases){
  const {wall,pieces}=geometry(c.vertical);if(c.reverse)pieces.reverse();
  const input=c.vertical?{x:2.8,y:3+c.offset,vx:2.5,vy:c.tangent,r:.275}:{x:3+c.offset,y:2.8,vx:c.tangent,vy:2.5,r:.275};
  for(const path of ['normal','exploration','moving'])assert.deepEqual(integrate(input,wall,pieces,path),integrate(input,wall,null,path),`${path}: ${JSON.stringify(c)}`);
 }
});

function contactAt(y,regions,extra={}){
 const {wall}=geometry();Object.assign(wall,extra);
 if(regions)wall.materialRegions=regions;
 const actor={x:2.8,y,vx:2.5,vy:0,r:.275},health=hp(),callbacks=[];
 resolveCollisions(actor,[wall],(hit,speed)=>{
  callbacks.push({kind:'restitution',hit,speed});
  return resolveParams({base:BASE,character,material:{...getMaterial(hit.materialId),...hit.physicsMaterial},impactSpeed:speed}).restitution;
 },(speed,hit)=>callbacks.push({kind:'impact',hit,speed,dealt:health.applyImpact(speed,hit,0)}));
 return {actor,callbacks,hpLost:health.max-health.value,wall};
}
test('素材境界の両側で接触点の素材を反発・被弾へ渡し、元の壁形状は変えない',()=>{
 const {pieces}=geometry();pieces[1].materialId='stone';
 for(const [y,id] of [[2.95,'default'],[3.05,'stone']]){
  const actual=contactAt(y,pieces),expected=contactAt(y,null,{materialId:id});
  assert.deepEqual(actual.actor,expected.actor);assert.equal(actual.hpLost,expected.hpLost);
  for(const {hit} of actual.callbacks){assert.equal(hit.materialId,id);for(const key of ['x','y','w','h'])assert.equal(hit[key],actual.wall[key]);}
 }
 assert.notEqual(contactAt(2.95,pieces).actor.vx,contactAt(3.05,pieces).actor.vx);
 assert.ok(contactAt(2.95,pieces).hpLost<contactAt(3.05,pieces).hpLost);
});
test('通常・制限なし・動く壁経路で、各区間の素材の反発とHPが一枚の同素材壁に一致する',()=>{
 const {wall,pieces}=geometry();pieces[1].materialId='stone';
 for(const [y,materialId] of [[2.95,'default'],[3.05,'stone']])for(const path of ['normal','exploration','moving']){
  const input={x:2.8,y,vx:2.5,vy:0,r:.275};
  assert.deepEqual(integrate(input,wall,pieces,path),integrate(input,{...wall,materialId},null,path),`${path}: ${materialId}`);
 }
});
test('共有境界の微小な誤差では先の素材を一貫選択し、特殊係数も保持する',()=>{
 const {pieces}=geometry();pieces[1].materialId='stone';
 const physicsMaterial={restitutionK:.5};
 for(const y of [3-5e-10,3,3+5e-10]){
  const result=contactAt(y,pieces,{physicsMaterial});
  assert.equal(result.callbacks.length,2);
  for(const {hit} of result.callbacks){assert.equal(hit.materialId,'default');assert.equal(hit.physicsMaterial,physicsMaterial);}
 }
 assert.equal(contactAt(3+1e-6,pieces).callbacks[0].hit.materialId,'stone');
});
test('領域なし・接触点に該当領域なしは従来の壁オブジェクトと素材を渡す',()=>{
 for(const regions of [null,[{x:3,y:1,w:.24,h:.1,materialId:'stone'}]]){
  const result=contactAt(3.05,regions);
  for(const {hit} of result.callbacks){assert.equal(hit,result.wall);assert.equal(hit.materialId,'default');}
 }
});
