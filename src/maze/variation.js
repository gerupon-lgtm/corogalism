/** 素材から独立した形の加工。最終状態を必ず到達性検証へ通す。 */
import {MAZE_VARIETY as C} from '../config/gameConfig.js';
import {generateMaze} from './generator.js';
import {createRng} from './rng.js';
import {checkReachability} from './validator.js';
import {solvePath,countTurns} from './path.js';

function edge(maze,x,y,side,value){
 const other=side==='r'?'l':'t',next=side==='r'?y*maze.size+x+1:(y+1)*maze.size+x;
 maze.cells[y*maze.size+x][side]=value;maze.cells[next][other]=value;
}
export function generateVariedMaze(profile,seed){
 const {size,shape='classic'}=profile,rng=createRng((seed^0x243f6a88)>>>0);
 let maze=generateMaze(size,seed);
 if(shape==='intricate'||shape==='short'){
  const candidates=[maze];
  for(let i=1;i<C.candidates;i++)candidates.push(generateMaze(size,Math.floor(rng()*0x100000000)>>>0));
  candidates.sort((a,b)=>a.pathLength-b.pathLength||a.turns-b.turns);
  const offset=Math.floor(rng()*2);
  maze=candidates[shape==='short'?offset:candidates.length-1-offset];
 }else if(shape==='roomy'){
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   if(x<size-1&&rng()<C.roomOpening)edge(maze,x,y,'r',0);
   if(y<size-1&&rng()<C.roomOpening)edge(maze,x,y,'b',0);
  }
 }else if(shape==='open'){
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   if(x<size-1)edge(maze,x,y,'r',0);
   if(y<size-1)edge(maze,x,y,'b',0);
  }
  const vertical=rng()<.5,coord=Math.max(1,Math.min(size-1,2+Math.floor(rng()*Math.max(1,size-4))));
  // 最後の1マスに出口を残し、スタートとゴールの直線を遮る。
  for(let i=0;i<size-1;i++)edge(maze,vertical?coord-1:i,vertical?i:coord-1,vertical?'r':'b',1);
  maze.baffle={axis:vertical?'x':'y',coord,gap:size-1};
  // 自由な区画にも短い壁を散らす。孤立を作る閉じ方は取り消す。
  for(let i=0;i<2+Math.floor(rng()*4);i++){
   const x=Math.floor(rng()*(size-1)),y=Math.floor(rng()*(size-1)),side=rng()<.5?'r':'b';
   if((vertical?x:y)<coord||x===size-2&&y===size-2)continue;
   const old=maze.cells[y*size+x][side];edge(maze,x,y,side,1);
   if(!checkReachability(maze).ok)edge(maze,x,y,side,old);
  }
 }else if(shape!=='classic')throw new Error(`不明な迷路の形: ${shape}`);
 if(!checkReachability(maze).ok)throw new Error(`面の形を加工した後の到達性が不正: ${size}/${shape}/${seed}`);
 maze.path=solvePath(maze);maze.pathLength=maze.path.length;maze.turns=countTurns(maze.path);
 maze.variation={...profile,shape,size,sourceSeed:seed>>>0};
 return maze;
}
