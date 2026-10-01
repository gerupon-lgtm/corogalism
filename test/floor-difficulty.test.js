import test from 'node:test';
import assert from 'node:assert/strict';
import { createStagePlay } from '../src/game/stagePlay.js';
import { challengeDifficulty } from '../src/game/challenge.js';
import { difficultyAt, stageTimeLimitSec } from '../src/game/progression.js';
import { getMaterial } from '../src/world/materials.js';
import { createHp } from '../src/game/hp.js';
import { saveRunBest, loadLegacyRunBests } from '../src/record/storage.js';

test('通常もゆるめ、床負荷と折れ回数を時間へ反映する',()=>{
 const d=challengeDifficulty(16,'normal'),old=difficultyAt(16);
 assert.ok(d.damageMult<old.damageMult);
 assert.equal(d.hpPerTurn,4);
 for(const n of [1,4,6,8,10,16,40])for(const level of ['normal','easy']){
  const p=createStagePlay(7919,challengeDifficulty(n,level));
  assert.ok(p.limitSec>=(level==='normal'?25:30));
  assert.ok(p.limitSec>stageTimeLimitSec(p.stage.maze,old));
 }
});
test('コルクは通常と同じ反発で低ダメージ、閾値と上限を維持',()=>{
 assert.equal(getMaterial('cork').restitutionK,1);
 assert.equal(getMaterial('cork').damageK,.25);
 const a=createHp({turns:10,hpPerTurn:4}),b=createHp({turns:10,hpPerTurn:4});
 assert.equal(a.applyImpact(1,{materialId:'cork'},0),0);
 assert.ok(a.applyImpact(3,{materialId:'cork'},1)<b.applyImpact(3,{materialId:'default'},1));
 assert.ok(a.applyImpact(30,{materialId:'cork'},2)<=a.max*.35);
});
test('新旧ルールの記録を混ぜず旧ベストを保持する',()=>{
 const map=new Map();globalThis.localStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 const old={noContinue:{stages:16,totalTimeMs:30000,at:'2026-09-22T00:00:00Z'}};
 map.set('corogalism-run-bests',JSON.stringify(old));
 const r=saveRunBest({stages:2,totalTimeMs:9000,usedContinue:false,level:'normal'});
 assert.equal(r.saved,true);assert.equal(r.best.stages,2);
 assert.equal(r.best.rulesVersion,'floor-v1');
 assert.deepEqual(loadLegacyRunBests().noContinue,old.noContinue);
 assert.deepEqual(JSON.parse(map.get('corogalism-run-bests')),old);
 delete globalThis.localStorage;
});
