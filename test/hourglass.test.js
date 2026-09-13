import test from 'node:test';
import assert from 'node:assert/strict';
import { createStagePlay } from '../src/game/stagePlay.js';
import { challengeDifficulty } from '../src/game/challenge.js';
import { BASE } from '../src/config/gameConfig.js';
import { solvePath } from '../src/maze/path.js';
import { resolveParams } from '../src/physics/resolveParams.js';
import { resolveCollisions } from '../src/physics/collision.js';
import { getMaterial } from '../src/world/materials.js';
const make=(n=9,seed=1,level='easy')=>createStagePlay(seed,challengeDifficulty(n,level));
const tick=(p,ms=10,onFeature)=>p.advance({dt:0,elapsedMs:ms,tilt:{x:0,y:0},base:BASE,onFeature});
test('序盤は維持し9面から秒数加算。時計は実時間どおり',()=>{
 for(let n=1;n<=30;n++){
  const easy=make(n),normal=make(n,1,'normal');
  assert.ok(Math.abs(easy.limitSec-normal.limitSec-Math.min(12,Math.max(0,n-8)*3))<1e-8);
  easy.teleport(.5,.5);const before=easy.remainingSec;tick(easy,1000);assert.equal(easy.timeMs,1000);assert.ok(Math.abs(before-easy.remainingSec-1)<1e-8);
 }
});
test('砂時計は9面から、経路後半の空きセルへ決定的に配置、難易度別抽選',()=>{
 const counts={easy:0,normal:0};
 for(const level of ['easy','normal'])for(let seed=1;seed<=500;seed++){
  assert.equal(make(8,seed,level).stage.hourglass,null);
  const p=make(11,seed,level),h=p.stage.hourglass;if(!h)continue;counts[level]++;
  assert.deepEqual(h,make(11,seed,level).stage.hourglass);
  const path=solvePath(p.stage.maze),i=path.findIndex(c=>c.x+.5===h.x&&c.y+.5===h.y);
  assert.ok(i/(path.length-1)>=.55&&i/(path.length-1)<=.85);
  for(const item of [p.stage.leaf,p.stage.rest,p.stage.recovery,...p.stage.sticky].filter(Boolean))assert.ok(item.x!==h.x||item.y!==h.y);
 }
 assert.ok(counts.easy>200&&counts.easy<300,JSON.stringify(counts));assert.ok(counts.normal>60&&counts.normal<140,JSON.stringify(counts));
 assert.equal(createStagePlay(1).stage.hourglass,null);
});
test('取得は一度だけ5秒加算し記録は引かない。時間切れ優先',()=>{
 const p=make();p.stage.hourglass={x:2.5,y:2.5,collected:false};p.teleport(2.5,2.5);const events=[];
 tick(p,100,k=>events.push(k));assert.equal(p.extendedSec,5);assert.equal(p.timeMs,100);assert.deepEqual(events,['hourglass']);
 tick(p,100,k=>events.push(k));assert.equal(p.extendedSec,5);assert.equal(events.length,1);
 const q=make();q.stage.hourglass={x:2.5,y:2.5,collected:false};q.teleport(2.5,2.5);tick(q,q.limitSec*1000);
 assert.equal(q.status,'timeout');assert.equal(q.extendedSec,0);assert.equal(q.stage.hourglass.collected,false);
});
