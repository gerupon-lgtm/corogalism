import {PROGRESSIVE_WALLS as C} from '../config/gameConfig.js';
import {createRng} from '../maze/rng.js';

// 同じ面の生成用乱数を消費せず、連続した種にも偏らない独立した列を使う。
function wallRng(seed,number){
 let value=(seed^Math.imul(number,0x9e3779b9)^0x51ed270b)>>>0;
 value=Math.imul(value^(value>>>16),0x85ebca6b);
 value=Math.imul(value^(value>>>13),0xc2b2ae35);
 return createRng((value^(value>>>16))>>>0);
}

const replaceable=new Set(['default','rubber','cork']);
const distanceToWall=(point,wall)=>Math.hypot(
 point.x-Math.max(wall.x,Math.min(point.x,wall.x+wall.w)),
 point.y-Math.max(wall.y,Math.min(point.y,wall.y+wall.h)));
const outerWall=(wall,size)=>wall.x<=0||wall.y<=0||wall.x+wall.w>=size||wall.y+wall.h>=size;
const materialCounts=walls=>{
 const counts={};for(const wall of walls)counts[wall.materialId]=(counts[wall.materialId]??0)+1;
 return counts;
};

function protectedPoints(stage){
 const {start,goal}=stage.maze,anchors=stage.puzzle?.anchors;
 const endpoints=[anchors?.start??{x:start.x+.5,y:start.y+.5},anchors?.goal??{x:goal.x+.5,y:goal.y+.5}];
 return [...endpoints.map(point=>({point,clearance:C.endpointClearance})),
  ...[...(anchors?.waitingPoints??[]),...(stage.puzzle?.portals??[]).flatMap(portal=>[portal.from,portal.to])]
   .filter(Boolean).map(point=>({point,clearance:C.portalClearance}))];
}

// 一セル分の壁は厚みを含めて約1.24マス。長壁の選択区間だけを後で実体化する。
function wallPieces(wall,maximum){
 const horizontal=wall.w>=wall.h,axis=horizontal?'x':'y',length=horizontal?'w':'h';
 const count=Math.ceil(wall[length]/maximum-1e-10);
 if(count<=1)return [wall];
 const pieces=[];let from=wall[axis];
 for(let i=1;i<=count;i++){
  const to=i===count?wall[axis]+wall[length]:wall[axis]+wall[length]*i/count;
  pieces.push({...wall,[axis]:from,[length]:to-from});from=to;
 }
 return pieces;
}

function drawMaterial(rng,ratios,exclude=null){
 const options=Object.entries(ratios).filter(([id,ratio])=>ratio>0&&id!==exclude);
 let value=rng()*options.reduce((sum,[,ratio])=>sum+ratio,0);
 for(const [id,ratio] of options){value-=ratio;if(value<0)return id;}
 return options.at(-1)?.[0]??null;
}

/** 本編の床・仕掛け面に、後半も緩急を残す壁の配合を加える。 */
export function applyProgressiveWalls(stage,difficulty){
 if(!difficulty?.themed||!Number.isFinite(difficulty.stage)||difficulty.stage<C.startStage)return stage;
 if(!stage.puzzle&&!stage.zones.some(z=>['ice','sand','radial'].includes(z.kind)))return stage;
 const level=difficulty.level==='easy'?'easy':'normal',number=Math.floor(difficulty.stage);
 const rng=wallRng(stage.maze.seed,number),weights=C.weights[level];
 const value=rng()*weights.reduce((sum,n)=>sum+n,0);
 const profile=value<weights[0]?'original':value<weights[0]+weights[1]?'mixed':'accent';
 const points=protectedPoints(stage),maximum=C.segmentSize+(stage.wallThickness??0);
 const candidates=[],groups=stage.walls.map(wall=>{
  const keep=!replaceable.has(wall.materialId)||wall.physicsMaterial||outerWall(wall,stage.maze.size)||(stage.rackets??[]).includes(wall);
  const pieces=(keep?[wall]:wallPieces(wall,maximum)).map(piece=>({wall:piece,target:null}));
  if(!keep)for(const piece of pieces)if(points.every(({point,clearance})=>distanceToWall(point,piece.wall)>clearance))candidates.push(piece);
  return {wall,pieces};
 });
 const ratios=C.ratios[profile]??{},changedCounts={default:0,stone:0,spike:0};
 let minimumChanged=false;
 if(profile!=='original'){
  for(const piece of candidates){
   let choice=rng();
   for(const [id,ratio] of Object.entries(ratios)){
    choice-=ratio;if(choice<0){piece.target=id;break;}
   }
  }
  if(candidates.length&&!candidates.some(piece=>piece.target&&piece.target!==piece.wall.materialId)){
   // 最低一つは配合を変えるが、少数の候補へ全種類を強制しない。
   const piece=candidates[Math.floor(rng()*candidates.length)];
   piece.target=drawMaterial(rng,ratios,piece.wall.materialId);minimumChanged=Boolean(piece.target);
  }
 }
 let changedSegments=0,splitWalls=0;
 const before=materialCounts(stage.walls),walls=[],collisionWalls=[];
 for(const group of groups){
  const changed=group.pieces.some(piece=>piece.target&&piece.target!==piece.wall.materialId);
  if(!changed){walls.push(group.wall);collisionWalls.push(group.wall);continue;}
  const visualPieces=[];
  for(const piece of group.pieces){
   if(piece.target&&piece.target!==piece.wall.materialId){
    visualPieces.push({...piece.wall,materialId:piece.target});changedCounts[piece.target]++;changedSegments++;
   }else visualPieces.push(piece.wall);
  }
  walls.push(...visualPieces);
  if(group.pieces.length>1){
   splitWalls++;
   // 表示の継ぎ目を衝突の角にしない。接触時の素材だけを区間から選べるようにする。
   collisionWalls.push({...group.wall,materialRegions:visualPieces.map(({x,y,w,h,materialId})=>({x,y,w,h,materialId}))});
  }else{
   collisionWalls.push(visualPieces[0]);
  }
 }
 const inputWallCount=stage.walls.length;
 if(changedSegments)stage.walls=walls;
 if(splitWalls)stage.collisionWalls=collisionWalls;
 stage.wallVariety={version:1,profile,level,stage:number,seed:stage.maze.seed,
  eligibleSegments:candidates.length,protectedSegments:groups.reduce((sum,g)=>sum+g.pieces.length,0)-candidates.length,
  changedSegments,changedCounts,minimumChanged,splitWalls,inputWallCount,outputWallCount:stage.walls.length,
  ratios:{...ratios},expectedCounts:Object.fromEntries(Object.entries(ratios).map(([id,ratio])=>[id,candidates.length*ratio])),
  shortfall:Object.keys(ratios).filter(id=>!changedCounts[id]),countsBefore:before,countsAfter:materialCounts(stage.walls)};
 return stage;
}
