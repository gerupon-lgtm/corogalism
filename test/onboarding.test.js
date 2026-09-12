import test from 'node:test';
import assert from 'node:assert/strict';
import { difficultyAt, stageTimeLimitSec } from '../src/game/progression.js';
import { createHp } from '../src/game/hp.js';
import { createStagePlay } from '../src/game/stagePlay.js';

test('序盤は道を探す時間と衝突の余裕を設ける（T-209）', () => {
  const difficulty = difficultyAt(1);
  assert.ok(stageTimeLimitSec({ pathLength: 25 }, difficulty) >= 34,
    '標準的な25マスの経路に、従来の約14秒ではなく34秒以上を用意する');
  const hp = createHp({ turns: 15, ...difficulty });
  assert.ok(hp.applyImpact(2.5, { materialId: 'default' }, 0) <= 8.5,
    '通常の衝突ダメージを従来の半分に抑える');
  const beginner = createStagePlay(123, difficulty);
  for (let i = 0; i < 4; i++) {
    const damage = beginner.hp.applyImpact(30, { materialId: 'spike' }, i);
    assert.ok(damage <= beginner.hp.max * 0.2, '実際の1面も、1発20%以内');
  }
  assert.equal(beginner.hp.isDead, false, '強い衝突4回を耐え、操作を覚える余地を残す');
});

test('序盤の緩和は段階的に減り、10面目で従来の難易度に戻る', () => {
  for (let n = 1; n < 10; n++) {
    const current = difficultyAt(n), next = difficultyAt(n + 1);
    assert.ok(next.secPerCell < current.secPerCell);
    assert.ok(next.damageMult > current.damageMult);
    assert.ok(next.damageCapRatio > current.damageCapRatio);
  }
  // 調整前の10・20面の実測値。後半へ緩和が漏れないことを確認する。
  const tenth = difficultyAt(10), twentieth = difficultyAt(20);
  assert.ok(Math.abs(tenth.secPerCell - 0.42210526315789476) < 1e-12);
  assert.ok(Math.abs(tenth.damageMult - 1.36) < 1e-12);
  assert.equal(tenth.damageCapRatio, 0.35);
  assert.equal(twentieth.secPerCell, 0.28);
  assert.equal(twentieth.damageMult, 1.76);
  assert.equal(twentieth.damageCapRatio, 0.35);
});

test('序盤でも微小接触は無傷、単発上限を35%より大きく指定しても安全上限は守る', () => {
  const hp = createHp({ turns: 15, ...difficultyAt(1) });
  assert.equal(hp.applyImpact(1.2, { materialId: 'spike' }, 0), 0);
  const capped = createHp({ turns: 15, hpPerTurn: 4, damageCapRatio: 1 });
  assert.equal(capped.applyImpact(30, { materialId: 'spike' }, 0), 35);
});
