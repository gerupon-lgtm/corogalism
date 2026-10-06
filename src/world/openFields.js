/** 広場の両区画へ同じ種類の力場を分散。端点と仕切り出口を保護する。 */
import {MAZE_VARIETY as C} from '../config/gameConfig.js';
import {createRng} from '../maze/rng.js';
export function placeOpenFields(stage){
 const {baffle,size}=stage.maze,fields=stage.zones.filter(z=>z.kind==='radial');
 if(!baffle||!fields.length)return;
 const templates=[...new Map(fields.map(z=>[Math.sign(z.strength),z])).values()];
 const rng=createRng((stage.maze.seed^0x7b16dca5)>>>0),placed=[],count=Math.max(2,Math.ceil(size/5));
 for(const side of [0,1])for(let i=0;i<count;i++){
  const source=templates[i%templates.length],lo=source.radius+.5+C.openFieldClearance;
  const hi=size-1-source.radius-C.openFieldClearance;
  const begin=side?baffle.coord:0,end=side?size:baffle.coord;
  const across=begin+.5+(end-begin-1)*(.35+rng()*.3);
  const fraction=i===0?0:i===count-1?1:(i-.15+rng()*.3)/(count-1);
  const along=lo+Math.max(0,hi-lo)*fraction;
  placed.push({...source,x:baffle.axis==='x'?across:along,y:baffle.axis==='y'?across:along,corner:false,branch:false});
 }
 stage.zones=stage.zones.filter(z=>z.kind!=='radial').concat(placed);
}
