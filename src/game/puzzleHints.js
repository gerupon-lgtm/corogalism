/**
 * 動く壁の紹介コース専用の案内。表示だけを決め、球・壁・入力を変更しない。
 * 生成時の通過点と戸の開口を使い、球の位置・勢い・現在の戸の位置から判断する。
 * 固定秒数で次へ進めない。戻った球には手前の戸の案内を出し直す。
 */
import {PUZZLE_HINTS as H} from '../config/gameConfig.js';
import {getCharacter} from '../world/characters.js';

const clamp=(value,max)=>Math.max(-max,Math.min(max,value));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const vector=(a,b)=>({x:b.x-a.x,y:b.y-a.y});
const speed=actor=>Math.hypot(actor.vx??0,actor.vy??0);
const rectangleDistance=(p,w)=>Math.hypot(p.x-clampTo(p.x,w.x,w.x+w.w),p.y-clampTo(p.y,w.y,w.y+w.h));
const clampTo=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const active=status=>status===undefined||status===null||status===true||['playing','active','running'].includes(status);

/** 行き先との間に綿などの静止壁があれば、壁の端を回る通過点を選ぶ。 */
function createNavigation(stage){
 const radius=getCharacter('default').sizeRatio/2,step=H.navigationStep;
 const n=Math.round((stage.maze.size-1)/step)+1,count=n*n;
 const point=i=>({x:.5+(i%n)*step,y:.5+Math.floor(i/n)*step});
 const free=new Uint8Array(count),fields=new Map();
 for(let i=0;i<count;i++)free[i]=stage.walls.every(w=>rectangleDistance(point(i),w)>=radius+H.navigationClearance);
 const nearest=p=>{let chosen=-1,best=Infinity;for(let i=0;i<count;i++){if(!free[i])continue;const d=distance(p,point(i));if(d<best){best=d;chosen=i;}}return chosen;};
 const neighbors=i=>[i%n?i-1:-1,i%n<n-1?i+1:-1,i>=n?i-n:-1,i<count-n?i+n:-1].filter(j=>j>=0&&free[j]);
 const lineFree=(a,b)=>{const slices=Math.max(1,Math.ceil(distance(a,b)/step));for(let i=0;i<=slices;i++){const t=i/slices,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};if(stage.walls.some(w=>rectangleDistance(p,w)<radius-1e-8))return false;}return true;};
 return (actor,target)=>{
  if(lineFree(actor,target))return target;
  const end=nearest(target);if(end<0)return target;
  if(!fields.has(end)){
   const field=new Uint16Array(count);field.fill(65535);field[end]=0;const queue=[end];
   for(let head=0;head<queue.length;head++)for(const next of neighbors(queue[head]))if(field[next]===65535){field[next]=field[queue[head]]+1;queue.push(next);}
   fields.set(end,field);
  }
  const field=fields.get(end);let node=nearest(actor),chosen=null;
  if(node<0||field[node]===65535)return target;
  for(let guard=0;guard<count;guard++){
   const p=point(node);if(lineFree(actor,p))chosen=p;else if(chosen)break;
   if(node===end)break;
   const next=neighbors(node).filter(i=>field[i]<field[node]).sort((a,b)=>field[a]-field[b]||distance(actor,point(a))-distance(actor,point(b)))[0];
   if(next===undefined)break;node=next;
  }
  return chosen??target;
 };
}

function directionName(direction){
 const x=Math.abs(direction.x),y=Math.abs(direction.y),largest=Math.max(x,y);
 if(largest<H.directionDeadZone)return '';
 const horizontal=x/largest>=H.diagonalRatio?(direction.x<0?'左':'右'):'';
 const vertical=y/largest>=H.diagonalRatio?(direction.y<0?'上':'下'):'';
 return horizontal+vertical;
}

function describe(stage){
 const puzzle=stage?.puzzle;
 if(!puzzle)return [];
 const steps=[];
 for(const operation of puzzle.verificationOperations??[]){
  if(operation.kind==='route'){
   for(const target of operation.via??[]){
    const previous=steps.at(-1);
    if(previous?.kind!=='route'||distance(previous.target,target)>1e-8)steps.push({kind:'route',target});
   }
  }else if(operation.kind==='hold'){
   const number=Number(operation.until?.split('-').at(-1))||1;
   steps.push({kind:'gate',id:`gate-${number}`,waiting:puzzle.anchors.waitingPoints[number-1],tilt:operation.tilt});
  }else if(operation.kind==='until'&&steps.at(-1)?.kind!=='timing')steps.push({kind:'timing',id:'timing-gate'});
 }
 return steps;
}

function gateGeometry(stage,step){
 const gate=stage.rackets.find(w=>w.id===step.id),portal=stage.puzzle.portals.find(p=>p.id===step.id);
 if(!gate||!portal)return null;
 const offset=vector(portal.from,portal.to),length=Math.hypot(offset.x,offset.y);
 const normal={x:offset.x/length,y:offset.y/length},middle={x:(portal.from.x+portal.to.x)/2,y:(portal.from.y+portal.to.y)/2};
 const open=stage.puzzle.anchors.gateStates.open[gate.id],closed=stage.puzzle.anchors.gateStates.closed[gate.id];
 return {gate,portal,normal,middle,open,closed,openSign:Math.sign(open-closed),axis:gate.axis,
  normalAxis:gate.axis==='x'?'y':'x',span:gate.axis==='x'?gate.w:gate.h};
}

function routeInstruction(stage,actor,target,index,tilt,navigate){
 const destination=target;target=navigate(actor,target);
 const desired={x:clamp((clamp((target.x-actor.x)*H.routeGain,H.routeSpeed)-(actor.vx??0))*H.routeDamping,H.routeMaxTilt),
  y:clamp((clamp((target.y-actor.y)*H.routeGain,H.routeSpeed)-(actor.vy??0))*H.routeDamping,H.routeMaxTilt)};
 const to=vector(actor,target),length=Math.hypot(to.x,to.y),velocity={x:actor.vx??0,y:actor.vy??0};
 const alignment=length&&speed(actor)?dot(to,velocity)/(length*speed(actor)):0;
 const goal=distance(destination,stage.puzzle.anchors.goal)<H.waypointRadius&&distance(target,destination)<H.waypointRadius;
 const paddle=stage.rackets.find(w=>w.bounce!=='reflect'&&rectangleDistance(actor,w)<=actor.r+H.paddleDistance&&
  rectangleDistance({x:actor.x+velocity.x*H.paddlePredictionSec,y:actor.y+velocity.y*H.paddlePredictionSec},w)<rectangleDistance(actor,w));
 const name=directionName(desired);
 if(!name&&speed(actor)>H.momentumMinSpeed&&alignment>H.coastAlignment){
  return {id:`coast-${index}`,phase:'coast',text:'水平に戻して、球の勢いで進もう。',target,direction:{x:0,y:0}};
 }
 if(paddle&&name)return {id:`paddle-${paddle.id}-${name}`,phase:'racket',text:`少し${name}に傾けて、ラケットのそばで調整しよう。`,target,direction:desired};
 if(!goal&&length>H.coastDistance&&speed(actor)>H.coastSpeed&&alignment>H.coastAlignment&&dot(tilt,velocity)>0){
  return {id:`coast-${index}`,phase:'coast',text:'水平に戻して、球の勢いで進もう。',target,direction:{x:0,y:0}};
 }
 const braking=dot(desired,to)<0;
 const phase=goal?'goal':braking?'brake':'route';
 const text=!name?'水平に戻して、球を落ち着かせよう。':braking?`弱く${name}に傾けて、勢いを落とそう。`:
  goal?`少し${name}に傾けて、カップへ入ろう。`:`少し${name}に傾けて、${index===0?'入口':'次の通路'}へ進もう。`;
 return {id:`${phase}-${index}-${name}`,phase,text,target,direction:desired};
}

export function createPuzzleHints(stage){
 const steps=describe(stage);
 const navigate=steps.length?createNavigation(stage):(_,target)=>target;
 let index=0,current=null,candidate=null,candidateMs=0,displayMs=0,timingCut=false;

 function reset(){index=0;current=null;candidate=null;candidateMs=displayMs=0;timingCut=false;}
 function gateSide(actor,geometry){return dot(vector(geometry.middle,actor),geometry.normal);}

 function select(actor,tilt){
  if(!steps.length)return null;
  const radius=actor.r??getCharacter('default').sizeRatio/2;
  // 戸を抜けた後に入口へ戻ったら、その戸から試し直す。
  for(let i=index-1;i>=0;i--){
   if(!['gate','timing'].includes(steps[i].kind))continue;
   const geometry=gateGeometry(stage,steps[i]);
   if(geometry&&gateSide(actor,geometry)<-radius-H.crossingMargin&&
      (stage.puzzle.gateCount===1||distance(actor,geometry.middle)<H.retryDistance)){
    index=i;timingCut=false;break;
   }
  }
  for(let guard=0;guard<steps.length;guard++){
   const step=steps[index];
   if(!step)return routeInstruction(stage,actor,stage.puzzle.anchors.goal,index,tilt,navigate);
   if(step.kind==='route'){
    if(distance(actor,step.target)<H.waypointRadius&&speed(actor)<H.waypointSpeed){index++;timingCut=false;continue;}
    // 通過点を経由せずに戸を抜けられた場合も、前の部屋へ誘導しない。
    const nextGate=steps.findIndex((s,i)=>i>index&&s.kind!=='route');
    if(nextGate>=0){const geometry=gateGeometry(stage,steps[nextGate]);if(geometry&&gateSide(actor,geometry)>radius+H.crossingMargin){index=nextGate+1;timingCut=false;continue;}}
    return routeInstruction(stage,actor,step.target,index,tilt,navigate);
   }
   const geometry=gateGeometry(stage,step);
   if(!geometry){index++;continue;}
   const {gate,portal,normal,middle,open,closed,openSign,axis,normalAxis,span}=geometry;
   if(gateSide(actor,geometry)>radius+H.crossingMargin){index++;timingCut=false;continue;}
   const openEnough=Math.abs(gate[axis]-open)<H.gateOpenTolerance;
   const cross={x:middle.x,y:middle.y,[axis]:actor[axis]};
   const pathClear=rectangleDistance(cross,gate)>radius+H.crossingMargin;
   if(step.kind==='gate'){
    if(!openEnough&&!pathClear){
     const direction={x:0,y:0,[axis]:openSign*H.crossingTilt};
     return {id:`open-${gate.id}`,phase:'open',text:`少し${directionName(direction)}に傾けて、${gate.label}の戸を開こう。`,target:step.waiting??portal.from,direction};
    }
    const next=steps[index+1]?.kind==='route'?steps[index+1].target:portal.to;
    const instruction=routeInstruction(stage,actor,next,index,tilt,navigate);
    if(instruction.phase!=='route'||!directionName(instruction.direction))return instruction;
    return {...instruction,id:`pass-${gate.id}-${directionName(instruction.direction)}`,phase:'pass',text:`少し${directionName(instruction.direction)}に傾けて、開いた通路へ。`};
   }
   const cutCoordinate=closed+span/2+openSign*H.cutOffset;
   const alongSpeed=(actor[axis==='x'?'vx':'vy']??0)*-openSign;
   // 早すぎる切り返しは球を戸に押し戻すため、入口への実到着を待つ。
   const crossedCut=(actor[axis]-cutCoordinate)*openSign<=0;
   // 切り返しの案内は勢いが残るうちに出す。開口まで来て止まった球にも出せる。
   if(crossedCut&&(alongSpeed>H.momentumMinSpeed||Math.abs(actor[axis]-cutCoordinate)<radius))timingCut=true;
   // 球が入口の手前へ戻ったら、固定手順を続けずに勢いを作り直す。
   if(timingCut&&openEnough&&(actor[axis]-cutCoordinate)*openSign>span/2&&alongSpeed<=0)timingCut=false;
   if(!timingCut){
    const prepareInput=clamp((-openSign*H.preparationSpeed-(actor[axis==='x'?'vx':'vy']??0))*H.routeDamping,H.preparationTilt);
    const direction={x:normal.x*H.approachTilt,y:normal.y*H.approachTilt,[axis]:prepareInput};
    const name=directionName(direction),adjusting=prepareInput*openSign>0;
    const text=adjusting?`弱く${name}に傾けて、勢いを調整しよう。`:`少し${name}に傾けて、入口へ進もう。`;
    return {id:`prepare-${gate.id}-${adjusting?'adjust':'forward'}-${name}`,phase:'build-momentum',text,target:{...portal.from,[axis]:cutCoordinate},direction};
   }
   const direction={x:normal.x*H.crossingTilt,y:normal.y*H.crossingTilt,[axis]:openSign*H.reverseTilt};
   const predictedCross={x:actor.x+(actor.vx??0)*H.predictionSec,y:actor.y+(actor.vy??0)*H.predictionSec};
   if(openEnough&&pathClear&&rectangleDistance({...predictedCross,[normalAxis]:middle[normalAxis]},gate)>radius+H.crossingMargin&&
      gateSide(actor,geometry)>-radius*2&&dot({x:actor.vx??0,y:actor.vy??0},normal)>H.coastSpeed){
    return {id:`slide-${gate.id}`,phase:'slide',text:'水平に戻して、勢いで通ろう。',target:portal.to,direction:{x:0,y:0}};
   }
   const crossName=directionName(normal),reverseName=directionName({x:0,y:0,[axis]:openSign});
   return {id:`cut-${gate.id}`,phase:'cutback',urgent:true,text:`今、${crossName}へ寄せつつ弱く${reverseName}へ切り返そう。`,target:portal.to,direction};
  }
  return null;
 }

 function update({actor,tilt={x:0,y:0},elapsedMs=0,status}={}){
  if(!active(status)||!actor||![actor.x,actor.y,actor.vx??0,actor.vy??0].every(Number.isFinite))return current;
  const delta=clampTo(Number.isFinite(elapsedMs)?elapsedMs:0,0,H.maxFrameMs);
  const next=select(actor,tilt?.value??tilt??{x:0,y:0});
  if(!next)return current;
  displayMs+=delta;
  if(!current||next.urgent&&next.id!==current.id){current=next;displayMs=0;candidate=null;candidateMs=0;return current;}
  if(next.id===current.id){current=next;candidate=null;candidateMs=0;return current;}
  if(candidate?.id===next.id)candidateMs+=delta;else {candidate=next;candidateMs=delta;}
  if(candidateMs>=H.candidateMs&&displayMs>=H.minimumDisplayMs){current=next;displayMs=0;candidate=null;candidateMs=0;}
  return current;
 }
 return {update,reset,get current(){return current;}};
}
