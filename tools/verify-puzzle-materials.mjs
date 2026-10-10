/** 素材ごとの代表操作と、以前の自動操作が失敗した例を残す。 */
import assert from 'node:assert/strict';
import {createPuzzleStage,validatePuzzleStructure,reachablePuzzlePoints} from '../src/world/puzzleStage.js';
import {PUZZLE_KINDS} from '../src/game/puzzleVariety.js';
import {checkReachability} from '../src/maze/validator.js';
import {solvePath,countTurns} from '../src/maze/path.js';
import {BASE,PUZZLE_MAIN,FLOOR_CHALLENGE,TUNING} from '../src/config/gameConfig.js';
import {createActor,sampleZone,goalCenter} from '../src/world/stage.js';
import {getCharacter} from '../src/world/characters.js';
import {stepMovingWallPhysics} from '../src/physics/movingWalls.js';
import {createTiltVector} from '../src/input/tiltVector.js';

const clamp=(n,max)=>Math.max(-max,Math.min(max,n));
/** 自動制御は到達性の確認。人の楽しさ・実機の傾きは別途ブラウザ/試遊で確かめる。 */
function runOperations(seed,profile,options={normalPilot:true}){
 const stage=createPuzzleStage(seed,profile),actor=createActor(stage.maze,getCharacter('default')),goal=goalCenter(stage.maze),input=createTiltVector();
 let clear=false,hits=0,time=0;
 const tick=tilt=>{
  input.setRaw(tilt.x,tilt.y);input.update(.016,BASE.inputSmoothing);
  const result=stepMovingWallPhysics({actor,stage,tilt:input.value,base:BASE,dt:.016,settings:stage.racketSettings,
   onImpact:()=>hits++,onTravel(from,to){const dx=to.x-from.x,dy=to.y-from.y,len=dx*dx+dy*dy,t=len?Math.min(1,((goal.x-from.x)*dx+(goal.y-from.y)*dy)/len):0;
    const at=Math.max(0,t);if(Math.hypot(from.x+dx*at-goal.x,from.y+dy*at-goal.y)<TUNING.goalRadius)clear=true;},
  });time+=.016;
  assert.equal(result.halt,undefined);
  assert.ok([actor.x,actor.y,actor.vx,actor.vy,...stage.rackets.flatMap(w=>[w.x,w.y,w.vx,w.vy])].every(Number.isFinite));
 };
 const context=target=>JSON.stringify({kind:stage.puzzle.kind,seed,size:profile.size,target,actor:{x:actor.x,y:actor.y,vx:actor.vx,vy:actor.vy},rackets:stage.rackets.map(w=>({id:w.id,x:w.x,y:w.y}))});
 const operations=structuredClone(stage.puzzle.verificationOperations);
 if(options.normalPilot&&['normalRubber','normalCork'].includes(profile.puzzleMaterialPattern)&&stage.puzzle.timingCount){
  const launch=operations.find(op=>op.kind==='until'),cut=operations[operations.indexOf(launch)+1],axis=launch.condition.axis;
  const approach=operations[operations.indexOf(launch)-1].via.at(-1),cross=axis==='x'?'y':'x';approach[cross]+=.8*Math.sign(cut.tilt[cross]);
  for(const key of ['min','max'])if(launch.condition[key]!==undefined)launch.condition[key]+=key==='min'?.9:-.9;
  launch.tilt[axis]*=4/7;launch.tilt[cross]=0;launch.maxSeconds=4;cut.maxSeconds=5;cut.tilt[axis]/=.7;cut.tilt[cross]/=.7;
 }
 let error=null;
 try{for(const op of operations){
  if(clear)break;
  if(op.kind==='hold')for(let i=0;i<Math.ceil(op.seconds/.016)&&!clear;i++)tick(op.tilt);
  else if(op.kind==='until'){
   let reached=false;
   for(let i=0;i<Math.ceil(op.maxSeconds/.016)&&!clear;i++){
    tick(op.tilt);const p=actor[op.condition.axis];reached=(op.condition.min===undefined||p>=op.condition.min)&&(op.condition.max===undefined||p<=op.condition.max);if(reached)break;
   }
   assert.ok(reached||clear,'切り返し条件に届く '+context(op.condition));
  }else for(const target of op.via){
   let reached=false;
   for(let i=0;i<1100&&!clear;i++){
    const dx=target.x-actor.x,dy=target.y-actor.y;
    if(Math.hypot(dx,dy)<.045&&Math.hypot(actor.vx,actor.vy)<.1){reached=true;break;}
    tick({x:clamp((clamp(dx*2,1.3)-actor.vx)*.45,.7),y:clamp((clamp(dy*2,1.3)-actor.vy)*.45,.7)});
   }
   assert.ok(reached||clear,'構造から選んだ通過点に届く '+context(target));if(clear)break;
  }
 }
 assert.ok(clear,'開始から傾き操作だけでクリアする '+context(goal));
 }catch(cause){error=cause.message;}
 return {time,hits,stage,actor,tick,error,clear};
}


import {mkdir,writeFile} from 'node:fs/promises';
const snapshot=sim=>({timeSec:Math.round(sim.time*1000)/1000,clear:sim.clear,impacts:sim.hits,error:sim.error,actor:{x:sim.actor.x,y:sim.actor.y,vx:sim.actor.vx,vy:sim.actor.vy}});
const successful=[];
for(const pattern of ['iceRubber','iceSandRubber','normalRubber','normalCork','iceSandCork','mixedStandard'])for(const kind of PUZZLE_KINDS){
 const seed=kind==='racketTiming'&&['iceSandCork','mixedStandard'].includes(pattern)?42:77;
 const profile={size:7,puzzleKind:kind,puzzleEase:'relaxed',puzzleMaterialPattern:pattern},sim=runOperations(seed,profile);
 successful.push({seed,kind,pattern,...snapshot(sim)});
}
const legacyFailures=[];
for(const pattern of ['normalRubber','normalCork','iceSandCork','mixedStandard']){
 const kind=['normalRubber','normalCork'].includes(pattern)?'timing':'racketTiming';
 const sim=runOperations(77,{size:7,puzzleKind:kind,puzzleEase:'relaxed',puzzleMaterialPattern:pattern},{normalPilot:false});
 const before=snapshot(sim);let escape=null;
 if(kind==='racketTiming'&&sim.error){
  const paddle=sim.stage.rackets.find(w=>w.id==='racket-horizontal'),longAxis=paddle.h>=paddle.w?'y':'x';
  const requested={x:0,y:0};requested[longAxis]=sim.actor[longAxis]>paddle[longAxis]+paddle[longAxis==='x'?'w':'h']/2?1:-1;
  const initial={x:sim.actor.x,y:sim.actor.y};let steps=0;
  for(;steps<63;steps++)sim.tick(requested);
  const p=sim.actor,dx=p.x-Math.max(paddle.x,Math.min(p.x,paddle.x+paddle.w)),dy=p.y-Math.max(paddle.y,Math.min(p.y,paddle.y+paddle.h));
  escape={input:requested,seconds:steps*.016,actor:{x:p.x,y:p.y,vx:p.vx,vy:p.vy},displacement:Math.hypot(p.x-initial.x,p.y-initial.y),clearance:Math.hypot(dx,dy),radius:p.r,escaped:Math.hypot(dx,dy)>p.r+.1};
 }
 legacyFailures.push({seed:77,kind,pattern,before,escape});
}
const output=process.env.PUZZLE_MATERIAL_OUTPUT??'docs/verification/puzzle-materials/physics.json';
await mkdir(output.slice(0,Math.max(output.lastIndexOf('/'),output.lastIndexOf('\\'))),{recursive:true});
const evidence={generatedAt:new Date().toISOString(),source:'shared-physics-automatic-control',teleport:false,physicsOverrides:false,inputNormalization:true,inputSmoothing:BASE.inputSmoothing,dtSec:.016,
 normalPilot:'Approach .8 cell toward crossing; pure tangent launch .4 to original condition +.9; cut with both raw components1, magnitude normalized by createTiltVector.',
 successful,legacyFailures,humanEnjoyment:'unverified',limitations:'Successful routes are representative seeds. Legacy PD stalls do not establish unreachable stages; escaping them is separately shown with actual input.'};
await writeFile(output,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({cases:successful.length,clears:successful.filter(c=>c.clear&&!c.error).length,legacyFailures:legacyFailures.map(c=>({kind:c.kind,pattern:c.pattern,error:!!c.before.error,escaped:c.escape?.escaped,clearance:c.escape?.clearance}))}));
if(successful.some(c=>c.error||!c.clear)||legacyFailures.some(c=>c.kind==='racketTiming'&&!c.escape?.escaped))process.exitCode=1;
