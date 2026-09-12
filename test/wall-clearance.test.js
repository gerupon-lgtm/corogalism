import test from 'node:test';
import assert from 'node:assert/strict';
import { playStage } from '../tools/balance.mjs';

test('厚くした壁でも序盤3面は丁寧な操縦でクリアできる（各100シード）', () => {
  for (const stage of [1, 2, 3]) {
    for (let seed = 1; seed <= 100; seed++) {
      const result = playStage(seed, stage, 1);
      assert.equal(result.result, 'clear', `${stage}面目 / seed ${seed}`);
      assert.ok(result.hp.value > 0);
      assert.ok(result.sec < result.limitSec);
    }
  }
});
