import {createFloorPracticeStage} from '../world/floorPractice.js';
import {generateMaze} from '../maze/generator.js';
import {createStage} from '../world/stage.js';
import {FLOOR_CHALLENGE as C,BALL_LAB_COTTON} from '../config/gameConfig.js';

export const BALL_LAB_FLOORS={normal:'普通',ice:'氷',sand:'砂',gravity:'重力',repulsion:'反重力',mixed:'氷＋力場'};
export const BALL_LAB_WALLS={default:'標準',rubber:'ゴム',stone:'石',cork:'コルク',moss:'こけ',spike:'とげ',cotton:'綿'};
export function createBallLabStage({layout='plaza',floor='normal',wall='default',mixCotton=false,cottonCount=BALL_LAB_COTTON.count,floorValues={},wallValues={}}={}){
 const values={ice:C.ice,sand:C.sand,force:C.assistForce,radius:C.radius,...floorValues};
 const stage=layout==='maze'?createStage(generateMaze(7,913)):createFloorPracticeStage('normal');
 stage.theme={id:'ball-lab',label:'ボールのおためし'};
 const cotton=new Set(mixCotton?cottonWalls(stage).slice(0,Number.isFinite(cottonCount)?Math.max(0,Math.floor(cottonCount)):BALL_LAB_COTTON.count):[]);
 for(const w of stage.walls){w.materialId=cotton.has(w)?'cotton':Object.hasOwn(BALL_LAB_WALLS,wall)?wall:'default';if(Number.isFinite(wallValues[w.materialId]))w.physicsMaterial={restitutionK:wallValues[w.materialId]};}
 if(['ice','sand','mixed'].includes(floor))stage.zones.push({kind:floor==='sand'?'sand':'ice',cells:Array.from({length:49},(_,i)=>({x:i%7,y:Math.floor(i/7)})),frictionK:floor==='sand'?values.sand:values.ice,...(floor==='sand'?{}:C.iceMotion),forceX:0,forceY:0});
 if(['gravity','repulsion','mixed'].includes(floor))for(const [i,[x,y]]of [[4.5,.5],[.5,4.5],[4.5,4.5]].entries())stage.zones.push({kind:'radial',x,y,radius:values.radius,strength:values.force*(floor==='repulsion'||floor==='mixed'&&i===1?-1:1),corner:true});
 return stage;
}

// 同じ面・同じ数なら同じ配置。最初は外周4辺と中央の仕切りへ散らす。
// 追加する数は壁の総数まで有効で、残りは離れた位置から順に選ぶ。
function cottonWalls(stage){
 const size=stage.maze.size,mid=size/2,remaining=[...stage.walls],selected=[];
 const point=w=>({x:w.x+w.w/2,y:w.y+w.h/2});
 const distance=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
 for(const target of [{x:mid,y:0},{x:size,y:mid},{x:mid,y:size},{x:0,y:mid},{x:2,y:3},{x:5,y:3}]){
  if(!remaining.length)break;
  let best=0;for(let i=1;i<remaining.length;i++)if(distance(point(remaining[i]),target)<distance(point(remaining[best]),target))best=i;
  selected.push(...remaining.splice(best,1));
 }
 while(remaining.length){
  const clearance=w=>Math.min(...selected.map(s=>distance(point(w),point(s))));
  let best=0;for(let i=1;i<remaining.length;i++)if(clearance(remaining[i])>clearance(remaining[best]))best=i;
  selected.push(...remaining.splice(best,1));
 }
 return selected;
}
