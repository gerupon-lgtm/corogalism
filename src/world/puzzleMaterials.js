/** 床・固定壁の組合せ。可動壁と迷路の形、共通の物理係数は変えない。 */
import {BASE, FLOOR_CHALLENGE as F, PUZZLE_MAIN as P} from '../config/gameConfig.js';
import {createRng} from '../maze/rng.js';

export const PUZZLE_MATERIALS = Object.freeze({
 tutorialNormal:{label:'通常床・通常壁',floor:'normal',wall:'default',cotton:false},
 iceRubber:{label:'氷・ゴムと綿',floor:'ice',wall:'rubber',cotton:true},
 iceSandRubber:{label:'氷と砂・ゴムと綿',floor:'ice',sand:true,wall:'rubber',cotton:true},
 normalRubber:{label:'通常床・ゴムと綿',floor:'normal',wall:'rubber',cotton:true},
 normalCork:{label:'通常床と砂・コルクと綿',floor:'normal',sand:true,wall:'cork',cotton:true},
 iceSandCork:{label:'氷と砂・コルクと綿',floor:'ice',sand:true,wall:'cork',cotton:true},
 mixedStandard:{label:'通常床・氷・砂と混じる壁',floor:'mixed',sand:true,wall:'mixed',cotton:true},
});

const distanceToSegment=(p,a,b)=>{
 const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d)):0;
 return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
};
const center=w=>({x:w.x+w.w/2,y:w.y+w.h/2});
const outer=(w,n)=>w.x<0||w.y<0||w.x+w.w>n||w.y+w.h>n;

/** 入口へ球を送り、切り返す区間は砂を避ける。通常床を一律に除外はしない。 */
export function puzzleTimingCells(stage){
 if(!stage.puzzle.timingCount)return [];
 const gate=stage.rackets.find(w=>w.id==='timing-gate'),portal=stage.puzzle.portals.find(p=>p.id===gate.id);
 const at=stage.puzzle.verificationOperations.findIndex(op=>op.kind==='until');
 const approach=stage.puzzle.verificationOperations[at-1]?.via?.at(-1)??portal.from;
 const n=stage.maze.size,cells=[];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const p={x:x+.5,y:y+.5};
  // 入り口の前後と助走の両方を保つ。セルの境目で砂を踏まない余裕も含む。
  if(distanceToSegment(p,approach,portal.from)<=P.materials.timingClearance||distanceToSegment(p,portal.from,portal.to)<=P.materials.timingClearance)cells.push({x,y});
 }
 return cells;
}

export function applyPuzzleMaterials(stage,pattern='iceRubber'){
 const definition=PUZZLE_MATERIALS[pattern];
 if(!definition)throw new Error(`未定義の動く壁の素材組合せ: ${pattern}`);
 const n=stage.maze.size,rng=createRng((stage.maze.seed^0x312cac17)>>>0),all=Array.from({length:n*n},(_,i)=>({x:i%n,y:Math.floor(i/n)}));
 const timing=puzzleTimingCells(stage),timingIds=new Set(timing.map(c=>c.y*n+c.x));
 const sandIds=new Set(),iceIds=new Set(),normalIds=new Set();
 if(definition.floor==='ice')for(const c of all)iceIds.add(c.y*n+c.x);
 else if(definition.floor==='mixed'){
  // 通路の助走とラケットの開始位置付近は氷。残りの部屋は通常床へ戻す。
  for(const c of timing)iceIds.add(c.y*n+c.x);
  for(const c of all){const p={x:c.x+.5,y:c.y+.5};if(stage.rackets.some(w=>w.bounce!=='reflect'&&Math.hypot(p.x-center(w).x,p.y-center(w).y)<P.materials.paddleIceRadius))iceIds.add(c.y*n+c.x);}
  if(!iceIds.size)for(const c of all)if(rng()<P.materials.mixedIceRatio)iceIds.add(c.y*n+c.x);
 }
 if(definition.sand){
  const centers=[...stage.puzzle.anchors.waitingPoints,...stage.rackets.filter(w=>w.bounce!=='reflect').map(center)];
  const eligible=c=>!timingIds.has(c.y*n+c.x)&&Math.hypot(c.x+.5-stage.puzzle.anchors.start.x,c.y+.5-stage.puzzle.anchors.start.y)>P.materials.endpointClearance&&Math.hypot(c.x+.5-stage.puzzle.anchors.goal.x,c.y+.5-stage.puzzle.anchors.goal.y)>P.materials.endpointClearance;
  const max=Math.max(P.materials.minimumSandCells,Math.ceil(n*P.materials.sandCellsPerSize));
  for(const point of centers){
   const nearby=all.filter(eligible).map(c=>({...c,d:Math.hypot(c.x+.5-point.x,c.y+.5-point.y)+rng()*P.materials.sandRankJitter})).sort((a,b)=>a.d-b.d);
   for(const c of nearby.slice(0,P.materials.sandCellsPerAnchor))if(sandIds.size<max)sandIds.add(c.y*n+c.x);
  }
  // ラケットのない切り返し面にも、助走を避けた部屋の砂を置く。
  if(sandIds.size<P.materials.minimumSandCells)for(const c of all.filter(eligible).map(c=>({...c,rank:rng()})).sort((a,b)=>a.rank-b.rank).slice(0,P.materials.minimumSandCells))sandIds.add(c.y*n+c.x);
 }
 for(const id of sandIds)iceIds.delete(id);
 for(const c of all)if(!iceIds.has(c.y*n+c.x)&&!sandIds.has(c.y*n+c.x))normalIds.add(c.y*n+c.x);
 const cellsOf=ids=>all.filter(c=>ids.has(c.y*n+c.x));
 stage.zones=[];
 if(iceIds.size)stage.zones.push({kind:'ice',cells:cellsOf(iceIds),frictionK:F.ice,...F.iceMotion,forceX:0,forceY:0});
 if(sandIds.size)stage.zones.push({kind:'sand',cells:cellsOf(sandIds),frictionK:F.sand,forceX:0,forceY:0});
 for(const wall of stage.walls){
  const cotton=wall.materialId==='cotton'&&definition.cotton;
  delete wall.physicsMaterial;
  if(cotton){wall.materialId='cotton';wall.physicsMaterial={frictionK:1,accelK:1,restitutionK:stage.racketSettings.cottonRestitution/BASE.wallRestitution,damageK:0};continue;}
  if(definition.wall==='mixed'){
   // 外周は低ダメージのコルク。固定の内壁に通常壁と無傷のゴムを混ぜる。
   const at=rng();wall.materialId=outer(wall,n)?'cork':at<P.materials.standardRatio?'default':at<P.materials.standardRatio+P.materials.rubberRatio?'rubber':'cork';
  }else if(definition.wall==='cork')wall.materialId=rng()<P.materials.rubberRatio?'rubber':'cork';
  else wall.materialId=definition.wall;
 }
 const sandCells=stage.maze.path.filter(c=>sandIds.has(c.y*n+c.x)).length;
 stage.floorLoad={sandCells,hinderFields:0};
 Object.assign(stage.puzzle,{materialPattern:pattern,materialLabel:definition.label,floorLoad:{sandCells},materialCells:{ice:iceIds.size,sand:sandIds.size,normal:normalIds.size},timingCells:timing});
 stage.theme.materialLabel=definition.label;
 return stage;
}
