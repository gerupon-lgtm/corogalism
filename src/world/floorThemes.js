/** 本編の床テーマ。迷路の加工と配置を決定的に行う。DOM・描画を持たない。 */
import { FLOOR_CHALLENGE } from '../config/gameConfig.js';
import {learningSandCells,learningFieldPoints} from './floorLearning.js';
import { createRng } from '../maze/rng.js';
import { generateMaze } from '../maze/generator.js';
import { solvePath, countTurns } from '../maze/path.js';
import { checkReachability } from '../maze/validator.js';
import { branchCells, connectedCells } from './branchFloors.js';
import {placeOpenFields} from './openFields.js';
import {spreadOpenSand} from './openFloors.js';

export function cornerSites(maze, max=3, gap=5) {
 const sites=[];
 for(let i=3;i<maze.path.length-3;i++){
  const prev=maze.path[i-1],cell=maze.path[i],next=maze.path[i+1];
  if((cell.x-prev.x)*(next.y-cell.y)===(cell.y-prev.y)*(next.x-cell.x))continue;
  if(sites.length&&i-sites.at(-1).index<gap)continue;
  if(Math.hypot(cell.x-maze.start.x,cell.y-maze.start.y)<2.5||Math.hypot(cell.x-maze.goal.x,cell.y-maze.goal.y)<2.5)continue;
  sites.push({index:i,prev,cell,next});if(sites.length===max)break;
 }
 return sites;
}
export function prepareFloorMaze(input, theme) {
 if(!theme.floorPattern&&theme.id!=='basic')return input;
 const max=theme.special?4:theme.firstVisit?1:theme.floorPattern==='iceAssist'?2:3,gap=theme.special?3:5;
 const candidates=[input],candidateRng=createRng((input.seed^0x6a09e667)>>>0);
 if(!input.variation&&(theme.firstVisit||theme.special||theme.id==='basic'))for(let i=1;i<FLOOR_CHALLENGE.mazeCandidates;i++)candidates.push(generateMaze(input.size,Math.floor(candidateRng()*0x100000000)>>>0));
 const isOpen=(m,a,b)=>!m.cells[a.y*m.size+a.x][b.x>a.x?'r':b.x<a.x?'l':b.y>a.y?'b':'t'];
 for(const maze of candidates){
  if(theme.assist&&maze.variation?.shape!=='open'){
   const open=(a,b)=>{
    const [side,other]=b.x>a.x?['r','l']:b.x<a.x?['l','r']:b.y>a.y?['b','t']:['t','b'];
    maze.cells[a.y*maze.size+a.x][side]=0;maze.cells[b.y*maze.size+b.x][other]=0;
   };
   let widened=0;
   for(const {prev,cell,next} of cornerSites(maze,maze.cells.length,1)){
    const saved=maze.cells.map(c=>({...c}));
    const inner={x:prev.x+next.x-cell.x,y:prev.y+next.y-cell.y};
    open(prev,inner);open(inner,next);
    const updated={...maze,path:solvePath(maze)};
    const valid=cornerSites(updated,maze.cells.length,1).some(s=>{
     const q={x:s.prev.x+s.next.x-s.cell.x,y:s.prev.y+s.next.y-s.cell.y};
     return isOpen(maze,s.prev,q)&&isOpen(maze,q,s.next);
    });
    if(!valid)maze.cells=saved;
    else if(++widened>=max)break;
   }
  }
  if(!checkReachability(maze).ok)throw new Error('床テーマの到達性が不正です');
  maze.path=solvePath(maze);maze.pathLength=maze.path.length;maze.turns=countTurns(maze.path);
  // 壁を開けると近道が生まれる。最終経路上の広い曲がり角から改めて配置する。
  maze.floorSites=cornerSites(maze,maze.cells.length,1).filter(s=>{
   if(!theme.assist)return true;
   const inner={x:s.prev.x+s.next.x-s.cell.x,y:s.prev.y+s.next.y-s.cell.y};
   return isOpen(maze,s.prev,inner)&&isOpen(maze,inner,s.next);
  }).reduce((chosen,s)=>{if(!chosen.length||s.index-chosen.at(-1).index>=gap)chosen.push(s);return chosen;},[]).slice(0,max);
  // 初登場に力場がない候補だけなら、同じ乱数列から有限の追加候補を試す。
  if(!input.variation&&theme.assist&&maze===candidates.at(-1)&&!candidates.some(m=>m.floorSites?.length)&&candidates.length<FLOOR_CHALLENGE.mazeCandidates*4){
   for(let i=0,count=Math.min(FLOOR_CHALLENGE.mazeCandidates,FLOOR_CHALLENGE.mazeCandidates*4-candidates.length);i<count;i++)candidates.push(generateMaze(input.size,Math.floor(candidateRng()*0x100000000)>>>0));
  }
 }
 return candidates.sort((a,b)=>theme.special?Math.min(3,b.floorSites.length)-Math.min(3,a.floorSites.length)||a.pathLength-b.pathLength:
  (b.floorSites.length>0)-(a.floorSites.length>0)||a.pathLength-b.pathLength)[0];
}
export function addFloorTheme(stage,theme){
 if(stage.maze.baffle&&!theme.floorPattern){theme={...theme,floorPattern:'iceRubber',label:`${theme.label}・氷`};stage.theme=theme;}
 if(!theme.floorPattern)return;
 const cfg=FLOOR_CHALLENGE,all=stage.maze.cells.map((_,i)=>({x:i%stage.maze.size,y:Math.floor(i/stage.maze.size)}));
 const sites=stage.maze.floorSites||cornerSites(stage.maze),pattern=theme.floorPattern;
 let sand=theme.learning&&pattern!=='iceRubber'&&(pattern==='sand'||pattern.includes('Sand')||pattern==='iceAssist')?learningSandCells(stage.maze):pattern==='sand'?sites.flatMap(s=>[s.prev,s.cell]):pattern.includes('Sand')||theme.special||pattern==='iceAssist'?sites.map(s=>s.prev):[];
 if(sand.length){
  const rng=createRng((stage.maze.seed^0x24b61a97)>>>0),candidates=branchCells(stage.maze);
  // ルートの砂は残し、脇道にも壁をまたがない短い砂の区間を加える。
  for(let i=0;i<2&&candidates.length;i++){
   const at=candidates.splice(Math.floor(rng()*candidates.length),1)[0];sand.push(at);
   const neighbours=connectedCells(stage.maze,at,candidates);
   if(neighbours.length){const next=neighbours[Math.floor(rng()*neighbours.length)];sand.push(next);candidates.splice(candidates.indexOf(next),1);}
  }
 }
 if(stage.maze.baffle&&(pattern==='sand'||pattern.includes('Sand')||theme.special||pattern==='iceAssist'))sand=spreadOpenSand(stage.maze,sand);
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
 if(theme.learning){
  if(pattern!=='sand'&&!pattern.includes('Sand')&&pattern!=='iceRubber')for(const [i,p]of learningFieldPoints(stage.maze).entries()){
   const strength=pattern.toLowerCase().includes('repulsion')?-cfg.assistForce:pattern==='iceAssist'&&i%2?-cfg.assistForce:cfg.assistForce;
   field({x:p.x-.5,y:p.y-.5},strength);
  }
 }else for(const s of sites){
  if(theme.assist){
   if(pattern!=='repulsionAssist')field(s.next,cfg.assistForce);
   if(pattern!=='gravityAssist')field(s.prev,-cfg.assistForce);
  }else if(pattern==='gravityHinder'||pattern==='repulsionHinder'){
   const dx=s.next.x-s.cell.x,dy=s.next.y-s.cell.y;
   const sign=pattern==='gravityHinder'?1:-1;
   field({x:s.cell.x-sign*dx*.14,y:s.cell.y-sign*dy*.14},sign*cfg.hinderForce);
  }
 }
 // 小さな曲がり角がなくても、選んだ素材の体験は残す。
 // 通常の配置で不足した力の向きだけ、経路上の離れた候補で補う。
 const needed=pattern==='iceAssist'||theme.special?[1,-1]:pattern.toLowerCase().includes('repulsion')?[-1]:pattern.toLowerCase().includes('gravity')?[1]:[];
 for(const sign of needed){
  if(stage.zones.some(z=>z.kind==='radial'&&Math.sign(z.strength)===sign))continue;
  const candidates=[...learningFieldPoints(stage.maze).map(p=>({x:p.x-.5,y:p.y-.5})),...stage.maze.path];
  for(const p of candidates){
   const before=stage.zones.length;
   field(p,sign*(theme.assist?cfg.assistForce:cfg.hinderForce));
   if(stage.zones.length>before)break;
  }
 }
 // 追加する力場も同じ素材の実効値。正解ルートから離れた場所を優先する。
 const signs=[...new Set(stage.zones.filter(z=>z.kind==='radial').map(z=>Math.sign(z.strength)))];
 const rng=createRng((stage.maze.seed^0x570a1ed3)>>>0);
 for(const sign of signs){
  const candidates=branchCells(stage.maze,cfg.radius+.35).map(p=>({x:p.x+.5,y:p.y+.5})).filter(p=>
   stage.zones.every(z=>z.kind!=='radial'||Math.hypot(p.x-z.x,p.y-z.y)>=cfg.radius*.75));
  const ranked=candidates.map(p=>({...p,rank:Math.min(cfg.radius+.6,...stage.maze.path.map(c=>Math.hypot(p.x-c.x-.5,p.y-c.y-.5)))+rng()*.2})).sort((a,b)=>b.rank-a.rank);
  if(ranked.length){
   const at=ranked[0],before=stage.zones.length;
   field({x:at.x-.5,y:at.y-.5},sign*(theme.assist?cfg.assistForce:cfg.hinderForce));
   if(stage.zones.length>before)stage.zones.at(-1).branch=true;
  }
 }
 if(stage.maze.baffle){
  // 選んだ石・トゲ・こけは残し、基本壁だけゴムへ。組合せを消さない。
  for(const w of stage.walls)if(w.materialId==='default')w.materialId='rubber';
  placeOpenFields(stage);
 }else for(const w of stage.walls)w.materialId=pattern==='iceRubber'?'rubber':'cork';
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
