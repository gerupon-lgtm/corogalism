import test from 'node:test';
import assert from 'node:assert/strict';
import { playRun, playStage } from '../tools/balance.mjs';

/**
 * T-216 ラン全体の回帰テスト ★安全性の要
 *
 * 「丁寧に走ればランが極端に短くならない」ことと、
 * 「攻めるとHP0で終わることがある」ことの両方を機械的に保証する。
 * gameConfig の数値を動かしてこのテストが落ちたら、調整が行き過ぎている。
 *
 * 基準値は本実装での実測（tools/balance.mjs、100ラン）:
 *   urgency 1.00 → 中央値12面、終了理由は時間切れ100%
 *   urgency 1.15 → 中央値14面、HP0 9%
 *   urgency 1.30 → 中央値15面、HP0 45%
 */

const RUNS = 25;

function runMany(urgency) {
  const stages = [];
  const causes = { dead: 0, timeout: 0, cap: 0 };
  for (let s = 1; s <= RUNS; s++) {
    const r = playRun(s, urgency, 60);
    stages.push(r.stages);
    causes[r.cause]++;
  }
  stages.sort((a, b) => a - b);
  return { median: stages[Math.floor(stages.length / 2)], min: stages[0], max: stages[stages.length - 1], causes };
}

test('丁寧に走ればランが極端に短くならない（実測中央値12面）', () => {
  const r = runMany(1.0);
  assert.ok(r.median >= 10, `中央値が短すぎる: ${r.median}面`);
  assert.ok(r.min >= 5, `最短が短すぎる: ${r.min}面`);
});

test('ランは必ず終わる（HPだけでは終わらなかった問題の回帰）', () => {
  for (const urgency of [1.0, 1.15, 1.3]) {
    const r = runMany(urgency);
    assert.equal(r.causes.cap, 0, `urgency ${urgency} で上限まで到達したランがある（終わりが来ていない）`);
    assert.ok(r.max <= 40, `urgency ${urgency} でランが長すぎる: ${r.max}面`);
  }
});

test('攻めるとHP0で終わることがある（罰が効いている）', () => {
  const r = runMany(1.3);
  const deadRatio = r.causes.dead / RUNS;
  assert.ok(deadRatio >= 0.2, `HP0による終了が少なすぎる: ${(deadRatio * 100).toFixed(0)}%`);
});

test('急ぐほど遠くまで行けるが、死にやすくもなる（リスクとリターン）', () => {
  const calm = runMany(1.0);
  const bold = runMany(1.3);
  assert.ok(bold.median >= calm.median, '急ぐほうが到達面数が多い');
  assert.ok(bold.causes.dead > calm.causes.dead, '急ぐほうがHP0で終わりやすい');
});

test('制限時間は経路長に比例し、面が進むと縮む', () => {
  const early = playStage(101, 1, 1.0);
  const late = playStage(101, 20, 1.0);
  assert.ok(late.limitSec < early.limitSec, '面が進むと制限時間が縮む');
  assert.ok(Math.abs(early.limitSec / early.maze.pathLength - 0.55) < 1e-9, '面1は0.55秒/マス');
});
