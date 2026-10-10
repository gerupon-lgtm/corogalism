/**
 * ラケット検証専用。本編の加速・減速の順を保ち、動く壁だけ別に解く。
 * 長面の中心/端による返球は、物理的な平面反射とは別のゲームルール。
 * 速度・反発の上限は画面から指定する。4096回は計算を終えるための区切り。
 */
import {TUNING,LAB_EXPLORATION} from '../config/gameConfig.js';
import {stepPhysics} from '../physics/integrator.js';
import {resolveParams} from '../physics/resolveParams.js';
import {resolveCollisions} from '../physics/collision.js';
import {sampleMaterial,sampleZone} from '../world/stage.js';
import {getMaterial} from '../world/materials.js';

const EPS=1e-9;
const finiteOr=(value,fallback)=>Number.isFinite(value)?value:fallback;

export function stepRacketPhysics({actor,stage,tilt,base,dt,settings={},onImpact,onTravel}){
 const rackets=stage.rackets??[],ballTilt=finiteOr(settings.ballTilt,1),speedLimit=finiteOr(settings.speedLimit,TUNING.maxSpeed);
 const input={x:tilt.x*ballTilt,y:tilt.y*ballTilt};
 // ラケットを外した既定の比較は、計算刻みも含めて本編そのものを使う。
 if(!rackets.length&&speedLimit===TUNING.maxSpeed){
  const guard=checkMainStep({actor,stage,tilt:input,base,dt});
  if(guard)return {...guard,racketHits:0,blockedRackets:[]};
  const before={x:actor.x,y:actor.y,vx:actor.vx,vy:actor.vy};
  const result=stepPhysics({actor,stage,tilt:input,base,dt,onImpact,onTravel});
  if(![actor.x,actor.y,actor.vx,actor.vy].every(Number.isFinite)){
   Object.assign(actor,before);
   return {...result,racketHits:0,blockedRackets:[],halt:{reason:'nonfinite',steps:0,remainingSec:Math.min(dt,TUNING.maxDt),speed:Math.hypot(before.vx,before.vy),phase:'after-main-step'}};
  }
  return {...result,racketHits:0,blockedRackets:[]};
 }
 const step=Math.min(dt,TUNING.maxDt);
 if(!(step>0))return {wallHits:0,racketHits:0,params:null,blockedRackets:[]};
 const zone=sampleZone(stage,actor),p=resolveParams({base,character:actor.character,material:sampleMaterial(stage,actor),zone,policy:stage.physicsPolicy});
 const racketSpeed=finiteOr(settings.racketSpeed,4),aimAngleDeg=finiteOr(settings.aimAngleDeg,55),motionTransfer=finiteOr(settings.motionTransfer,0);
 let wallHits=0,racketHits=0,steps=0,remaining=step;
 const blocked=new Set(),snapshot=()=>({x:actor.x,y:actor.y,vx:actor.vx,vy:actor.vy});
 const valid=()=>[actor.x,actor.y,actor.vx,actor.vy,...rackets.flatMap(w=>[w.x,w.y,w.vx,w.vy])].every(Number.isFinite);
 const result=halt=>({wallHits,racketHits,params:p,blockedRackets:[...blocked],...(halt?{halt}: {})});
 const stop=reason=>result({reason,steps,remainingSec:remaining,speed:Math.hypot(actor.vx,actor.vy)});
 for(const w of rackets){w.vx=0;w.vy=0;w.blocked=false;}
 if(!valid()||![input.x,input.y,p.accel,p.friction,p.forceX,p.forceY,racketSpeed].every(Number.isFinite))return stop('nonfinite');
 const before=snapshot();
 actor.vx+=(input.x*p.accel+p.forceX)*step;actor.vy+=(input.y*p.accel+p.forceY)*step;
 const damp=Math.exp(-p.friction*step);actor.vx*=damp;actor.vy*=damp;
 if(!valid()){Object.assign(actor,before);return stop('nonfinite');}
 // 30は初期値。本編の丸めを新しい候補値へ重ねない。0以下は上限なし。
 const limit=speedLimit>0?speedLimit:Infinity,speed=Math.hypot(actor.vx,actor.vy);
 if(speed>limit){actor.vx*=limit/speed;actor.vy*=limit/speed;}
 const restitutionOf=(wall,impactSpeed)=>resolveParams({base,character:actor.character,material:{...getMaterial(wall.materialId),...wall.physicsMaterial},zone,impactSpeed,policy:stage.physicsPolicy}).restitution;
 while(remaining>0){
  if(steps>=LAB_EXPLORATION.maxSubsteps)return stop('workload');
  const ballSpeed=Math.hypot(actor.vx,actor.vy),wallSpeed=Math.max(0,...rackets.map(w=>{
   const axis=w.axis==='y'?'y':'x',requested=(axis==='y'?tilt.y:tilt.x)*racketSpeed;
   // レール端で停止している壁を、高速で走り続ける壁として数えない。
   return requested>0&&w[axis]>=w.max||requested<0&&w[axis]<=w.min?0:Math.abs(requested);
  }));
  const relativeSpeed=ballSpeed+wallSpeed;
  if(!Number.isFinite(relativeSpeed))return stop('nonfinite');
  const slice=relativeSpeed>0?Math.min(remaining,actor.r*.45/relativeSpeed):remaining;
  if(!(slice>0)||remaining-slice===remaining)return stop('precision');
  const from=snapshot(),wallBefore=rackets.map(w=>({x:w.x,y:w.y,vx:w.vx,vy:w.vy}));
  actor.x+=actor.vx*slice;actor.y+=actor.vy*slice;
  wallHits+=resolveCollisions(actor,stage.walls,restitutionOf,onImpact);
  for(const w of rackets){
   const axis=w.axis==='y'?'y':'x',old=w[axis],requested=(axis==='y'?tilt.y:tilt.x)*racketSpeed;
   const desired=Math.min(w.max,Math.max(w.min,old+requested*slice));
   const others=[...stage.walls,...rackets.filter(other=>other!==w)];
   // 球自身が狭いすき間へ進んだ場合も、その移動区間内の接触位置で止める。
   const oldContact=contact(actor,w);
   if(oldContact&&blockedPoint(project(actor,oldContact),actor.r,others,stage.maze.size)){
    const end={x:actor.x,y:actor.y};let low=0,high=1;
    for(let i=0;i<38;i++){const t=(low+high)/2,point={x:from.x+(end.x-from.x)*t,y:from.y+(end.y-from.y)*t};if(blockedPoint(point,actor.r,[...others,w],stage.maze.size))high=t;else low=t;}
    actor.x=from.x+(end.x-from.x)*low;actor.y=from.y+(end.y-from.y)*low;
   }
   let next=desired;
   const canMove=position=>{
    const candidate={...w,[axis]:position},hit=contact(actor,candidate);
    return !hit||!blockedPoint(project(actor,hit),actor.r,others,stage.maze.size);
   };
   if(next!==old&&!canMove(next)){
    let low=0,high=1;
    for(let i=0;i<38;i++){const t=(low+high)/2;if(canMove(old+(desired-old)*t))low=t;else high=t;}
    next=old+(desired-old)*low;w.blocked=true;blocked.add(w.id);
   }
   w[axis]=next;w.vx=axis==='x'?(next-old)/slice:0;w.vy=axis==='y'?(next-old)/slice:0;
   const hit=contact(actor,w,true);
   if(!hit)continue;
   const point=project(actor,hit);
   actor.x=point.x;actor.y=point.y;
   const relativeX=actor.vx-w.vx,relativeY=actor.vy-w.vy,vn=relativeX*hit.nx+relativeY*hit.ny;
   if(vn>=0)continue;
   const impactSpeed=-vn;
   onImpact?.(impactSpeed,w);racketHits++;if(impactSpeed>TUNING.wallHitSpeed)wallHits++;
   const material={...getMaterial(w.materialId),...w.physicsMaterial};
   // 専用反発だけは本編の素材上限に丸めず、編集した値を解決層へ渡す。
   if(Number.isFinite(settings.racketRestitution))material.restitutionK=settings.racketRestitution/base.wallRestitution;
   const rest=resolveParams({base,character:actor.character,material,zone,impactSpeed,policy:{...stage.physicsPolicy,unrestricted:true}}).restitution;
   const longFace=axis==='y'?Math.abs(hit.nx)>1-EPS:Math.abs(hit.ny)>1-EPS;
   if(longFace){
    const center=axis==='y'?w.y+w.h/2:w.x+w.w/2,half=axis==='y'?w.h/2:w.w/2;
    const offset=Math.max(-1,Math.min(1,(actor[axis]-center)/half)),angle=offset*aimAngleDeg*Math.PI/180;
    const outgoing=Math.hypot(actor.vx,actor.vy)*rest;
    if(axis==='y'){actor.vx=hit.nx*Math.cos(angle)*outgoing;actor.vy=Math.sin(angle)*outgoing+w.vy*motionTransfer;}
    else{actor.vy=hit.ny*Math.cos(angle)*outgoing;actor.vx=Math.sin(angle)*outgoing+w.vx*motionTransfer;}
   }else{
    // 短面や角に動く壁が当たる場合は、壁から見た速度を反射する。
    actor.vx-=(1+rest)*vn*hit.nx;actor.vy-=(1+rest)*vn*hit.ny;
   }
  }
  if(!valid()){Object.assign(actor,from);for(let i=0;i<rackets.length;i++)Object.assign(rackets[i],wallBefore[i]);return stop('nonfinite');}
  onTravel?.({x:from.x,y:from.y},{x:actor.x,y:actor.y});
  remaining=Math.max(0,remaining-slice);steps++;
 }
 const size=stage.maze.size;actor.x=Math.min(size-actor.r,Math.max(actor.r,actor.x));actor.y=Math.min(size-actor.r,Math.max(actor.r,actor.y));
 return result();
}

/**
 * 本編の計算を変えず、編集値が無限ループを生む条件だけ先に確かめる。
 * 入力は有限でも、加速度との積が数値として表せなくなる場合がある。
 */
function checkMainStep({actor,stage,tilt,base,dt}){
 const step=Math.min(dt,TUNING.maxDt);
 if(!(step>0))return null;
 const zone=sampleZone(stage,actor),p=resolveParams({base,character:actor.character,material:sampleMaterial(stage,actor),zone,policy:stage.physicsPolicy});
 const halt=reason=>({wallHits:0,params:p,halt:{reason,steps:0,remainingSec:step,speed:Math.hypot(actor.vx,actor.vy)}});
 if(![actor.x,actor.y,actor.vx,actor.vy,actor.r,tilt.x,tilt.y,p.accel,p.friction,p.forceX,p.forceY].every(Number.isFinite)||!(actor.r>0))return halt('nonfinite');
 let vx=actor.vx+(tilt.x*p.accel+p.forceX)*step,vy=actor.vy+(tilt.y*p.accel+p.forceY)*step;
 const damp=Math.exp(-p.friction*step);vx*=damp;vy*=damp;
 if(![vx,vy].every(Number.isFinite))return halt('nonfinite');
 // 制限なしの既存処理には刻みごとの停止・有限値保護が備わっている。
 if(stage.physicsPolicy?.unrestricted)return null;
 const speed=Math.hypot(vx,vy);
 if(!Number.isFinite(speed))return halt('nonfinite');
 const maxSpeed=Number.isFinite(actor.character?.maxSpeed)?Math.min(TUNING.maxSpeed,Math.max(TUNING.characterMinSpeed,actor.character.maxSpeed)):TUNING.maxSpeed;
 if(speed>maxSpeed){const k=maxSpeed/speed;vx*=k;vy*=k;}
 const sub=Math.max(1,Math.ceil(Math.hypot(vx,vy)*step/(actor.r*.6)));
 if(!Number.isFinite(sub))return halt('precision');
 if(sub>LAB_EXPLORATION.maxSubsteps)return halt('workload');
 return null;
}

// 接触法線と、球を矩形の外へ出すための距離。中心が矩形内でも外へ出せる。
function contact(actor,w,touch=false){
 const px=Math.max(w.x,Math.min(actor.x,w.x+w.w)),py=Math.max(w.y,Math.min(actor.y,w.y+w.h));
 const dx=actor.x-px,dy=actor.y-py,d=Math.hypot(dx,dy);
 if(d>actor.r+(touch?EPS:0)||!touch&&d>=actor.r)return null;
 if(d>EPS)return {nx:dx/d,ny:dy/d,push:Math.max(0,actor.r-d)};
 const edges=[{distance:actor.x-w.x,nx:-1,ny:0},{distance:w.x+w.w-actor.x,nx:1,ny:0},{distance:actor.y-w.y,nx:0,ny:-1},{distance:w.y+w.h-actor.y,nx:0,ny:1}];
 const edge=edges.reduce((a,b)=>a.distance<=b.distance?a:b);
 return {...edge,push:actor.r+edge.distance};
}
function project(actor,hit){return {x:actor.x+hit.nx*hit.push,y:actor.y+hit.ny*hit.push};}
function blockedPoint(point,r,walls,size){
 if(point.x<r-EPS||point.y<r-EPS||point.x>size-r+EPS||point.y>size-r+EPS)return true;
 return walls.some(w=>{const px=Math.max(w.x,Math.min(point.x,w.x+w.w)),py=Math.max(w.y,Math.min(point.y,w.y+w.h));return Math.hypot(point.x-px,point.y-py)<r-EPS;});
}
