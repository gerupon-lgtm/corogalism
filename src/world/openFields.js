/** 広場の各空間へ同じ種類の力場を分散。端点と各出口の中央を空ける。 */
import {MAZE_VARIETY as C} from '../config/gameConfig.js';
import {createRng} from '../maze/rng.js';
import {openRooms,openFieldSiteAllowed} from './openFloors.js';
export function placeOpenFields(stage){
 const {baffle,size}=stage.maze,fields=stage.zones.filter(z=>z.kind==='radial');
 if(!baffle||!fields.length)return;
 const templates=[...new Map(fields.map(z=>[Math.sign(z.strength),z])).values()];
 const rng=createRng((stage.maze.seed^0x7b16dca5)>>>0),placed=[],count=Math.max(2,Math.ceil(size/5));
 const sites=new Map();
 for(const room of openRooms(stage.maze))for(let i=0;i<count;i++){
  const source=templates[i%templates.length],across=room.begin+(room.end-room.begin)*(.35+rng()*.3);
  const along=1.5+(size-3)*(i+.5)/count,candidates=[];
  const siteKey=`${room.id}/${source.radius}`;
  if(!sites.has(siteKey)){
   const eligible=[];
   // 同じ空間・半径の可否は一度だけ調べる。並びと乱数の消費は変えない。
   for(let cross=room.begin+.5;cross<=room.end-.5;cross+=.5)for(let length=.5;length<=size-.5;length+=.5){
    const at={x:room.axis==='x'?cross:length,y:room.axis==='y'?cross:length};
    if(at.x<=.5||at.y<=.5||at.x>=size-.5||at.y>=size-.5)continue;
    if(!openFieldSiteAllowed(stage.maze,at,source.radius))continue;
    // 印が壁に隠れる候補を避ける。外力が壁をまたぐ性質は変えない。
    if(stage.walls.some(w=>Math.hypot(at.x-Math.max(w.x,Math.min(at.x,w.x+w.w)),
     at.y-Math.max(w.y,Math.min(at.y,w.y+w.h)))<C.openFieldMarkerClearance))continue;
    eligible.push({cross,length,...at});
   }
   sites.set(siteKey,eligible);
  }
  for(const {cross,length,...at} of sites.get(siteKey)){
   const distance=Math.min(source.radius,...placed.map(z=>Math.hypot(z.x-at.x,z.y-at.y)));
   candidates.push({...at,rank:Math.abs(cross-across)*.4+Math.abs(length-along)+rng()*.2
    +Math.max(0,source.radius*.75-distance)*10});
  }
  candidates.sort((a,b)=>a.rank-b.rank);const at=candidates[0];if(!at)continue;
  placed.push({...source,x:at.x,y:at.y,corner:false,branch:false});
 }
 stage.zones=stage.zones.filter(z=>z.kind!=='radial').concat(placed);
}
