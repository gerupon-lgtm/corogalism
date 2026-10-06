/** 反発広場の力場を遮蔽壁の先へ置く。強さや半径は既存値を保つ。 */
import {MAZE_VARIETY as C} from '../config/gameConfig.js';
export function placeOpenFields(stage){
 const {baffle,size}=stage.maze,fields=stage.zones.filter(z=>z.kind==='radial');
 if(!baffle)return;
 for(const [i,z] of fields.entries()){
  const across=Math.max((baffle.coord+size)/2,baffle.coord+z.radius+C.openFieldClearance);
  const lo=z.radius+C.openFieldClearance,hi=size-1-z.radius-C.openFieldClearance;
  const along=lo+(Math.max(lo,hi)-lo)*(fields.length>1?i/(fields.length-1):.5);
  z.x=baffle.axis==='x'?across:along;z.y=baffle.axis==='y'?across:along;
  z.corner=false;z.branch=false;
 }
}
