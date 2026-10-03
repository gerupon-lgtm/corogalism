/** 同じ初速・横向きの傾きで軌跡を比較。実素材の物理や人の操作感の保証ではない。 */
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createBallLabStage} from '../src/lab/ballLabStage.js';
import {BALL_MATERIALS,getBallMaterial} from '../src/world/ballMaterials.js';
import {createActor} from '../src/world/stage.js';
import {applyExploration} from '../src/lab/exploration.js';
import {stepPhysics} from '../src/physics/integrator.js';
import {BASE} from '../src/config/gameConfig.js';
const rows=[];
for(const floor of ['normal','ice'])for(const ball of Object.keys(BALL_MATERIALS)){
 const stage=createBallLabStage({floor});stage.walls=[];applyExploration(stage,'explore',false);
 const actor=createActor(stage.maze,getBallMaterial(ball));Object.assign(actor,{x:2.5,y:5.5,vx:3,vy:0});const points=[];
 for(let i=0;i<=120;i++){
  if(i%12===0)points.push({sec:i/120,x:actor.x,y:actor.y,vx:actor.vx,vy:actor.vy});
  if(i<120){const r=stepPhysics({actor,stage,base:BASE,dt:1/120,tilt:{x:0,y:-.5}});assert.ok(!r.halt);}
 }
 assert.ok(points.every(p=>p.x>actor.r&&p.x<7-actor.r&&p.y>actor.r&&p.y<7-actor.r));
 rows.push({floor,ball,conditions:{initialSpeed:3,tilt:{x:0,y:-.5},seconds:1,walls:false,physics:'explore',settleBounce:false},points});
}
await writeFile('docs/verification/exploration/turn.json',JSON.stringify(rows,null,2)+'\n');
console.table(rows.map(({floor,ball,points})=>({floor,ball,forward:+(points.at(-1).x-2.5).toFixed(3),sideways:+(5.5-points.at(-1).y).toFixed(3),forwardSpeed:+points.at(-1).vx.toFixed(3)})));
