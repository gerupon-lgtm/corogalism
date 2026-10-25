import assert from 'node:assert/strict';
import {createHp} from '../../../src/game/hp.js';
import {challengeDifficulty} from '../../../src/game/challenge.js';
import {generateMaze} from '../../../src/maze/generator.js';
import {stepPhysics} from '../../../src/physics/integrator.js';
import {stepMovingWallPhysics} from '../../../src/physics/movingWalls.js';
import {resolveCollisions} from '../../../src/physics/collision.js';
import {getCharacter} from '../../../src/world/characters.js';
import {BASE} from '../../../src/config/gameConfig.js';

const difficulty=challengeDifficulty(20,'normal');
const hp=turns=>createHp({turns,...difficulty});
const actor=(extra={})=>({x:3.71,y:3.5,vx:4,vy:0,r:.275,character:getCharacter('default'),...extra});
const stage=(size)=>({maze:{size},floors:Array(size*size).fill('default'),zones:[],walls:[{x:4,y:0,w:.24,h:size,materialId:'default'}]});
const report={parameters:difficulty,equalSpeed:[],physics:[],corner:[],generatedHp:[],runup:[]};
for(const size of [7,9,13]){
 const speeds=[1.2,2,3,4,6,10,30];
 report.equalSpeed.push({size,hp:hp(15).max,damage:speeds.map(speed=>({speed,dealt:hp(15).applyImpact(speed,{materialId:'default'},0)}))});
 for(const moving of [false,true]){
  const s=stage(size);if(moving)s.rackets=[{id:'remote',x:1,y:1,w:.12,h:1,axis:'y',min:1,max:2,materialId:'racket',vx:0,vy:0}];
  const a=actor(),h=hp(15),impacts=[];
  (moving?stepMovingWallPhysics:stepPhysics)({actor:a,stage:s,base:BASE,dt:1/60,tilt:{x:0,y:0},settings:{racketSpeed:4,speedLimit:30},onImpact:(speed,wall)=>impacts.push({speed,dealt:h.applyImpact(speed,wall,0)})});
  report.physics.push({size,moving,impacts,hpLost:h.max-h.value});
 }
 const a=actor({x:3.8,y:3.8,vx:4,vy:4}),h=hp(15),impacts=[];
 resolveCollisions(a,[{x:4,y:0,w:.24,h:size,materialId:'default'},{x:0,y:4,w:size,h:.24,materialId:'default'}],()=>.35,(speed,wall)=>impacts.push({speed,dealt:h.applyImpact(speed,wall,0)}));
 assert.equal(impacts.filter(i=>i.dealt>0).length,1);
 report.corner.push({size,impacts});
 const m=generateMaze(size,77),generated=hp(m.turns);
 report.generatedHp.push({size,seed:77,turns:m.turns,max:generated.max,cap:generated.max*difficulty.damageCapRatio,damageAt10:generated.applyImpact(10,{materialId:'default'},0)});
 for(const ice of [false,true]){
  const s=stage(size);s.walls=[{x:size-.12,y:0,w:.24,h:size,materialId:'default'}];
  if(ice)s.zones=[{kind:'ice',cells:Array.from({length:size*size},(_,i)=>({x:i%size,y:Math.floor(i/size)})),frictionK:.08,minAccelK:.28,transitionSpeed:1.2,forceX:0,forceY:0}];
  const a=actor({x:.5,y:2.5,vx:0}),h=hp(15);let first=null,time=0;
  while(!first&&time<20){time+=1/120;stepPhysics({actor:a,stage:s,base:BASE,dt:1/120,tilt:{x:1,y:0},onImpact:(speed,wall)=>{first??={speed,dealt:h.applyImpact(speed,wall,time)};}});}
  report.runup.push({size,ice,time,...first});
 }
}
for(const moving of [false,true])assert.equal(new Set(report.physics.filter(r=>r.moving===moving).map(r=>r.hpLost)).size,1);
assert.equal(new Set(report.equalSpeed.map(r=>JSON.stringify(r.damage))).size,1);
console.log(JSON.stringify(report,null,2));
