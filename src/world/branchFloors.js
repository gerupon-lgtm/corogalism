/** 自動生成した迷路の脇道。素材配置用で、通路の形は変更しない。 */
import { solvePath } from '../maze/path.js';

export function branchCells(maze, clearance=1.5) {
 const route=new Set((maze.path||solvePath(maze)).map(p=>`${p.x},${p.y}`));
 return maze.cells.map((_,i)=>({x:i%maze.size,y:Math.floor(i/maze.size)})).filter(p=>
  !route.has(`${p.x},${p.y}`)&&Math.hypot(p.x-maze.start.x,p.y-maze.start.y)>clearance
  &&Math.hypot(p.x-maze.goal.x,p.y-maze.goal.y)>clearance);
}

/** 壁をまたがずにつながる隣接マス。砂を小さなまとまりにする。 */
export function connectedCells(maze,p,candidates) {
 const wall=maze.cells[p.y*maze.size+p.x];
 return candidates.filter(q=>Math.abs(q.x-p.x)+Math.abs(q.y-p.y)===1
  &&!wall[q.x>p.x?'r':q.x<p.x?'l':q.y>p.y?'b':'t']);
}
