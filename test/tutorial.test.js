import test from 'node:test';
import assert from 'node:assert/strict';
import { createTutorialStage } from '../src/world/tutorialStage.js';
import { checkReachability } from '../src/maze/validator.js';
import { createStagePlay } from '../src/game/stagePlay.js';
import { BASE, TUTORIAL } from '../src/config/gameConfig.js';
const advance=(p,elapsedMs=16)=>p.advance({dt:0,elapsedMs,tilt:{x:0,y:0},base:BASE});
test('固定練習面は全セル到達可能・壁6種・床6種・アイテム3種',()=>{
 const s=createTutorialStage();assert.deepEqual(s,createTutorialStage());assert.equal(checkReachability(s.maze).ok,true);
 assert.deepEqual(new Set(s.walls.map(w=>w.materialId)),new Set(['default','rubber','cork','stone','moss','spike']));
 assert.deepEqual(new Set(s.zones.map(z=>z.kind)),new Set(['sand','ice','radial']));
 assert.deepEqual(s.zones.filter(z=>z.kind==='radial').map(z=>Math.sign(z.strength)),[1,-1]);
 for(const f of s.zones.filter(z=>z.kind==='radial'))for(const t of [s.rest,...s.sticky,s.recovery,s.leaf,s.hourglass])assert.ok(Math.hypot(f.x-t.x,f.y-t.y)>f.radius+.3,'力場と静止／取得体験を分離');
 for(const tile of [s.rest,...s.sticky,s.recovery,s.leaf,s.hourglass]){assert.ok(tile.x>0&&tile.x<7&&tile.y>0&&tile.y<7);}
 for(const item of [s.recovery,s.leaf,s.hourglass])assert.ok(s.maze.path.some(c=>c.x+.5===item.x&&c.y+.5===item.y),'取得物はルート上');
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

test('素材説明は初回の待ち時間・読む時間・見返しを保つ',async(testCase)=>{
 const {createLessonTiming}=await import('../src/game/tutorialLessons.js');
 await testCase.test('初回は接触から700ms待ち、続く説明は最低4800ms残す',()=>{
  const t=createLessonTiming(TUTORIAL);
  t.tick(60000);t.contact('rubber');t.contact('stone');
  t.tick(699);assert.equal(t.active,null);assert.deepEqual(t.history,[]);assert.equal(t.pendingCount,2);
  t.tick(1);assert.equal(t.active,'rubber');assert.deepEqual(t.history,['rubber']);
  t.tick(700);assert.equal(t.active,'rubber');
  t.tick(4099);assert.equal(t.active,'rubber');assert.equal(t.pendingCount,1);
  t.tick(1);assert.equal(t.active,'stone');assert.deepEqual(t.history,['rubber','stone']);
  t.tick(60000);assert.equal(t.active,'stone');assert.equal(t.pendingCount,0);
 });
 await testCase.test('大きな時間差でも一度に一件だけ表示し、未読を飛ばさない',()=>{
  const t=createLessonTiming(TUTORIAL);
  for(const id of ['rubber','stone','moss'])t.contact(id);
  t.tick(1000000);assert.equal(t.active,'rubber');assert.equal(t.pendingCount,2);assert.deepEqual(t.history,['rubber']);
  t.tick(1000000);assert.equal(t.active,'stone');assert.equal(t.pendingCount,1);
  t.tick(4799);assert.equal(t.active,'stone');t.tick(1);assert.equal(t.active,'moss');
  assert.deepEqual(t.history,['rubber','stone','moss']);
 });
 await testCase.test('見返しは未読を失わず、最後の履歴から次の未読を開ける',()=>{
  const t=createLessonTiming(TUTORIAL);
  for(const id of ['rubber','stone','moss','spike'])t.contact(id);
  assert.equal(t.review(1),null);assert.equal(t.pendingCount,4);assert.deepEqual(t.history,[]);
  t.tick(700);assert.equal(t.review(1),'stone');assert.equal(t.pendingCount,2);
  assert.equal(t.review(-1),'rubber');assert.deepEqual(t.history,['rubber','stone']);
  t.tick(2400);assert.equal(t.review(1),'stone');
  t.tick(4799);assert.equal(t.active,'stone');assert.equal(t.pendingCount,2);
  t.tick(1);assert.equal(t.active,'moss');assert.equal(t.pendingCount,1);
  assert.equal(t.review(-1),'stone');assert.equal(t.review(1),'moss');
  assert.equal(t.review(1),'spike');assert.equal(t.pendingCount,0);
  assert.equal(t.review(1),'rubber');assert.equal(t.review(-1),'spike');
  assert.deepEqual(t.history,['rubber','stone','moss','spike']);
  const history=t.history;history.push('unviewed');history[0]='changed';
  assert.deepEqual(t.history,['rubber','stone','moss','spike']);assert.equal(t.active,'spike');
 });
 await testCase.test('停止中に呼出しを止めれば初回待ちと読む時間も進まない',()=>{
  const t=createLessonTiming(TUTORIAL),advance=(ms,canAdvance)=>{if(canAdvance)t.tick(ms);};
  t.contact('rubber');t.contact('stone');advance(699,true);advance(60000,false);
  assert.equal(t.active,null);advance(1,true);assert.equal(t.active,'rubber');
  advance(4799,true);advance(60000,false);assert.equal(t.active,'rubber');
  advance(1,true);assert.equal(t.active,'stone');
 });
 await testCase.test('読む時間の設定を使い、待ち説明がなくても表示時間を数える',()=>{
  const t=createLessonTiming({...TUTORIAL,readingMs:1200});
  t.contact('rubber');t.tick(700);t.tick(1199);t.contact('stone');t.tick(0);
  assert.equal(t.active,'rubber');t.tick(1);assert.equal(t.active,'stone');
  t.tick(1200);t.contact('moss');t.tick(0);assert.equal(t.active,'moss');
 });
 await testCase.test('同じ素材を再登録せず、リセット後は履歴と待ち時間を初期化する',()=>{
  const t=createLessonTiming(TUTORIAL);
  t.contact('rubber');t.contact('rubber');t.tick(700);t.contact('rubber');
  assert.equal(t.pendingCount,0);assert.equal(t.review(-1),'rubber');assert.equal(t.review(1),'rubber');
  t.contact('stone');t.reset();assert.equal(t.active,null);assert.equal(t.pendingCount,0);assert.deepEqual(t.history,[]);
  assert.equal(t.review(-1),null);t.contact('rubber');t.tick(699);assert.equal(t.active,null);
  t.tick(1);assert.equal(t.active,'rubber');assert.deepEqual(t.history,['rubber']);
 });
});
test('ゴムとトゲは助走先の縦壁だけにし、壁の大半を標準にする',()=>{
 const s=createTutorialStage();for(const [id,count] of [['rubber',2],['spike',2],['stone',1],['moss',1]])assert.equal(s.walls.filter(w=>w.materialId===id).length,count);
 assert.ok(s.walls.filter(w=>['rubber','spike'].includes(w.materialId)).every(w=>w.h>w.w));
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

test('ひとやすみは標準壁の角へゆっくり寄せて回復できる',()=>{
 const p=createStagePlay(0,null,{tutorial:true});p.hp.applyImpact(4,{materialId:'stone'},1);
 const initial=p.hp.value;p.teleport(4,4.5);
 for(let i=0;i<1200&&!p.stage.rest.used;i++)p.advance({dt:1/120,elapsedMs:1000/120,tilt:{x:-.1,y:-.1},base:BASE});
 assert.equal(p.stage.rest.used,true);assert.ok(p.hp.value>initial);
});
