import {FLOOR_CHALLENGE as C} from '../config/gameConfig.js';
import {createStage} from './stage.js';
import {solvePath,countTurns} from '../maze/path.js';
import {checkReachability} from '../maze/validator.js';
import {FLOOR_LESSONS} from './floorLearning.js';

/** 練習専用の広い面。本編の自動生成からは独立する。 */
export function createFloorPracticeStage(requested='normal'){
 const kind=Object.hasOwn(FLOOR_LESSONS,requested)?requested:'normal',size=7;
 const cells=Array.from({length:size*size},(_,i)=>({t:i<size?1:0,r:i%size===size-1?1:0,b:i>=size*(size-1)?1:0,l:i%size===0?1:0}));
 // 広く往復できるまま、短い仕切りを位置の目印にする。
 for(const [x,y]of [[2,2],[2,3],[5,2],[5,3]]){cells[y*size+x].l=1;cells[y*size+x-1].r=1;}
 const maze={size,seed:0,cells,start:{x:0,y:0},goal:{x:6,y:6}};
 if(!checkReachability(maze).ok)throw new Error('床の練習の到達性が不正です');
 maze.path=solvePath(maze);maze.pathLength=maze.path.length;maze.turns=countTurns(maze.path);
 const stage=createStage(maze);
 stage.theme={id:'floor-practice',label:`床の練習・${FLOOR_LESSONS[kind].label}`,practiceKind:kind};
 for(const w of stage.walls)w.materialId='cork';
 if(kind==='sand'||kind==='ice'){
  const tiles=[];
  for(const [x,y]of [[3,0],[0,3],[3,3]])for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)tiles.push({x:x+dx,y:y+dy});
  stage.zones.push({kind,cells:tiles,frictionK:C[kind],...(kind==='ice'?C.iceMotion:{}),forceX:0,forceY:0});
 }
 if(kind==='gravity'||kind==='repulsion')for(const [x,y]of [[4.5,.5],[.5,4.5],[4.5,4.5]])stage.zones.push({kind:'radial',x,y,radius:C.radius,strength:(kind==='gravity'?1:-1)*C.assistForce,corner:true});
 return stage;
}
