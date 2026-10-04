import test from 'node:test';
import assert from 'node:assert/strict';
import { createStagePlay } from '../src/game/stagePlay.js';
import { challengeDifficulty } from '../src/game/challenge.js';
import { restFloors } from '../src/world/stageFeatures.js';
import { stableFloorPoint } from '../src/world/floorThemes.js';
import { BASE, REST, STICKY } from '../src/config/gameConfig.js';
const make=(n,seed=7919,level='normal',carry={})=>createStagePlay(seed,challengeDifficulty(n,level),carry);
const onRoute=(stage,p)=>stage.maze.path.some(c=>Math.floor(p.x)===c.x&&Math.floor(p.y)===c.y);
const tick=(p,elapsedMs=10)=>p.advance({dt:0,elapsedMs,tilt:{x:0,y:0},base:BASE});

test('砂はルートの減速区間と脇道の両方にあり、氷との重複がない',()=>{
 for(const level of ['normal','easy'])for(let seed=1;seed<=60;seed++)for(const n of [3,6,8,10,16]){
  const s=make(n,seed*7919,level).stage,sand=s.zones.find(z=>z.kind==='sand');
  assert.ok(sand);assert.ok(sand.cells.some(c=>onRoute(s,{x:c.x+.5,y:c.y+.5})));
  assert.ok(sand.cells.some(c=>!onRoute(s,{x:c.x+.5,y:c.y+.5})),`${level}:${n}:${seed}`);
  const ice=s.zones.find(z=>z.kind==='ice');
  if(ice){assert.equal(sand.cells.length+ice.cells.length,49);assert.ok(sand.cells.every(c=>!ice.cells.some(q=>q.x===c.x&&q.y===c.y)));}
 }
});

test('重力と反重力は経路の配置を残し、同じ力の床を脇道にも置く',()=>{
 for(const level of ['normal','easy'])for(let seed=1;seed<=60;seed++)for(const n of [5,7,8,10,13,15,16]){
  const s=make(n,seed*7919,level).stage,fields=s.zones.filter(z=>z.kind==='radial');
  if(!fields.length)continue;
  assert.ok(fields.some(z=>!z.branch));
  assert.ok(fields.some(z=>z.branch),`${level}:${n}:${seed}`);
  for(const f of fields.filter(z=>z.branch)){
   assert.equal(onRoute(s,f),false);
   assert.ok(fields.some(z=>!z.branch&&z.strength===f.strength));
   assert.ok(Math.hypot(f.x-s.maze.start.x-.5,f.y-s.maze.start.y-.5)>f.radius+.35);
   assert.ok(Math.hypot(f.x-s.maze.goal.x-.5,f.y-s.maze.goal.y-.5)>f.radius+.35);
  }
 }
});

test('取得アイテムは全テーマでルート上、休憩・とりもちとの重複なし',()=>{
 const counts={candy:0,leaf:0,hourglass:0,branchRest:0,branchSticky:0};
 for(const level of ['normal','easy'])for(let seed=1;seed<=50;seed++)for(let n=1;n<=30;n++){
  const s=make(n,seed*7919,level).stage;
  for(const [name,p]of [['candy',s.recovery],['leaf',s.leaf],['hourglass',s.hourglass]])if(p){counts[name]++;assert.ok(onRoute(s,p),`${name}:${level}:${n}:${seed}`);}
  const rests=restFloors(s);
  for(const p of rests){assert.ok(stableFloorPoint(s,p));if(!onRoute(s,p))counts.branchRest++;}
  if(s.theme.id==='sticky'){
   assert.equal(s.sticky.filter(p=>onRoute(s,p)).length,1);
   for(const p of s.sticky){if(!onRoute(s,p))counts.branchSticky++;assert.ok(Math.hypot(p.x-.5,p.y-.5)>STICKY.endpointClearance);assert.ok(Math.hypot(p.x-6.5,p.y-6.5)>STICKY.endpointClearance);}
  }
  const keys=[s.recovery,s.leaf,s.hourglass,...rests,...s.sticky].filter(Boolean).map(p=>`${p.x},${p.y}`);
  assert.equal(new Set(keys).size,keys.length);
 }
 for(const [key,count]of Object.entries(counts))assert.ok(count>0,key);
});

test('とりもちは初登場から脇道にあり、脇道でも拘束と早期脱出が動く',()=>{
 const p=make(11),tile=p.stage.sticky.find(t=>!onRoute(p.stage,t));assert.ok(tile);
 p.teleport(tile.x,tile.y);tick(p);assert.ok(p.trap);
 for(let i=0;i<5;i++)p.assistEscape();tick(p,500);
 assert.equal(p.trap,null);tick(p,500);assert.equal(p.trap,null);
});

test('脇道のひとやすみも独立して回復し、使用済み状態をコンティニューに渡せる',()=>{
 let p;for(let seed=1;seed<=100;seed++){const candidate=make(12,seed*7919,'easy');if(candidate.stage.extraRests.length){p=candidate;break;}}
 assert.ok(p);const [route,branch]=restFloors(p.stage);assert.ok(onRoute(p.stage,route));assert.equal(onRoute(p.stage,branch),false);
 p.hp.applyImpact(8,{materialId:'stone'},0);
 p.teleport(route.x,route.y);tick(p);tick(p,1000);assert.equal(route.progress,1);
 p.teleport(branch.x,branch.y);tick(p);assert.equal(route.progress,0);assert.equal(branch.progress,0);
 const before=p.hp.value;tick(p,2000);assert.equal(branch.used,true);assert.equal(route.used,false);
 assert.ok(p.hp.value>before);assert.equal(p.extendedSec,REST.durationSec);
 const seed=p.stage.maze.seed,used=restFloors(p.stage).filter(t=>t.used).map(({x,y})=>({x,y}));
 const continued=make(12,seed,'easy',{restUsedCells:used});
 assert.deepEqual(restFloors(continued.stage).map(t=>t.used),[false,true]);
 tick(p,2000);assert.equal(p.extendedSec,REST.durationSec,'同じ床を繰り返し使わない');
 p.hp.applyImpact(8,{materialId:'stone'},10);
 p.teleport(route.x,route.y);tick(p);tick(p,1000);assert.ok(route.progress>0);p.resetRest();assert.ok(restFloors(p.stage).every(t=>t.progress===0));
});
