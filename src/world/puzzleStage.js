/**
 * 傾きで道を作る面。入口・戸袋・待機壁の関係から生成し、ラボの固定迷路を使わない。
 * セルBFSは静止壁だけの検証。開口の球径検証と、実操作の検証を区別して記録する。
 */
import {BASE,TUNING,PUZZLE_MAIN} from '../config/gameConfig.js';
import {createRng} from '../maze/rng.js';
import {checkReachability} from '../maze/validator.js';
import {solvePath,countTurns} from '../maze/path.js';
import {createStage,goalCenter} from './stage.js';
import {createRecovery} from './recovery.js';
import {addStageFeatures} from './stageFeatures.js';
import {getCharacter} from './characters.js';
import {PUZZLE_KINDS,PUZZLE_LABELS} from '../game/puzzleVariety.js';
import {applyPuzzleMaterials} from './puzzleMaterials.js';

const ballRadius=()=>getCharacter('default').sizeRatio/2;
const hints={racket:'ラケットの中心と端で、跳ねる向きを変えよう。',sequence:'球を落ち着かせ、数字の順に道をひらこう。',timing:'逆へ傾けて道をひらき、球の勢いで滑りこもう。',openRacket:'道をひらいたら、ラケットで次の部屋へ。',sequenceTiming:'順に道をひらき、最後は切り返して滑りこもう。',racketTiming:'ラケットの勢いと、切り返しを組み合わせよう。'};
const integer=(rng,low,high)=>low+Math.floor(rng()*(high-low+1));
const pointDistance=(p,w)=>Math.hypot(p.x-Math.max(w.x,Math.min(p.x,w.x+w.w)),p.y-Math.max(w.y,Math.min(p.y,w.y+w.h)));

export function createPuzzleStage(seed,profile={}){
 const kind=profile.puzzleKind??'racket';
 if(!PUZZLE_KINDS.includes(kind))throw new Error(`未定義の傾きパズル: ${kind}`);
 const size=profile.size??7;
 if(!Number.isInteger(size)||size<7)throw new Error('傾きパズルの区画生成には7マス以上が必要です');
 const ease=['relaxed','flow','focused'].includes(profile.puzzleEase)?profile.puzzleEase:'flow';
 const rng=createRng((seed^0x73f281b9)>>>0),rotation=integer(rng,0,3),mirror=rng()<.5;
 const plan=buildPlan(size,kind,ease,rng),transform=makeTransform(size,rotation,mirror);
 const maze=transformMaze(plan.maze,transform);
 maze.seed=seed>>>0;maze.variation={...profile,shape:'puzzle',puzzleKind:kind,puzzleEase:ease};
 maze.path=solvePath(maze);maze.pathLength=maze.path.length;maze.turns=countTurns(maze.path);
 maze.reachabilityScope='static-walls';
 if(!checkReachability(maze).ok)throw new Error('生成したパズルの静止壁が全マスにつながっていません');
 const stage=createStage(maze),settings={...PUZZLE_MAIN.physics};
 stage.theme={id:'puzzle',puzzleKind:kind,label:PUZZLE_LABELS[kind],firstVisit:Boolean(profile.puzzleFirstVisit),learning:Boolean(profile.puzzleFirstVisit),introHint:hints[kind]};
 stage.racketSettings=settings;
 const cottonLines=plan.cotton.map(transform.rect);
 for(const wall of stage.walls){
  wall.materialId=cottonLines.some(line=>sameWallLine(wall,line))?'cotton':'rubber';
  if(wall.materialId==='cotton')wall.physicsMaterial={frictionK:1,accelK:1,restitutionK:settings.cottonRestitution/BASE.wallRestitution,damageK:0};
 }
 stage.rackets=plan.rackets.map(w=>{
  const rectangle=transform.rect(w),axis=transform.axis(w.axis);
  const low=transform.rect({...w,[w.axis]:w.min})[axis],high=transform.rect({...w,[w.axis]:w.max})[axis];
  return {...w,...rectangle,axis,min:Math.min(low,high),max:Math.max(low,high),home:rectangle[axis],vx:0,vy:0,materialId:'racket',physicsMaterial:{frictionK:1,accelK:1,restitutionK:settings.racketRestitution/BASE.wallRestitution,damageK:0}};
 });
 const gates=plan.rackets.filter(w=>w.bounce==='reflect'),gateStates={open:{},closed:{}};
 for(const gate of gates)for(const state of ['open','closed']){
  const axis=transform.axis(gate.axis);
  gateStates[state][gate.id]=transform.rect({...gate,[gate.axis]:plan.gateStates[state][gate.id]})[axis];
 }
 stage.puzzle={
  kind,ease,label:PUZZLE_LABELS[kind],hint:hints[kind],firstVisit:Boolean(profile.puzzleFirstVisit),
  gateCount:gates.length,aimCount:plan.rackets.length-gates.length,timingCount:kind.includes('Timing')||kind==='timing'?1:0,
  operationDistance:gates.reduce((sum,w)=>sum+w.max-w.min,0),
  openingSeconds:gates.reduce((sum,w)=>sum+(w.max-w.min)/settings.racketSpeed,0),
  rotation,mirror,
  anchors:{start:transform.point(plan.start),goal:goalCenter(maze),course:plan.course.map(transform.point),waitingPoints:plan.waiting.map(transform.point),gateStates},
  portals:plan.portals.map(p=>({...p,from:transform.point(p.from),to:transform.point(p.to)})),
  verificationOperations:plan.operations.map(op=>transform.operation(op)),
 };
 applyPuzzleMaterials(stage,profile.puzzleMaterialPattern??'iceRubber');
 const verify=validatePuzzleStructure(stage);
 stage.puzzle.verification=verify;
 if(!verify.ok)throw new Error(`生成したパズルの球径検証に失敗しました: ${verify.errors.join(', ')}`);
 // 取得アイテムは静止壁の経路上。移動壁の通る場所へは置かない。
 if(profile.difficulty){
  const eligible=p=>stage.rackets.every(w=>pointDistance(p,sweptRect(w))>.5);
  stage.recovery=createRecovery(maze,profile.difficulty.recoveryChance??0,undefined,eligible);
  addStageFeatures(stage,{...profile.difficulty,themed:true});
  if(stage.leaf&&!eligible(stage.leaf))stage.leaf=null;
  if(stage.hourglass&&!eligible(stage.hourglass))stage.hourglass=null;
 }
 return stage;
}

function buildPlan(n,kind,ease,rng){
 const wt=TUNING.wallThickness,r=ballRadius(),cells=Array.from({length:n*n},(_,i)=>({t:i<n?1:0,r:i%n===n-1?1:0,b:i>=n*(n-1)?1:0,l:i%n===0?1:0}));
 const horizontal=(y,from,to)=>{for(let x=from;x<to;x++){cells[y*n+x].t=1;cells[(y-1)*n+x].b=1;}};
 const vertical=(x,from,to)=>{for(let y=from;y<to;y++){cells[y*n+x].l=1;cells[y*n+x-1].r=1;}};
 const cotton=[],rackets=[],gateStates={open:{},closed:{}},portals=[],waiting=[],course=[],operations=[];
 const cottonH=(y,from,to)=>cotton.push({x:from-wt/2,y:y-wt/2,w:to-from+wt,h:wt});
 const cottonV=(x,from,to)=>cotton.push({x:x-wt/2,y:from-wt/2,w:wt,h:to-from+wt});
 // 綿の外周片は余裕を作る。球を待たせる面の綿とは別に置く。
 const brake=integer(rng,1,n-2);cottonH(0,brake,Math.min(n,brake+2));cottonV(0,1,3);cottonV(n,n-3,n-1);
 let start={x:0,y:0},goal,firstGate=null;
 const route=via=>operations.push({kind:'route',via,purpose:'開口と部屋を回って次の仕掛けへ進む'});
 const addGate=(id,definition,open,closed,from,to)=>{
  rackets.push({id,label:id==='gate-2'?'2':'1',bounce:'reflect',...definition});
  gateStates.open[id]=open;gateStates.closed[id]=closed;portals.push({id,from,to});
 };
 const cup=(left,top,width=2)=>{
  horizontal(top,left,left+width);vertical(left,top,top+1);vertical(left+width,top,top+1);
  cottonH(top,left,left+width);return {x:left+integer(rng,0,width-1),y:top};
 };
 const aimPaddles=(upper=true,lower=true)=>{
  const length=ease==='relaxed'?1.6:ease==='focused'?1.15:1.35;
  if(upper){const max=Math.max(.65,Math.floor(n*.55)-length-.3);rackets.push({id:'racket-vertical',x:n-.7,y:max,w:wt,h:length,axis:'y',min:.65,max,home:max});}
  if(lower){const min=.7,max=n-length-.45,home=min;rackets.push({id:'racket-horizontal',x:home,y:n-.7,w:length,h:wt,axis:'x',min,max,home});}
 };
 if(kind==='racket'){
  const lower=integer(rng,Math.max(4,Math.floor(n*.58)),n-3),upper=integer(rng,2,lower-2);
  const firstGap=integer(rng,2,Math.min(3,n-3)),secondGap=integer(rng,2,Math.min(3,n-3));
  horizontal(upper,0,n-firstGap);horizontal(lower,secondGap,n);
  cottonH(upper,Math.max(0,n-firstGap-2),n-firstGap);cottonH(lower,secondGap,Math.min(n,secondGap+2));
  goal=cup(n-3,lower+1,ease==='focused'?1:2);aimPaddles();
  // ラケットの上下移動は最初の仕切りをまたげるが、次の仕切りの手前まで。
  rackets[0].max=lower-rackets[0].h-.4;
  rackets[0].y=rackets[0].home=Math.min(rackets[0].max,Math.max(rackets[0].min,upper+.2));
  course.push({x:n-firstGap+.65,y:upper-.6},{x:n-firstGap+.65,y:upper+.7},{x:secondGap-.65,y:lower-.7},{x:secondGap-.65,y:lower+.7},{x:n-2.5,y:n-.5},{x:n-2.5,y:goal.y+.5},{x:goal.x+.5,y:goal.y+.5});
  route(course);
 }else{
  const sequential=['sequence','openRacket','sequenceTiming'].includes(kind);
  const a=integer(rng,3,n-4),b=integer(rng,4,n-3),gap=integer(rng,a+2,n-2),span=2;
  if(sequential){
   const top=integer(rng,1,b-3),end=top+span;
   vertical(a,0,top);vertical(a,end,kind==='sequenceTiming'?n-1:n);
   // 外側の一マスは左下への戻り道。待機壁だけで部屋を閉じない。
   horizontal(end,1,a);cottonH(end,1,a);
   start={x:a-2,y:0};
   firstGate={id:'gate-1',point:{x:a-1.5,y:end-wt/2-r},exit:{x:a+.65,y:end-wt/2-r},top};
   waiting.push(firstGate.point);
   const home=top-wt/2,open=end+wt/2;
   addGate('gate-1',{x:a-wt/2,y:home,w:wt,h:span+wt,axis:'y',min:home,max:open,home},open,home,{x:a-.65,y:top+span/2},{x:a+.65,y:top+span/2});
   operations.push({kind:'hold',tilt:{x:0,y:1},seconds:Math.max(1.8,(end-.5)/2),until:'waiting-1',purpose:'綿へ球を預け、1の壁を戸袋へ動かす'});
   route([firstGate.exit,{x:a+.65,y:top+.5}]);
   course.push(firstGate.point,firstGate.exit);
  }
  if(kind==='sequence'||kind==='openRacket'){
   horizontal(b,a,gap);horizontal(b,gap+span,n);vertical(gap,b-2,b);cottonV(gap,b-2,b);
   const turn={x:gap+.5,y:firstGate.top+.5},wait={x:gap+wt/2+r,y:b-.5};
   route([turn,{x:gap+.5,y:b-.5}]);waiting.push(wait);
   if(kind==='sequence'){
    const home=gap-wt/2,open=gap-span-wt/2;
    addGate('gate-2',{x:home,y:b-wt/2,w:span+wt,h:wt,axis:'x',min:open,max:home,home},open,home,{x:gap+span/2,y:b-.45},{x:gap+span/2,y:b+.45});
    operations.push({kind:'hold',tilt:{x:-1,y:0},seconds:1,until:'waiting-2',purpose:'綿へ球を預け、2の壁を戸袋へ動かす'});
   }else{
    // 上の部屋から次の開口へ打ち返せる位置。カップの戻り道は既存のまま残す。
    aimPaddles(true,false);const paddle=rackets.at(-1);
    paddle.max=b-paddle.h-.4;paddle.home=paddle.y=paddle.max;
   }
   goal=cup(a+1,b+1,ease==='focused'?1:Math.min(2,n-a-2));
   const after=[{x:gap+wt/2+r,y:b+.45},{x:a+.5,y:b+.45},{x:a+.5,y:n-.5},{x:a+1.5,y:n-.5},{x:a+1.5,y:goal.y+.5},{x:goal.x+.5,y:goal.y+.5}];
   course.push(turn,wait,...after);route(after);
  }else{
   // 右向き入力で閉まり、切り返すと開く。同じ入力で球には右向きの慣性が残る。
   const row=sequential?b:integer(rng,3,n-3),door=sequential?gap:integer(rng,3,n-2);
   horizontal(row,0,door);horizontal(row,door+span,n);cottonH(row,Math.max(0,door-3),door);
   const closed=door-wt/2,open=door-span-wt/2;
   addGate('timing-gate',{x:open,y:row-wt/2,w:span+wt,h:wt,axis:'x',min:open,max:closed,home:open},open,closed,{x:door+span/2,y:row-.65},{x:door+span/2,y:row+.65});
   rackets.at(-1).label=sequential?'2':'1';
   const approach={x:door-1.3,y:row-1.3};route([approach]);
   operations.push({kind:'until',tilt:{x:.7,y:.3},condition:{axis:'x',min:door+.3},maxSeconds:3,purpose:'球を入口へ送り、同時に壁を閉じる'});
   operations.push({kind:'until',tilt:{x:-.7,y:.7},condition:{axis:'y',min:row+.635},maxSeconds:3,purpose:'逆へ壁を開き、球の慣性で滑りこむ'});
   waiting.push({x:door-.65,y:row-wt/2-r});
   const cupLeft=sequential?1:integer(rng,1,Math.max(1,door-2));
   goal=cup(cupLeft,row+1,ease==='focused'||sequential?1:2);
   const after=kind==='racketTiming'?
    [{x:door+1.5,y:row+.45},{x:cupLeft-.5,y:row+.45},{x:cupLeft-.5,y:n-.5},{x:cupLeft+.5,y:n-.5},{x:cupLeft+.5,y:goal.y+.5},{x:goal.x+.5,y:goal.y+.5}]:
    [{x:door+1.5,y:row+.65},{x:door+1.5,y:n-.5},...(sequential?[{x:a+.65,y:n-.5},{x:a-.65,y:n-.5}]:[]),{x:cupLeft+.5,y:n-.5},{x:cupLeft+.5,y:goal.y+.5},{x:goal.x+.5,y:goal.y+.5}];
   course.push(approach,...after);route(after);
   if(kind==='racketTiming'){
    aimPaddles(true,true);const paddle=rackets.at(-1);
    paddle.x=cupLeft+2.1;paddle.axis='y';paddle.min=row+.45;paddle.max=n-.7;paddle.home=paddle.y=paddle.max;
   }
  }
 }
 const maze={size:n,seed:0,cells,start,goal};
 return {maze,cotton,rackets,gateStates,portals,waiting,course,operations,start:{x:start.x+.5,y:start.y+.5}};
}

function sameWallLine(w,line){
 const eps=1e-8;
 return line.w>line.h?Math.abs(w.y-line.y)<eps&&w.h<w.w&&w.x>=line.x-eps&&w.x+w.w<=line.x+line.w+eps:
  Math.abs(w.x-line.x)<eps&&w.w<w.h&&w.y>=line.y-eps&&w.y+w.h<=line.y+line.h+eps;
}
const sweptRect=w=>w.axis==='x'?{x:w.min,y:w.y,w:w.max-w.min+w.w,h:w.h}:{x:w.x,y:w.min,w:w.w,h:w.max-w.min+w.h};

function makeTransform(n,rotation,mirror){
 const vector=p=>{let x=mirror?-p.x:p.x,y=p.y;for(let i=0;i<rotation;i++){const next=-y;y=x;x=next;}return {x,y};};
 const point=p=>{let x=mirror?n-p.x:p.x,y=p.y;for(let i=0;i<rotation;i++){const next=n-y;y=x;x=next;}return {x,y};};
 const rect=w=>{const corners=[{x:w.x,y:w.y},{x:w.x+w.w,y:w.y},{x:w.x,y:w.y+w.h},{x:w.x+w.w,y:w.y+w.h}].map(point),xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};};
 const axis=value=>Math.abs(vector(value==='x'?{x:1,y:0}:{x:0,y:1}).x)>.5?'x':'y';
 const operation=op=>{
  const out={...op};if(op.tilt)out.tilt=vector(op.tilt);if(op.via)out.via=op.via.map(point);
  if(op.condition){const old=op.condition.axis,newAxis=axis(old),direction=vector(old==='x'?{x:1,y:0}:{x:0,y:1})[newAxis];out.condition={axis:newAxis};for(const key of ['min','max'])if(Number.isFinite(op.condition[key])){const mapped=point({x:old==='x'?op.condition[key]:0,y:old==='y'?op.condition[key]:0})[newAxis];out.condition[direction>0?key:key==='min'?'max':'min']=mapped;}}
  return out;
 };
 return {point,vector,rect,axis,operation};
}

function transformMaze(maze,transform){
 const n=maze.size,cells=new Array(n*n),directions={t:{x:0,y:-1},r:{x:1,y:0},b:{x:0,y:1},l:{x:-1,y:0}};
 for(let i=0;i<maze.cells.length;i++){
  const p=transform.point({x:i%n+.5,y:Math.floor(i/n)+.5}),cell={t:0,r:0,b:0,l:0};
  for(const [key,v] of Object.entries(directions)){const d=transform.vector(v),mapped=d.x>.5?'r':d.x<-.5?'l':d.y>.5?'b':'t';cell[mapped]=maze.cells[i][key];}
  cells[Math.floor(p.y)*n+Math.floor(p.x)]=cell;
 }
 const cell=p=>{const q=transform.point({x:p.x+.5,y:p.y+.5});return {x:Math.floor(q.x),y:Math.floor(q.y)};};
 return {...maze,cells,start:cell(maze.start),goal:cell(maze.goal)};
}

/** 開口・戸袋・待機・再試行の検証。自動操縦で遊びの成立を断定するものではない。 */
export function validatePuzzleStructure(stage,radius=ballRadius()){
 const errors=[],reachability=checkReachability(stage.maze),states=stage.puzzle.anchors.gateStates;
 if(!reachability.ok)errors.push('static-bfs');
 const closed=stage.rackets.map(w=>({...w,[w.axis]:states.closed[w.id]??w.home}));
 const open=stage.rackets.map(w=>({...w,[w.axis]:states.open[w.id]??w.home}));
 const free=(p,walls)=>p.x>=radius&&p.y>=radius&&p.x<=stage.maze.size-radius&&p.y<=stage.maze.size-radius&&walls.every(w=>pointDistance(p,w)>=radius-1e-8);
 const lineFree=(from,to,walls)=>{const steps=Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/.05);for(let i=0;i<=steps;i++){const t=i/Math.max(1,steps);if(!free({x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t},walls))return false;}return true;};
 for(const portal of stage.puzzle.portals){
  const gate=stage.rackets.find(w=>w.id===portal.id),opened={...gate,[gate.axis]:states.open[gate.id]},shut={...gate,[gate.axis]:states.closed[gate.id]};
  if(!lineFree(portal.from,portal.to,[...stage.walls,opened]))errors.push(`${gate.id}-open-clearance`);
  if(lineFree(portal.from,portal.to,[...stage.walls,shut]))errors.push(`${gate.id}-does-not-close`);
 }
 const targets=[stage.puzzle.anchors.goal,...stage.puzzle.anchors.waitingPoints];
 for(const point of [stage.puzzle.anchors.start,...targets])if(!free(point,[...stage.walls,...open]))errors.push('anchor-clearance');
 if(!free(stage.puzzle.anchors.start,[...stage.walls,...closed]))errors.push('closed-start-clearance');
 const reachable=reachablePuzzlePoints(stage,stage.puzzle.anchors.start,targets,{rackets:open,radius});
 for(const [i,found] of reachable.entries())if(!found)errors.push(`open-retry-path-${i}`);
 return {ok:errors.length===0,scope:'static-bfs-and-open-clearance',staticCells:reachability.visited,openRetryReachable:reachable,errors};
}

/** 球中心を1/4セル刻みで探索。移動壁を開いた状態の幾何検証で、傾き操作とは別。 */
export function reachablePuzzlePoints(stage,start,targets,{rackets=stage.rackets,radius=ballRadius()}={}){
 const scale=4,n=stage.maze.size*scale-3,walls=[...stage.walls,...rackets],freeCache=new Map();
 const index=(x,y)=>y*n+x,point=(x,y)=>({x:.5+x/scale,y:.5+y/scale}),snap=p=>({x:Math.round((p.x-.5)*scale),y:Math.round((p.y-.5)*scale)});
 const free=(x,y)=>{const key=index(x,y);if(!freeCache.has(key)){const p=point(x,y);freeCache.set(key,walls.every(w=>pointDistance(p,w)>=radius-1e-8));}return freeCache.get(key);};
 const first=snap(start),queue=[],seen=new Set();
 if(free(first.x,first.y)){queue.push(first);seen.add(index(first.x,first.y));}
 for(let head=0;head<queue.length;head++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const x=queue[head].x+dx,y=queue[head].y+dy,key=index(x,y);
  if(x>=0&&y>=0&&x<n&&y<n&&!seen.has(key)&&free(x,y)){seen.add(key);queue.push({x,y});}
 }
 return targets.map(p=>{const q=snap(p);return q.x>=0&&q.y>=0&&q.x<n&&q.y<n&&seen.has(index(q.x,q.y));});
}
