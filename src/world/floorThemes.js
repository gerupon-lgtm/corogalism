/** 本編の床テーマ。迷路の加工と配置を決定的に行う。DOM・描画を持たない。 */
import { FLOOR_CHALLENGE } from '../config/gameConfig.js';
import { generateMaze } from '../maze/generator.js';
import { solvePath, countTurns } from '../maze/path.js';
import { checkReachability } from '../maze/validator.js';

export function cornerSites(maze, max=3, gap=5) {
 const sites=[];
 for(let i=3;i<maze.path.length-3;i++){
  const prev=maze.path[i-1],cell=maze.path[i],next=maze.path[i+1];
  if((cell.x-prev.x)*(next.y-cell.y)===(cell.y-prev.y)*(next.x-cell.x))continue;
  if(sites.length&&i-sites.at(-1).index<gap)continue;
  if(Math.hypot(cell.x,cell.y)<2.5||Math.hypot(cell.x-6,cell.y-6)<2.5)continue;
  sites.push({index:i,prev,cell,next});if(sites.length===max)break;
 }
 return sites;
}
export function prepareFloorMaze(input, theme) {
 if(!theme.floorPattern)return input;
 let maze=input;
 if(theme.firstVisit||theme.special){
  const candidates=[input];
  for(let i=1;i<FLOOR_CHALLENGE.mazeCandidates;i++)candidates.push(generateMaze(input.size,(input.seed+Math.imul(i,40503))>>>0));
  // 適地があり、短い経路を優先。無限再抽選はしない。
  maze=candidates.sort((a,b)=>theme.special?Math.min(3,cornerSites(b,4,3).length)-Math.min(3,cornerSites(a,4,3).length)||a.pathLength-b.pathLength:(cornerSites(b).length>0)-(cornerSites(a).length>0)||a.pathLength-b.pathLength)[0];
 }
 const sites=cornerSites(maze,theme.special?4:theme.firstVisit?1:theme.floorPattern==='iceAssist'?2:3,theme.special?3:5);
 if(theme.assist){
  const open=(a,b)=>{
   const dx=b.x-a.x,dy=b.y-a.y;
   const [s,o]=dx===1?['r','l']:dx===-1?['l','r']:dy===1?['b','t']:['t','b'];
   maze.cells[a.y*maze.size+a.x][s]=0;maze.cells[b.y*maze.size+b.x][o]=0;
  };
  for(const {prev,cell,next} of sites){
   const inner={x:prev.x+next.x-cell.x,y:prev.y+next.y-cell.y};
   if(inner.x<0||inner.y<0||inner.x>=maze.size||inner.y>=maze.size)continue;
   open(prev,inner);open(inner,next);
  }
 }
 if(!checkReachability(maze).ok)throw new Error('床テーマの到達性が不正です');
 maze.path=solvePath(maze);maze.pathLength=maze.path.length;maze.turns=countTurns(maze.path);
 maze.floorSites=sites;
 return maze;
}
export function addFloorTheme(stage,theme){
 if(!theme.floorPattern)return;
 const cfg=FLOOR_CHALLENGE,all=stage.maze.cells.map((_,i)=>({x:i%stage.maze.size,y:Math.floor(i/stage.maze.size)}));
 const sites=stage.maze.floorSites||cornerSites(stage.maze),pattern=theme.floorPattern;
 const sand=pattern==='sand'?sites.flatMap(s=>[s.prev,s.cell]):pattern.includes('Sand')||theme.special||pattern==='iceAssist'?sites.map(s=>s.prev):[];
 const isIce=pattern.startsWith('ice')||theme.special;
 const floor=(kind,cells)=>{if(cells.length)stage.zones.push({kind,cells,frictionK:cfg[kind],...(kind==='ice'?cfg.iceMotion:{}),forceX:0,forceY:0});};
 floor('sand',sand);
 if(isIce)floor('ice',all.filter(c=>!sand.some(s=>s.x===c.x&&s.y===c.y)));
 const field=(cell,strength)=>{
  const x=cell.x+.5,y=cell.y+.5,radius=cfg.radius;
  if(Math.hypot(x-.5,y-.5)<=radius+.35||Math.hypot(x-stage.maze.size+.5,y-stage.maze.size+.5)<=radius+.35)return;
  // 中心同士を離し、隣接通路へ届く合成外力を強めすぎない。
  if(stage.zones.some(z=>z.kind==='radial'&&Math.hypot(z.x-x,z.y-y)<radius*.75))return;
  stage.zones.push({kind:'radial',x,y,radius,strength,corner:true});
 };
 for(const s of sites){
  if(theme.assist){
   if(pattern!=='repulsionAssist')field(s.next,cfg.assistForce);
   if(pattern!=='gravityAssist')field(s.prev,-cfg.assistForce);
  }else if(pattern==='gravityHinder'||pattern==='repulsionHinder'){
   const dx=s.next.x-s.cell.x,dy=s.next.y-s.cell.y;
   const sign=pattern==='gravityHinder'?1:-1;
   field({x:s.cell.x-sign*dx*.14,y:s.cell.y-sign*dy*.14},sign*cfg.hinderForce);
  }
 }
 for(const w of stage.walls)w.materialId=pattern==='iceRubber'?'rubber':'cork';
 stage.floorLoad={sandCells:stage.maze.path.filter(c=>sand.some(s=>s.x===c.x&&s.y===c.y)).length,
  hinderFields:theme.assist?0:stage.zones.filter(z=>z.kind==='radial').length};
}

/** 停止・取得用の安定した床か。力場は壁越しも含めて判定する。 */
export function stableFloorPoint(stage,p){
 return !stage.zones.some(z=>z.kind==='radial'?Math.hypot(p.x-z.x,p.y-z.y)<z.radius:
  z.kind==='ice'&&z.cells.some(c=>c.x===Math.floor(p.x)&&c.y===Math.floor(p.y)));
}

/** 取得アイテムは力場の中心を避ける。氷上の取得は停止を要求しない。 */
export function pickupPoint(stage,p){
 return !stage.zones.some(z=>z.kind==='radial'&&Math.hypot(p.x-z.x,p.y-z.y)<.65);
}
