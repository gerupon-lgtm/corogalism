import test from 'node:test';
import assert from 'node:assert/strict';
import { createHp } from '../src/game/hp.js';
import { createStagePlay } from '../src/game/stagePlay.js';
import { challengeDifficulty } from '../src/game/challenge.js';
import { BASE, LEAF, REST, STICKY } from '../src/config/gameConfig.js';
const tick=(p,ms=10,dt=0)=>p.advance({dt,elapsedMs:ms,tilt:{x:0,y:0},base:BASE});
const make=(n=1,seed=7919,level='easy',carry={})=>createStagePlay(seed,challengeDifficulty(n,level),carry);

test('まもりは上限適用後の実ダメージを消費し、全額吸収はノーミス',()=>{
 const shield={value:20},hp=createHp({turns:15,hpPerTurn:4,shield});
 assert.equal(hp.applyImpact(2,{materialId:'default'},0),0); assert.ok(Math.abs(shield.value-13.6)<1e-8);
 assert.equal(hp.value,100);assert.equal(hp.tookDamage,false);
 const stock=shield.value;
 assert.equal(hp.applyImpact(10,{},.1),0);assert.equal(shield.value,stock);
 assert.ok(Math.abs(hp.applyImpact(30,{},1)-(35-stock))<1e-8);assert.equal(shield.value,0);assert.equal(hp.tookDamage,true);
});
test('葉っぱは満杯で残る。20%加算・50%上限、持ち越しを切り捨てず再取得なし',()=>{
 const p=make();p.stage.leaf={x:2.5,y:2.5,collected:false};p.teleport(2.5,2.5);
 p.shield.value=p.hp.max*.5;tick(p);assert.equal(p.stage.leaf.collected,false);
 p.shield.value=p.hp.max*.45;tick(p);assert.equal(p.shield.value,p.hp.max*.5);assert.equal(p.stage.leaf.collected,true);
 const stock={value:999};const next=make(2,111,'easy',{shield:stock});assert.equal(next.shield.value,999);
 for(let seed=1;seed<100;seed++){const p=make(1,seed*7919);if(!p.stage.leaf)continue;
 const retry=make(1,seed*7919,'easy',{shield:p.shield,leafCollected:true,restUsed:true});assert.equal(retry.stage.leaf.collected,true);break;}
});
test('休憩は2秒成立後だけ20%回復・残り2秒加算。記録時間は差し引かない',()=>{
 const p=make();p.stage.rest={x:2.5,y:2.5,used:false,progress:0};p.teleport(2.5,2.5);
 tick(p,2500);assert.equal(p.stage.rest.used,false); // 満タン時は温存
 p.hp.applyImpact(30,{},0);const before=p.hp.value;tick(p,10);tick(p,1999);assert.equal(p.hp.value,before);
 tick(p,1);assert.equal(p.stage.rest.used,true);assert.ok(p.hp.value>before);assert.equal(p.extendedSec,2);
 assert.equal(p.timeMs,4510);assert.ok(Math.abs(p.remainingSec-(p.limitSec-2.510))<1e-8);
 assert.equal(p.hp.tookDamage,true);tick(p,3000);assert.equal(p.extendedSec,2);
});
test('休憩の揺れ許容・リセット・時間切れ優先、停止時リセット',()=>{
 const p=make();p.stage.rest={x:2.5,y:2.5,used:false,progress:0};p.hp.applyImpact(30,{},0);p.teleport(2.5,2.5);tick(p);tick(p,1000);
 p.actor.x+=REST.drift*1.1;tick(p);assert.equal(p.stage.rest.progress,0);tick(p,1000);p.resetRest();assert.equal(p.stage.rest.progress,0);
 p.teleport(.5,.5);tick(p);tick(p,p.remainingSec*1000-2000);assert.equal(p.status,'playing');
 // 新しい休憩判定がちょうどタイムアップと重なっても回復しない。
 p.teleport(2.5,2.5);p.stage.rest.used=false;p.resetRest();tick(p,0);tick(p,2000);assert.equal(p.status,'timeout');assert.equal(p.stage.rest.used,false);
});
test('とりもちは拘束・タップ短縮の下限・同じ床から出るまで再拘束なし',()=>{
 const p=make(3);const tile=p.stage.sticky[0];assert.ok(tile);p.teleport(tile.x,tile.y);tick(p);
 assert.ok(p.trap);for(let i=0;i<9;i++)p.assistEscape();assert.equal(p.trap.target,STICKY.minSec);
 tick(p,499,1/60);assert.ok(p.trap);assert.equal(p.actor.x,tile.x);assert.equal(p.actor.y,tile.y);
 tick(p,1);assert.equal(p.trap,null);tick(p,3000);assert.equal(p.trap,null);
 p.teleport(.5,.5);tick(p);p.teleport(tile.x,tile.y);tick(p);assert.ok(p.trap);
 tick(p,2999);assert.ok(p.trap);tick(p,1);assert.equal(p.trap,null);
 const timed=make(3);timed.teleport(timed.stage.sticky[0].x,timed.stage.sticky[0].y);tick(timed);tick(timed,timed.remainingSec*1000);assert.equal(timed.status,'timeout');
});
test('配置は独立抽選・全テーマで休憩、危険壁で高確率、重複せずとりもち3+8n',()=>{
 const counts={easy:0,normal:0,danger:0,leaf:0,both:0,candyLeaf:0};
 for(let i=1;i<=1000;i++){
  for(const level of ['easy','normal']){const p=make(1,i*7919,level);if(p.stage.rest)counts[level]++;if(level==='easy'&&p.stage.leaf)counts.leaf++;if(level==='easy'&&p.stage.leaf&&p.stage.rest)counts.both++;if(level==='easy'&&p.stage.leaf&&p.stage.recovery)counts.candyLeaf++;}
  const p=make(5,i*7919,'normal');if(p.stage.rest)counts.danger++;
  for(const n of [3,11,19]){const a=make(n,i*7919);const b=make(n,i*7919);assert.deepEqual(a.stage,b.stage);
   const points=[a.stage.leaf,a.stage.rest,a.stage.recovery,...a.stage.sticky].filter(Boolean).map(p=>`${p.x},${p.y}`);assert.equal(new Set(points).size,points.length);
   for(const t of a.stage.sticky){assert.ok(Math.hypot(t.x-.5,t.y-.5)>STICKY.endpointClearance);assert.ok(Math.hypot(t.x-6.5,t.y-6.5)>STICKY.endpointClearance);}
   assert.equal(a.stage.theme.id,'sticky');assert.equal(a.stage.sticky.length,n===3?1:a.stage.sticky.length);assert.ok(a.stage.sticky.length>=1&&a.stage.sticky.length<=2);
   const route=a.stage.maze.path;assert.equal(a.stage.sticky.filter(p=>route.some(c=>p.x===c.x+.5&&p.y===c.y+.5)).length,1);
   if(a.stage.leaf){const index=route.findIndex(c=>c.x+.5===a.stage.leaf.x&&c.y+.5===a.stage.leaf.y);assert.ok(index/(route.length-1)>=LEAF.pathMin&&index/(route.length-1)<=LEAF.pathMax);}
  }
 }
 assert.ok(counts.easy>240&&counts.easy<360,JSON.stringify(counts));assert.ok(counts.normal>140&&counts.normal<260,JSON.stringify(counts));assert.ok(counts.danger>340&&counts.danger<460,JSON.stringify(counts));assert.ok(counts.leaf>440&&counts.leaf<560,JSON.stringify(counts));
 assert.ok(counts.both>90&&counts.both<210,JSON.stringify(counts));assert.ok(counts.candyLeaf>180&&counts.candyLeaf<320,JSON.stringify(counts));assert.equal(make().stage.theme.id,'basic');assert.equal(createStagePlay(1).stage.leaf,null);
});
