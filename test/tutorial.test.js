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

test('同時接触の説明は重複せず順に保持し、再挑戦時にリセット',async()=>{
 const {createLessonQueue}=await import('../src/game/tutorialLessons.js');const q=createLessonQueue();
 q.contact('stone');q.contact('rubber');q.contact('stone');assert.equal(q.next(),'stone');q.contact('stone');assert.equal(q.next(),'rubber');assert.equal(q.next(),undefined);
 q.reset();q.contact('stone');assert.equal(q.next(),'stone');
});
