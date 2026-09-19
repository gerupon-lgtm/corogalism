/** 広い通路を蛇行して進む固定の練習面。全セルをBFS検証する。 */
import { TUTORIAL } from '../config/gameConfig.js';
import { checkReachability } from '../maze/validator.js';
import { solvePath, countTurns } from '../maze/path.js';
import { createStage } from './stage.js';
export function createTutorialStage() {
 const size=TUTORIAL.size;
 const cells=Array.from({length:size*size},(_,i)=>({t:i<size?1:0,r:i%size===size-1?1:0,b:i>=size*(size-1)?1:0,l:i%size===0?1:0}));
 for(const [y,from,to] of [[2,0,4],[4,2,6],[6,0,4]])for(let x=from;x<=to;x++){cells[y*size+x].t=1;cells[(y-1)*size+x].b=1;}
 // 短い仕切りで普通の迷路らしい曲がり角を加える。通路全体は塞がない。
 for(const [x,y] of [[2,0],[4,2],[3,4],[6,0],[6,1],[1,2],[1,3]]){cells[y*size+x].l=1;cells[y*size+x-1].r=1;}
 const maze={size,seed:0,cells,start:{x:0,y:0},goal:{x:6,y:6}};
 if(!checkReachability(maze).ok)throw new Error('チュートリアルの通路が接続されていません');
 maze.path=solvePath(maze);maze.pathLength=maze.path.length;maze.turns=countTurns(maze.path);
 const stage=createStage(maze);
 // 標準壁主体。横通路の先にも素材壁を置き、助走後の反発・被弾を体験する。
 for(const [y,x,materialId] of [[2,2,'rubber'],[2,4,'stone'],[4,5,'spike'],[6,1,'moss']]){
  const wall=stage.walls.find(w=>Math.abs(w.y-(y-stage.wallThickness/2))<.001&&Math.abs(w.x-(x-stage.wallThickness/2))<.001&&w.w>w.h);
  wall.materialId=materialId;
 }
 // 上段を右へ進んだ先はゴム、中段を左へ進んだ先はトゲ。
 // 2区間にして広い通路で少し進路がずれても当たりやすくする。
 for(const [x,y,materialId] of [[6,0,'rubber'],[6,1,'rubber'],[1,2,'spike'],[1,3,'spike']]){
  const wall=stage.walls.find(w=>Math.abs(w.x-(x-stage.wallThickness/2))<.001&&Math.abs(w.y-(y-stage.wallThickness/2))<.001&&w.h>w.w);
  wall.materialId=materialId;
 }
 stage.recovery={x:3.5,y:.5,collected:false};
 stage.leaf={x:5.5,y:2.5,collected:false};
 stage.rest={x:3.5,y:3.5,used:false,progress:0};
 stage.sticky=[{x:1.5,y:4.5}];
 stage.hourglass={x:4.5,y:5.5,collected:false};
 stage.theme={id:'tutorial',label:'素材にふれてみよう'};
 return stage;
}
