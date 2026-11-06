/** 素材の紹介用。開いている道を案内し、球や迷路は変更しない。 */
import {solvePath} from '../maze/path.js';
const clamp=v=>Math.max(-.45,Math.min(.45,v));
export function materialTutorialHint(maze,actor){
 const cell={x:Math.max(0,Math.min(maze.size-1,Math.floor(actor.x))),y:Math.max(0,Math.min(maze.size-1,Math.floor(actor.y)))};
 const path=solvePath({...maze,start:cell}),next=path[1]??maze.goal,target={x:next.x+.5,y:next.y+.5};
 const direction={x:clamp((target.x-actor.x)*.9-(actor.vx??0)*.38),y:clamp((target.y-actor.y)*.9-(actor.vy??0)*.38)};
 const name=(Math.abs(direction.y)>.10?(direction.y<0?'上':'下'):'')+(Math.abs(direction.x)>.10?(direction.x<0?'左':'右'):'');
 return {id:`material-${cell.x}-${cell.y}-${name}`,phase:'route',target,direction,text:name?`少し${name}に傾けてみよう。`:'水平に戻して、球の動きを見よう。'};
}
