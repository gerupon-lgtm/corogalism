/** 広い通路を蛇行して進む固定の練習面。全セルをBFS検証する。 */
import { TUTORIAL } from '../config/gameConfig.js';
import { checkReachability } from '../maze/validator.js';
import { solvePath, countTurns } from '../maze/path.js';
import { createStage } from './stage.js';
export function createTutorialStage() {
 const size=TUTORIAL.size;
 const cells=Array.from({length:size*size},(_,i)=>({t:i<size?1:0,r:i%size===size-1?1:0,b:i>=size*(size-1)?1:0,l:i%size===0?1:0}));
 for(const [y,from,to] of [[2,0,4],[4,2,6],[6,0,4]])for(let x=from;x<=to;x++){cells[y*size+x].t=1;cells[(y-1)*size+x].b=1;}
 const maze={size,seed:0,cells,start:{x:0,y:0},goal:{x:6,y:6}};
 if(!checkReachability(maze).ok)throw new Error('チュートリアルの通路が接続されていません');
 maze.path=solvePath(maze);maze.pathLength=maze.path.length;maze.turns=countTurns(maze.path);
 const stage=createStage(maze);
 for(const w of stage.walls){
  if(w.y>1.8&&w.y<2)w.materialId=w.x<1?'default':w.x<3?'rubber':'stone';
  if(w.y>3.8&&w.y<4)w.materialId=w.x<4?'moss':'spike';
  if(w.y>5.8&&w.y<6)w.materialId=w.x<2?'moss':'default';
 }
 stage.recovery={x:3.5,y:.5,collected:false};
 stage.leaf={x:5.5,y:2.5,collected:false};
 stage.rest={x:3.5,y:3.5,used:false,progress:0};
 stage.sticky=[{x:1.5,y:4.5}];
 stage.hourglass={x:4.5,y:5.5,collected:false};
 stage.theme={id:'tutorial',label:'素材にふれてみよう'};
 return stage;
}
