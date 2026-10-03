import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createBallLabStage,BALL_LAB_FLOORS,BALL_LAB_WALLS} from '../src/lab/ballLabStage.js';
import {BALL_MATERIALS,getBallMaterial} from '../src/world/ballMaterials.js';
import {createActor} from '../src/world/stage.js';
import {applyExploration} from '../src/lab/exploration.js';
import {stepPhysics} from '../src/physics/integrator.js';
import {BASE} from '../src/config/gameConfig.js';
import {checkReachability} from '../src/maze/validator.js';
const rows=[];
for(const physics of ['explore','legacy'])for(const layout of ['plaza','maze'])for(const floor of Object.keys(BALL_LAB_FLOORS))for(const wall of Object.keys(BALL_LAB_WALLS))for(const ball of Object.keys(BALL_MATERIALS)){
 const stage=createBallLabStage({layout,floor,wall});applyExploration(stage,physics,physics==='legacy');
 assert.equal(checkReachability(stage.maze).ok,true);
 const actor=createActor(stage.maze,getBallMaterial(ball));let halt=null,peakSpeed=0,maxStepMs=0,steps=0;
 for(;steps<720;steps++){
  const start=performance.now();const result=stepPhysics({actor,stage,base:BASE,dt:1/120,tilt:{x:Math.sin(steps/45),y:Math.cos(steps/43)}});
  maxStepMs=Math.max(maxStepMs,performance.now()-start);peakSpeed=Math.max(peakSpeed,Math.hypot(actor.vx,actor.vy));
  assert.ok([actor.x,actor.y,actor.vx,actor.vy].every(Number.isFinite));
  assert.ok(actor.x>=actor.r-1e-7&&actor.x<=7-actor.r+1e-7&&actor.y>=actor.r-1e-7&&actor.y<=7-actor.r+1e-7);
  // 非停止の成功だけを残さない。増幅で続行できなかった条件も候補として保存。
  if(result.halt){halt=result.halt;break;}
 }
 rows.push({physics,layout,floor,wall,ball,steps,peakSpeed,maxStepMs,halt});
}
await mkdir('docs/verification/exploration',{recursive:true});
await writeFile('docs/verification/exploration/matrix.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify({cases:rows.length,halted:rows.filter(r=>r.halt).length,byReason:rows.filter(r=>r.halt).reduce((a,r)=>(a[r.halt.reason]=(a[r.halt.reason]||0)+1,a),{}),maxStepMs:Math.max(...rows.map(r=>r.maxStepMs))}));
