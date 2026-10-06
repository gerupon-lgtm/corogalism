/** 広場の床配置。元の経路上の床を保ち、空いた両区画にも遊ぶ場所を作る。 */
import {createRng} from '../maze/rng.js';
import {connectedCells} from './branchFloors.js';
import {MAZE_VARIETY as C} from '../config/gameConfig.js';

const key=p=>`${p.x},${p.y}`;
const clearOfEnds=(maze,p)=>Math.hypot(p.x,p.y)>1.5&&Math.hypot(p.x-maze.size+1,p.y-maze.size+1)>1.5;
function roomCells(maze,side){
 const {size,baffle}=maze;
 return maze.cells.map((_,i)=>({x:i%size,y:Math.floor(i/size)})).filter(p=>
  (p[baffle.axis]+.5<baffle.coord?0:1)===side&&clearOfEnds(maze,p));
}
function rankedSites(maze,side,i,count,rng,candidates){
 const {size,baffle}=maze,along=baffle.axis==='x'?'y':'x';
 const begin=side?baffle.coord:0,end=side?size:baffle.coord;
 const cross=begin+(end-begin)*(.3+rng()*.4),target=1.5+(size-3)*(i+.5)/count;
 return candidates.map(p=>({p,rank:Math.abs(p[along]+.5-target)+Math.abs(p[baffle.axis]+.5-cross)*.4+rng()*.35})).sort((a,b)=>a.rank-b.rank).map(v=>v.p);
}
export function spreadOpenSand(maze,cells){
 if(!maze.baffle)return cells;
 const result=[...new Map(cells.filter(p=>clearOfEnds(maze,p)).map(p=>[key(p),p])).values()],used=new Set(result.map(key));
 const rng=createRng((maze.seed^0x41e569a3)>>>0),count=Math.max(2,Math.ceil(maze.size/5));
 for(const side of [0,1])for(let i=0;i<count;i++){
  const candidates=roomCells(maze,side).filter(p=>!used.has(key(p)));
  const first=rankedSites(maze,side,i,count,rng,candidates)[0];if(!first)continue;
  const patch=[first],length=Math.ceil(maze.size/3)+(rng()<.5?0:1);
  while(patch.length<length){
   const neighbours=[...new Map(patch.flatMap(p=>connectedCells(maze,p,candidates)).map(p=>[key(p),p])).values()].filter(p=>!patch.some(q=>key(q)===key(p)));
   if(!neighbours.length)break;
   neighbours.sort((a,b)=>Math.hypot(a.x-first.x,a.y-first.y)-Math.hypot(b.x-first.x,b.y-first.y));
   patch.push(neighbours[0]);
  }
  for(const p of patch){result.push(p);used.add(key(p));}
 }
 return result;
}

export function addOpenFeatures(stage,{restSelected=false}={}){
 const {maze}=stage;if(!maze.baffle)return;
 const rests=()=>[stage.rest,...stage.extraRests].filter(Boolean),allItems=[stage.recovery,stage.leaf,stage.hourglass].filter(Boolean);
 const occupied=new Set([...allItems,...rests(),...stage.sticky].map(p=>key({x:Math.floor(p.x),y:Math.floor(p.y)})));
 const room=p=>p[maze.baffle.axis]<maze.baffle.coord?0:1;
 const site=(side,i,count,rng,eligible=()=>true)=>rankedSites(maze,side,i,count,rng,roomCells(maze,side)
  .filter(p=>!occupied.has(key(p))&&eligible({x:p.x+.5,y:p.y+.5})))[0];
 const tile=p=>({x:p.x+.5,y:p.y+.5});
 if(stage.theme.id==='rest'||stage.rest||restSelected){
  const rng=createRng((maze.seed^0x2a094eb3)>>>0);
  for(const side of [0,1])if(!rests().some(p=>room(p)===side)){
   const at=site(side,0,1,rng,p=>!stage.zones.some(z=>z.kind==='radial'&&Math.hypot(p.x-z.x,p.y-z.y)<z.radius));
   if(!at)continue;
   // 止まれる1マスの通常床。その他の氷・砂と素材係数はそのまま。
   for(const z of stage.zones.filter(z=>z.kind==='ice'))z.cells=z.cells.filter(c=>key(c)!==key(at));
   const rest={...tile(at),used:false,progress:0};
   if(stage.rest)stage.extraRests.push(rest);else stage.rest=rest;
   occupied.add(key(at));
  }
 }
 if(stage.theme.id==='sticky'){
  const rng=createRng((maze.seed^0x53e2a714)>>>0);
  for(const side of [0,1]){
   let count=stage.sticky.filter(p=>room(p)===side).length;
   while(count<2){const at=site(side,count,2,rng);if(!at)break;stage.sticky.push(tile(at));occupied.add(key(at));count++;}
  }
 }else{
  const rng=createRng((maze.seed^0x6da235f1)>>>0);
  if(rng()<C.openMixedStickyChance)for(const side of [0,1]){
   // 壁際の候補から抽選するだけ。ゴールへの軌道・成功率は配置に使わない。
   const candidates=roomCells(maze,side).filter(p=>!occupied.has(key(p))).filter(p=>{
    const t=tile(p);return stage.walls.some(w=>Math.hypot(t.x-Math.max(w.x,Math.min(t.x,w.x+w.w)),t.y-Math.max(w.y,Math.min(t.y,w.y+w.h)))<.8);
   });
   if(candidates.length){const at=candidates[Math.floor(rng()*candidates.length)];stage.sticky.push(tile(at));occupied.add(key(at));}
  }
 }
}
