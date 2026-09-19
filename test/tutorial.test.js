import test from 'node:test';
import assert from 'node:assert/strict';
import { createTutorialStage } from '../src/world/tutorialStage.js';
import { checkReachability } from '../src/maze/validator.js';
import { createStagePlay } from '../src/game/stagePlay.js';
import { BASE, TUTORIAL } from '../src/config/gameConfig.js';
const advance=(p,elapsedMs=16)=>p.advance({dt:0,elapsedMs,tilt:{x:0,y:0},base:BASE});
test('固定練習面は全セル到達可能・壁5種・床2種・アイテム3種',()=>{
 const s=createTutorialStage();assert.deepEqual(s,createTutorialStage());assert.equal(checkReachability(s.maze).ok,true);
 assert.deepEqual(new Set(s.walls.map(w=>w.materialId)),new Set(['default','rubber','stone','moss','spike']));
 for(const tile of [s.rest,...s.sticky,s.recovery,s.leaf,s.hourglass]){assert.ok(tile.x>0&&tile.x<7&&tile.y>0&&tile.y<7);}
});
test('練習は時間制限と死亡なし・通常の速度と素材によるダメージ差を保持',()=>{
 const p=createStagePlay(4,null,{tutorial:true});p.teleport(.5,.5);advance(p,1000000);assert.equal(p.limitSec,null);assert.equal(p.status,'playing');
 const damage=(speed,id)=>createStagePlay(4,null,{tutorial:true}).hp.applyImpact(speed,{materialId:id},1);
 assert.equal(damage(.5,'spike'),0);assert.ok(damage(3,'stone')>damage(2,'stone'));assert.ok(damage(2,'stone')>damage(2,'moss'));assert.equal(damage(4,'rubber'),0);
 for(let i=0;i<100;i++)p.hp.applyImpact(10,{materialId:'spike'},i);advance(p);assert.equal(p.hp.value,TUTORIAL.minHp);assert.equal(p.status,'playing');
});
test('練習の回復・葉っぱ・休憩・とりもち・砂時計を実際に使える',()=>{
 const p=createStagePlay(0,null,{tutorial:true});p.hp.applyImpact(4,{materialId:'stone'},1);
 const visit=t=>{p.teleport(t.x,t.y);advance(p)};
 visit(p.stage.recovery);assert.equal(p.stage.recovery.collected,true);
 visit(p.stage.leaf);assert.ok(p.shield.value>0);
 p.hp.applyImpact(6,{materialId:'stone'},2);visit(p.stage.rest);advance(p,2100);assert.equal(p.stage.rest.used,true);
 visit(p.stage.sticky[0]);assert.ok(p.trap);for(let i=0;i<5;i++)p.assistEscape();advance(p,500);assert.equal(p.trap,null);
 visit(p.stage.hourglass);assert.equal(p.stage.hourglass.collected,true);assert.equal(p.remainingSec,null);
 p.teleport(6.5,6.5);advance(p);assert.equal(p.status,'clear');
});

test('説明は0.7秒後に更新し、残し続け、各素材は初回だけ',async()=>{
 const {createLessonTiming}=await import('../src/game/tutorialLessons.js');const t=createLessonTiming(TUTORIAL);
 t.contact('rubber');t.tick(699);assert.equal(t.active,null);t.tick(1);assert.equal(t.active,'rubber');t.tick(60000);assert.equal(t.active,'rubber');
 t.contact('stone');t.contact('rubber');t.tick(699);assert.equal(t.active,'rubber');t.tick(1);assert.equal(t.active,'stone');t.tick(60000);assert.equal(t.active,'stone');
 t.contact('moss');t.contact('spike');t.contact('moss');t.tick(700);assert.equal(t.active,'moss');t.tick(700);assert.equal(t.active,'spike');t.tick(60000);assert.equal(t.active,'spike');
 t.reset();assert.equal(t.active,null);t.contact('rubber');t.tick(700);assert.equal(t.active,'rubber');
});
test('体験用のゴムとトゲを増やし、壁の大半を標準にする',()=>{
 const s=createTutorialStage();for(const [id,count] of [['rubber',3],['spike',3],['stone',1],['moss',1]])assert.equal(s.walls.filter(w=>w.materialId===id).length,count);
 assert.ok(s.walls.filter(w=>w.materialId==='default').length/s.walls.length>.8);
});

test('横通路の助走でゴムの反発とトゲの被弾を体験できる',()=>{
 for(const [x,y,direction,id] of [[2.5,1.5,1,'rubber'],[5.5,3.5,-1,'spike']]){
  const p=createStagePlay(0,null,{tutorial:true});p.teleport(x,y);
  let hit=null;
  for(let i=0;i<600&&!hit;i++)p.advance({dt:1/120,elapsedMs:1000/120,tilt:{x:direction*.5,y:0},base:BASE,onImpact(speed,wall){hit={speed,id:wall.materialId};}});
  assert.ok(hit,'静止から一定の傾きで通路の先へ到達');assert.equal(hit.id,id);assert.ok(hit.speed>1.2,'ダメージ閾値を超える助走速度');
  if(id==='rubber'){assert.ok(p.actor.vx*direction<0);assert.equal(p.hp.value,p.hp.max);}
  else assert.ok(p.hp.value<p.hp.max);
 }
});
