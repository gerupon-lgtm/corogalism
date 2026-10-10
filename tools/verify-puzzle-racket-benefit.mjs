/** 開始地点から返球を使う小さな比較。自動操縦と人間の遊びやすさを分ける。 */
import {mkdir,writeFile} from 'node:fs/promises';
import {createPuzzleStage} from '../src/world/puzzleStage.js';
import {createActor,goalCenter} from '../src/world/stage.js';
import {getCharacter} from '../src/world/characters.js';
import {createTiltVector} from '../src/input/tiltVector.js';
import {stepMovingWallPhysics} from '../src/physics/movingWalls.js';
import {BASE,TUNING} from '../src/config/gameConfig.js';

const output=process.env.PUZZLE_BENEFIT_OUTPUT??'docs/verification/main-puzzles/benefit.json';
const clamp=(n,max)=>Math.max(-max,Math.min(max,n));
const EPS=1e-7;
function simulator(kind,seed=77){
 const stage=createPuzzleStage(seed,{size:7,puzzleKind:kind,puzzleEase:'relaxed'});
 const actor=createActor(stage.maze,getCharacter('default')),goal=goalCenter(stage.maze),input=createTiltVector();
 const {rotation,mirror}=stage.puzzle,n=stage.maze.size;
 const vector=p=>{let x=mirror?-p.x:p.x,y=p.y;for(let i=0;i<rotation;i++){const next=-y;y=x;x=next;}return {x,y};};
 const inverseVector=p=>{let x=p.x,y=p.y;for(let i=0;i<rotation;i++){const next=y;y=-x;x=next;}if(mirror)x=-x;return {x,y};};
 const inversePoint=p=>{let x=p.x,y=p.y;for(let i=0;i<rotation;i++){const next=y;y=n-x;x=next;}if(mirror)x=n-x;return {x,y};};
 const canonicalWall=wall=>{
  const corners=[{x:wall.x,y:wall.y},{x:wall.x+wall.w,y:wall.y},{x:wall.x,y:wall.y+wall.h},{x:wall.x+wall.w,y:wall.y+wall.h}].map(inversePoint);
  const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);
  return {...wall,x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
 };
 const snapshot=()=>{const p=inversePoint(actor),v=inverseVector({x:actor.vx,y:actor.vy});return {x:p.x,y:p.y,vx:v.x,vy:v.y};};
 const trace=[],impacts=[],recordedContactKeys=new Set();let time=0,clear=false,totalImpacts=0,droppedSamples=0,phase='start';
 function record(extra={}){if(trace.length<220)trace.push({timeSec:Math.round(time*1000)/1000,phase,...snapshot(),...extra});else droppedSamples++;}
 const sim={stage,actor,goal,trace,impacts,canonicalWall,inversePoint,inverseVector,snapshot,
  get clear(){return clear;},get time(){return time;},get totalImpacts(){return totalImpacts;},
  setPhase(value){phase=value;record({phaseStart:true});},
  wall(id){return canonicalWall(stage.rackets.find(w=>w.id===id));},
  step(requested){
   const world=vector(requested);input.setRaw(world.x,world.y);input.update(.016,BASE.inputSmoothing);
   const hits=[];
   const result=stepMovingWallPhysics({actor,stage,tilt:input.value,base:BASE,dt:.016,settings:stage.racketSettings,
    onImpact(speed,wall){totalImpacts++;hits.push({id:wall.id??wall.materialId,material:wall.materialId,speed,before:snapshot()});},
    onTravel(from,to){const dx=to.x-from.x,dy=to.y-from.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((goal.x-from.x)*dx+(goal.y-from.y)*dy)/length)):0;
     if(Math.hypot(from.x+dx*t-goal.x,from.y+dy*t-goal.y)<TUNING.goalRadius)clear=true;},
   });time+=.016;
   if(result.halt)throw Error(`physics halt: ${result.halt.reason}`);
   if(![actor.x,actor.y,actor.vx,actor.vy].every(Number.isFinite))throw Error('nonfinite actor');
   const embedded=[...stage.walls,...stage.rackets].some(w=>{const x=Math.max(w.x,Math.min(actor.x,w.x+w.w)),y=Math.max(w.y,Math.min(actor.y,w.y+w.h));return Math.hypot(actor.x-x,actor.y-y)<actor.r-EPS;});
   if(embedded)throw Error('actor embedded in wall');
   for(const hit of hits){
    const key=`${phase}/${hit.id}`,event={timeSec:Math.round(time*1000)/1000,phase,...hit,after:snapshot()};
    if(hit.speed>.5||!recordedContactKeys.has(key)){if(impacts.length<40)impacts.push(event);record({impact:event});recordedContactKeys.add(key);}
   }
   if(Math.round(time/.016)%8===0)record({input:requested});
   return hits;
  },
  route(targets,name='route'){
   sim.setPhase(name);
   for(const target of targets){let reached=false;
    for(let i=0;i<1100&&!clear;i++){
     const p=snapshot(),dx=target.x-p.x,dy=target.y-p.y;
     if(Math.hypot(dx,dy)<.045&&Math.hypot(p.vx,p.vy)<.1){reached=true;break;}
     sim.step({x:clamp((clamp(dx*2,1.3)-p.vx)*.45,.7),y:clamp((clamp(dy*2,1.3)-p.vy)*.45,.7)});
    }
    if(!reached&&!clear)throw Error(`route stalled: ${JSON.stringify({target,actor:snapshot()})}`);
   }
  },
  hold(tilt,seconds,name){sim.setPhase(name);for(let i=0;i<Math.ceil(seconds/.016)&&!clear;i++)sim.step(tilt);},
  until(tilt,test,seconds,name){sim.setPhase(name);for(let i=0;i<Math.ceil(seconds/.016)&&!clear;i++){sim.step(tilt);if(test(snapshot()))return true;}return clear;},
  launch(id,tilt,seconds=2){sim.setPhase('aimed-racket-contact');for(let i=0;i<Math.ceil(seconds/.016)&&!clear;i++){const hit=sim.step(tilt).find(hit=>hit.id===id);if(hit)return {...hit,timeSec:Math.round(time*1000)/1000,phase,after:snapshot()};}return null;},
  aimAlong(id,fraction,standback=.8){
   sim.setPhase('aim-relative-to-moving-racket');
   for(let i=0;i<700&&!clear;i++){
    const wall=sim.wall(id),p=sim.snapshot(),dx=wall.x-actor.r-standback-p.x,dy=wall.y+wall.h*fraction-p.y;
    if(Math.hypot(dx,dy)<.035&&Math.hypot(p.vx,p.vy)<.08)return;
    sim.step({x:clamp((clamp(dx*2,1.3)-p.vx)*.45,.7),y:clamp((clamp(dy*2,1.3)-p.vy)*.45,.7)});
   }
   throw Error('moving-racket aim did not settle');
  },
  operations(ops){for(const op of ops){if(clear)break;
   if(op.kind==='route')sim.route(op.via.map(inversePoint),op.purpose);
   else if(op.kind==='hold')sim.hold(inverseVector(op.tilt),op.seconds,op.purpose);
   else if(op.kind==='until'){const tilt=inverseVector(op.tilt),condition=op.condition;const passed=sim.until(tilt,()=>{const p=actor[condition.axis];return (condition.min===undefined||p>=condition.min)&&(condition.max===undefined||p<=condition.max);},op.maxSeconds,op.purpose);if(!passed)throw Error('until condition not reached');}
  }},
  result(){return {kind,seed,size:n,rotation,mirror,goalReached:clear,elapsedSec:Math.round(time*1000)/1000,totalImpacts,recordedImpactCount:impacts.length,droppedSamples,final:snapshot(),canonicalGoal:inversePoint(goal),impacts,trace};},
 };
 record();return sim;
}

function baseline(kind){const sim=simulator(kind);try{sim.operations(sim.stage.puzzle.verificationOperations);return sim.result();}catch(error){return {...sim.result(),error:error.message};}}

function assistedRacket(){
 const sim=simulator('racket'),ops=sim.stage.puzzle.verificationOperations,course=ops[0].via.map(sim.inversePoint);
 try{
  sim.route(course.slice(0,2),'enter-upper-right-room');
  const wall=sim.wall('racket-vertical');
  sim.route([{x:wall.x-sim.actor.r-.8,y:wall.y+wall.h*.55}],'aim-below-racket-center');
  const impact=sim.launch('racket-vertical',{x:.7,y:0});
  if(!impact)throw Error('aimed wall was not contacted');
  sim.hold({x:0,y:0},.3,'observe-left-and-down-return');
  const returned=sim.snapshot();
  sim.route(course.slice(2,4),'return-through-next-opening');
  const afterOpening=sim.snapshot(),passed=afterOpening.y>=course[3].y-.1;
  sim.route(course.slice(4),'from-next-room-to-cup');
  return {...sim.result(),shot:{impact,afterNeutral:returned,afterOpening,nextRoomPassed:passed,directionChanged:impact.before.vx>0&&impact.after.vx<0&&impact.after.vy>0}};
 }catch(error){return {...sim.result(),error:error.message};}
}

function assistedRacketTiming(){
 const sim=simulator('racketTiming'),ops=sim.stage.puzzle.verificationOperations;
 try{
  const wall=sim.wall('racket-vertical'),door=sim.wall('timing-gate'),row=door.y+TUNING.wallThickness/2;
  sim.aimAlong('racket-vertical',.94);
  const impact=sim.launch('racket-vertical',{x:.7,y:0});
  if(!impact)throw Error('aimed wall was not contacted');
  const passed=sim.until({x:-.7,y:.5},p=>p.y>=row+TUNING.wallThickness/2+sim.actor.r,2,'open-gate-and-use-downward-return');
  const afterGate=sim.snapshot();
  if(!passed)throw Error('returned ball did not enter the next room');
  sim.operations([ops.at(-1)]);
  return {...sim.result(),shot:{impact,afterGate,nextRoomPassed:passed,directionChanged:impact.before.vx>0&&impact.after.vx<0&&impact.after.vy>0}};
 }catch(error){return {...sim.result(),error:error.message};}
}

function assistedOpenRacket(){
 const sim=simulator('openRacket'),ops=sim.stage.puzzle.verificationOperations;
 try{
  sim.operations(ops.slice(0,2));
  sim.route([sim.inversePoint(ops[2].via[0])],'enter-upper-right-room');
  sim.aimAlong('racket-vertical',.96,.6);
  const impact=sim.launch('racket-vertical',{x:.7,y:0});
  if(!impact)throw Error('aimed wall was not contacted');
  const entry=sim.inversePoint(ops.at(-1).via[0]);
  const passed=sim.until({x:0,y:0},p=>p.y>=entry.y-.03,3,'observe-return-through-next-opening');
  const afterOpening=sim.snapshot();
  if(!passed)throw Error('returned ball did not enter the next room');
  sim.operations([ops.at(-1)]);
  return {...sim.result(),shot:{impact,afterOpening,nextRoomPassed:passed,directionChanged:impact.before.vx>0&&impact.after.vx<0&&impact.after.vy>0}};
 }catch(error){return {...sim.result(),error:error.message};}
}

const kinds=(process.env.PUZZLE_BENEFIT_KINDS??'racket,openRacket,racketTiming').split(',');
const assistedPilots={racket:assistedRacket,openRacket:assistedOpenRacket,racketTiming:assistedRacketTiming};
const cases=[];
for(const kind of kinds){
 if(!assistedPilots[kind])throw Error(`No benefit pilot for ${kind}`);
 const before=baseline(kind),assisted=assistedPilots[kind]();
 const comparison={kind,baseline:before,assisted,elapsedDifferenceSec:Math.round((assisted.elapsedSec-before.elapsedSec)*1000)/1000,
  verdict:assisted.shot?.directionChanged&&assisted.shot.nextRoomPassed&&assisted.goalReached?'return-direction-demonstrated':'unconfirmed',
  fullCourseAdvantageConfirmed:false};cases.push(comparison);
 console.log(JSON.stringify({kind,baselineSec:before.elapsedSec,assistedSec:assisted.elapsedSec,goal:assisted.goalReached,shot:assisted.shot?.directionChanged,error:assisted.error,verdict:comparison.verdict}));
}
await mkdir(output.slice(0,Math.max(output.lastIndexOf('/'),output.lastIndexOf('\\'))),{recursive:true});
await writeFile(output,JSON.stringify({generatedAt:new Date().toISOString(),evidence:'shared-physics-automatic-control',teleport:false,debugWallPlacement:false,forcedHitRule:false,
 inputSmoothing:BASE.inputSmoothing,controller:{tickSec:.016,maxDesiredSpeed:1.3,positionGain:2,inputFeedback:.45,maxInputComponent:.7},
 limits:'Named aimed contacts are test observations. They do not lock game goals or change physics limits.',
 humanEnjoyment:'unverified',note:'The aimed route adds a deliberate setup. Whole-course time differences do not isolate the benefit of reflection.',cases},null,2)+'\n');
if(cases.some(example=>example.verdict==='unconfirmed'))process.exitCode=1;
