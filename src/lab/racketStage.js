import {BASE,FLOOR_CHALLENGE,TUNING} from '../config/gameConfig.js';
import {checkReachability} from '../maze/validator.js';
import {solvePath,countTurns} from '../maze/path.js';
import {createStage,goalCenter} from '../world/stage.js';

// 数値は比較を始める値。検証ページから変更でき、本編の採用値ではない。
export const RACKET_DEFAULTS={
 mode:'rackets',cotton:true,racketSpeed:4,racketRestitution:1.08,aimAngleDeg:55,
 motionTransfer:0,ballTilt:1,speedLimit:30,cottonRestitution:0,maxTiltAngleDeg:25,layout:'relay',
};
export const RACKET_LAYOUTS={relay:'折り返しの広場',practice:'打ち分けの広場'};

/** 本編のビー玉・氷を基準に、同じ静止壁で綿とラケットを比較する専用面。 */
export function createRacketStage(requested={}){
 const settings={...RACKET_DEFAULTS,...requested};
 const layout=Object.hasOwn(RACKET_LAYOUTS,settings.layout)?settings.layout:'relay';
 const mode=['baseline','cotton','rackets'].includes(settings.mode)?settings.mode:'rackets';
 const maze=createRacketMaze(layout),stage=createStage(maze);
 stage.labRacket=true;
 stage.theme={id:'racket-lab',label:RACKET_LAYOUTS[layout]};
 stage.racketSettings={...settings,layout,mode};
 for(const wall of stage.walls)wall.materialId='rubber';
 const useCotton=mode==='cotton'||mode==='rackets'&&settings.cotton;
 if(useCotton)for(const wall of cottonWalls(stage,layout)){
  wall.materialId='cotton';
  wall.physicsMaterial={frictionK:1,accelK:1,restitutionK:settings.cottonRestitution/BASE.wallRestitution,damageK:0};
 }
 stage.zones.push({
  kind:'ice',cells:Array.from({length:maze.size**2},(_,i)=>({x:i%maze.size,y:Math.floor(i/maze.size)})),
  frictionK:FLOOR_CHALLENGE.ice,...FLOOR_CHALLENGE.iceMotion,forceX:0,forceY:0,
 });
 const definitions=layout==='relay'?[
  {id:'vertical',x:5.4,y:1.9,w:TUNING.wallThickness,h:1.3,axis:'y',min:.8,max:2,home:1.9},
  {id:'horizontal',x:3.2,y:6,w:1.3,h:TUNING.wallThickness,axis:'x',min:.8,max:4.85,home:3.2},
 ]:[
  {id:'vertical',x:5.4,y:1.9,w:TUNING.wallThickness,h:1.3,axis:'y',min:.8,max:4,home:1.9},
  {id:'horizontal',x:2.2,y:6,w:1.3,h:TUNING.wallThickness,axis:'x',min:.8,max:4.6,home:2.2},
 ];
 stage.rackets=mode==='rackets'?definitions.map(p=>({
  ...p,vx:0,vy:0,materialId:'racket',
  physicsMaterial:{frictionK:1,accelK:1,restitutionK:settings.racketRestitution/BASE.wallRestitution,damageK:0},
 })):[];
 // 試遊・ブラウザ検証で使う開始条件。成功する軌道や強制ヒット条件ではない。
 stage.labAnchors={
  start:{x:.5,y:.5},goal:goalCenter(maze),
  verticalShot:{x:4.7,y:2.65,vx:4,vy:0},
  horizontalShot:layout==='relay'?{x:4.375,y:5.38,vx:0,vy:4}:{x:2.4,y:5.5,vx:2,vy:4},
  cottonBrake:{x:6.2,y:3.5,vx:4,vy:0},
  ...(layout==='relay'?{
   course:[{x:4.65,y:.75},{x:4.7,y:3.15},{x:1.65,y:3.4},{x:1.65,y:5.65},{x:4.6,y:5.55},{x:5.5,y:5.5},{x:5.5,y:4.5}],
   bottomProbe:{x:4.5,y:6.58,vx:3,vy:0},
  }:{}),
 };
 return stage;
}

function createRacketMaze(layout){
 const size=7,cells=Array.from({length:size**2},(_,i)=>({t:i<size?1:0,r:i%size===size-1?1:0,b:i>=size*(size-1)?1:0,l:i%size===0?1:0}));
 const horizontal=(y,from,to)=>{for(let x=from;x<to;x++){cells[y*size+x].t=1;cells[(y-1)*size+x].b=1;}};
 const vertical=(x,from,to)=>{for(let y=from;y<to;y++){cells[y*size+x].l=1;cells[y*size+x-1].r=1;}};
 // 二つの出口をずらして、傾き一発やL字の直行を防ぐ。ラケット利用のロックはない。
 if(layout==='relay'){
  horizontal(2,0,4);horizontal(5,3,4);horizontal(5,6,7);
  // カップは外周から離し、2マス幅の下向き入口から受ける。
  horizontal(4,4,6);vertical(4,4,5);vertical(6,4,5);
 }
 else horizontal(3,1,4);
 const maze={size,seed:0,cells,start:{x:0,y:0},goal:layout==='relay'?{x:5,y:4}:{x:6,y:6},labLayout:layout};
 if(!checkReachability(maze).ok)throw new Error('ラケットの広場の到達性が不正です');
 maze.path=solvePath(maze);maze.pathLength=maze.path.length;maze.turns=countTurns(maze.path);
 // BFSは静止壁の全セルの連結を検証する。可動壁はセル境界へ丸めない。
 maze.reachabilityScope='static-walls';
 return maze;
}

function cottonWalls(stage,layout){
 const targets=[{x:3.5,y:0},{x:7,y:3.5},{x:3.5,y:7},{x:0,y:3.5},
  ...(layout==='relay'?[{x:3.5,y:2},{x:3.5,y:5}]:[{x:1.5,y:3},{x:3.5,y:3}])];
 const remaining=[...stage.walls],selected=[];
 for(const target of targets){
  let best=0,distance=Infinity;
  for(let i=0;i<remaining.length;i++){
   const wall=remaining[i],d=(wall.x+wall.w/2-target.x)**2+(wall.y+wall.h/2-target.y)**2;
   if(d<distance){distance=d;best=i;}
  }
  selected.push(...remaining.splice(best,1));
 }
 return selected;
}
