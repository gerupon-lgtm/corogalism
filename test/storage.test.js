import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getBest,
  loadRunBests,
  loadSettings,
  saveBest,
  saveRunBest,
  saveSettings,
} from '../src/record/storage.js';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
  };
}

beforeEach(() => {
  globalThis.localStorage = createStorage();
});

afterEach(() => {
  delete globalThis.localStorage;
});

test('ラン記録は到達面数を優先し、同面数なら合計タイムが速い記録を残す', () => {
  const first = saveRunBest({ stages: 3, totalTimeMs: 10_000, usedContinue: false });
  assert.equal(first.updated, true);
  assert.equal(first.saved, true);
  assert.deepEqual(
    { stages: first.best.stages, totalTimeMs: first.best.totalTimeMs },
    { stages: 3, totalTimeMs: 10_000 },
  );

  const moreStages = saveRunBest({ stages: 4, totalTimeMs: 99_000, usedContinue: false });
  assert.equal(moreStages.updated, true);
  assert.equal(moreStages.best.stages, 4);

  const faster = saveRunBest({ stages: 4, totalTimeMs: 98_000, usedContinue: false });
  assert.equal(faster.updated, true);
  assert.equal(faster.best.totalTimeMs, 98_000);

  const exactTie = saveRunBest({ stages: 4, totalTimeMs: 98_000, usedContinue: false });
  assert.deepEqual(exactTie, { updated: false, saved: true, best: faster.best });

  const fewerStages = saveRunBest({ stages: 3, totalTimeMs: 1, usedContinue: false });
  assert.deepEqual(fewerStages, { updated: false, saved: true, best: faster.best });
});

test('ノーコンティニューとコンティニュー込みの記録を別々に保存する', () => {
  const noContinue = saveRunBest({
    stages: 5,
    totalTimeMs: 50_000,
    noDamageStages: 3,
    usedContinue: false,
    cause: 'dead',
  });
  const withContinue = saveRunBest({
    stages: 8,
    totalTimeMs: 80_000,
    noDamageStages: 4,
    usedContinue: true,
    cause: 'timeout',
  });

  assert.deepEqual(loadRunBests(), {
    noContinue: noContinue.best,
    withContinue: withContinue.best,
  });
});

test('不正なラン記録は未保存として読み飛ばす', () => {
  globalThis.localStorage = createStorage({ 'corogalism-run-bests': '{broken' });
  assert.deepEqual(loadRunBests(), { noContinue: null, withContinue: null });

  globalThis.localStorage = createStorage({
    'corogalism-run-bests': JSON.stringify({
      noContinue: { stages: '5', totalTimeMs: 100, at: 'today' },
      withContinue: { stages: 2, totalTimeMs: -1, at: 'today' },
    }),
  });
  assert.deepEqual(loadRunBests(), { noContinue: null, withContinue: null });
});

test('ラン記録は既存の設定とプラクティス記録から独立している', () => {
  saveSettings({ mode: 'pointer', maxTiltAngleDeg: 20, calibration: null });
  saveBest(123, 4_000, 2);

  saveRunBest({ stages: 6, totalTimeMs: 60_000, usedContinue: false });

  assert.equal(loadSettings().mode, 'pointer');
  assert.equal(getBest(123).timeMs, 4_000);
  assert.equal(loadRunBests().noContinue.stages, 6);
});

test('localStorageへ書き込めない場合は保存成功を返さない', () => {
  globalThis.localStorage = {
    getItem() { return null; },
    setItem() { throw new Error('blocked'); },
  };

  const result = saveRunBest({ stages: 2, totalTimeMs: 20_000, usedContinue: false });
  assert.equal(result.updated, true);
  assert.equal(result.saved, false);
  assert.equal(result.best.stages, 2);
});

test('localStorageを読めない場合も未保存として扱う', () => {
  globalThis.localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };

  assert.deepEqual(loadRunBests(), { noContinue: null, withContinue: null });
  assert.doesNotThrow(() => saveRunBest({ stages: 1, totalTimeMs: 1_000, usedContinue: true }));
});
test('難易度ごとに2枠ずつ保存し、旧記録は通常に残す', () => {
  const old = saveRunBest({ stages: 8, totalTimeMs: 8000, usedContinue: false });
  const easy = saveRunBest({ stages: 2, totalTimeMs: 3000, usedContinue: false, level: 'easy' });
  const continued = saveRunBest({ stages: 4, totalTimeMs: 9000, usedContinue: true, level: 'easy' });
  assert.deepEqual(loadRunBests('normal').noContinue, old.best);
  assert.deepEqual(loadRunBests('easy'), { noContinue: easy.best, withContinue: continued.best });
  assert.equal(loadRunBests('normal').withContinue, null);
});
