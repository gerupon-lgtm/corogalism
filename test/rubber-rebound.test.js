import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE} from '../src/config/gameConfig.js';
import {getMaterial} from '../src/world/materials.js';
import {getCharacter} from '../src/world/characters.js';
import {resolveParams} from '../src/physics/resolveParams.js';
import {stepPhysics} from '../src/physics/integrator.js';
import {createHp} from '../src/game/hp.js';
test('ゴムだけ0.9まで反発し、他素材の上限0.7を維持',()=>{
 assert.equal(resolveParams({base:BASE,material:getMaterial('rubber')}).restitution,.9);
 assert.equal(resolveParams({base:{...BASE,wallRestitution:2},material:getMaterial('stone')}).restitution,.7);
});
test('ゴムは無傷かつ無敵時間を作らず、直後の石の衝突がダメージになる',()=>{
 const shield={value:10},hp=createHp({turns:10,hpPerTurn:4,shield});
 assert.equal(hp.applyImpact(30,{materialId:'rubber'},1),0);assert.equal(hp.tookDamage,false);assert.equal(shield.value,10);
 assert.ok(hp.applyImpact(5,{materialId:'stone'},1.01)>0);assert.equal(hp.tookDamage,true);
});
test('実物理で1マス以上反発し、先の石でダメージを受ける',()=>{
 const actor={x:4.79,y:3.5,r:.22,vx:3,vy:0,character:getCharacter('default')};
 const stage={maze:{size:10},walls:[{x:5,y:0,w:.24,h:10,materialId:'rubber'}],floors:Array(100).fill('default'),zones:[]};
 const hits=[];let min=actor.x;
 for(let i=0;i<180;i++){stepPhysics({actor,stage,tilt:{x:0,y:0},base:BASE,dt:1/120,onImpact:(s,w)=>hits.push(w.materialId)});min=Math.min(min,actor.x);}
 assert.equal(hits[0],'rubber');assert.ok(4.78-min>1&&4.78-min<1.1);
 const hp=createHp({turns:10,hpPerTurn:4});actor.x=4.79;actor.vx=6;
 stage.walls.push({x:3.5,y:0,w:.24,h:10,materialId:'stone'});const damage=[];
 for(let i=0;i<150;i++)stepPhysics({actor,stage,tilt:{x:0,y:0},base:BASE,dt:1/120,onImpact:(s,w)=>damage.push({id:w.materialId,d:hp.applyImpact(s,w,i/120)})});
 assert.ok(damage.some(h=>h.id==='rubber'&&h.d===0));assert.ok(damage.some(h=>h.id==='stone'&&h.d>0));
});
