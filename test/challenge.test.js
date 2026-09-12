import test from 'node:test';
import assert from 'node:assert/strict';
import { challengeDifficulty } from '../src/game/challenge.js';
import { createStagePlay } from '../src/game/stagePlay.js';
import { createRecovery } from '../src/world/recovery.js';
import { themeAt } from '../src/world/themes.js';
import { BASE, RECOVERY } from '../src/config/gameConfig.js';
import { playStage } from '../tools/balance.mjs';

test('新テーマの序盤10面は両難易度で丁寧に完走できる（各10シード）', () => {
  for (const level of ['normal', 'easy']) for (let stage = 1; stage <= 10; stage++) for (let seed = 1; seed <= 10; seed++) {
    assert.equal(playStage(seed * 7919, stage, 1, level).result, 'clear', `${level} stage=${stage} seed=${seed}`);
  }
});

test('やさしいは衝突速度・素材によらず通常の半分。迷路・時間・物理は共通', () => {
  for (const stage of [1, 4, 10, 30]) for (const materialId of ['default','rubber','moss','stone','spike']) for (const speed of [1, 2, 6, 30]) {
    const normal = createStagePlay(123, challengeDifficulty(stage, 'normal'));
    const easy = createStagePlay(123, challengeDifficulty(stage, 'easy'));
    assert.equal(easy.limitSec, normal.limitSec);
    assert.deepEqual(easy.stage.walls, normal.stage.walls);
    assert.deepEqual(easy.actor, normal.actor);
    assert.equal(easy.hp.max, normal.hp.max);
    assert.equal(easy.hp.applyImpact(speed, { materialId }, 1), normal.hp.applyImpact(speed, { materialId }, 1) * 0.5);
  }
});

test('キャンディの抽選・経路後半の位置は固定で、確率を変更できる', () => {
  const counts = { easy: 0, normal: 0 };
  for (let seed = 1; seed <= 1000; seed++) for (const level of ['easy', 'normal']) {
    const a = createStagePlay(seed * 7919, challengeDifficulty(4, level));
    const b = createStagePlay(seed * 7919, challengeDifficulty(4, level));
    assert.deepEqual(a.stage.recovery, b.stage.recovery);
    const item = a.stage.recovery;
    if (item) {
      counts[level]++;
      const path = a.stage.maze.path;
      const index = path.findIndex(p => p.x + 0.5 === item.x && p.y + 0.5 === item.y);
      assert.ok(index / (path.length - 1) >= RECOVERY.pathMin && index / (path.length - 1) <= RECOVERY.pathMax);
    }
    assert.equal(createRecovery(a.stage.maze, 0), null);
    assert.ok(createRecovery(a.stage.maze, 1));
  }
  assert.ok(counts.easy > 440 && counts.easy < 560, JSON.stringify(counts));
  assert.ok(counts.normal > 150 && counts.normal < 250, JSON.stringify(counts));
});

const tick = (p, extra = {}) => p.advance({ dt: 0, elapsedMs: 10, tilt: { x: 0, y: 0 }, base: BASE, ...extra });
test('満タンでは残り、触れると一度だけ20%回復。被弾履歴は維持', () => {
  const p = createStagePlay(123, { ...challengeDifficulty(4, 'normal'), recoveryChance: 1 });
  const item = p.stage.recovery;
  p.teleport(item.x, item.y); tick(p);
  assert.equal(item.collected, false);
  p.hp.applyImpact(30, { materialId: 'default' }, 0);
  const before = p.hp.value;
  let gained = 0;
  tick(p, { onRecovery: n => gained += n });
  assert.ok(Math.abs(gained - Math.min(p.hp.max * 0.2, p.hp.max - before)) < 1e-8);
  assert.equal(item.collected, true);
  assert.equal(p.hp.tookDamage, true);
  const after = p.hp.value; tick(p);
  assert.equal(p.hp.value, after);
  assert.equal(p.hp.heal(10000), p.hp.max - after);
  assert.equal(p.hp.value, p.hp.max);
});

test('死亡・時間切れ時の接触では回復も復活もしない', () => {
  for (const cause of ['dead', 'timeout']) {
    const p = createStagePlay(123, { ...challengeDifficulty(4, 'normal'), recoveryChance: 1 });
    p.teleport(p.stage.recovery.x, p.stage.recovery.y);
    if (cause === 'dead') for (let i = 0; i < 10; i++) p.hp.applyImpact(30, {}, i);
    tick(p, { elapsedMs: cause === 'timeout' ? p.limitSec * 1000 + 1 : 1 });
    assert.equal(p.status, cause); assert.equal(p.stage.recovery.collected, false);
    if (cause === 'dead') assert.equal(p.hp.heal(10000), 0);
  }
});

test('面には1種類の主役素材。外周・入口・出口は標準。序盤から段階的に紹介', () => {
  assert.deepEqual([1,2,3,4,5,10].map(n => themeAt(n).id), ['basic','basic','rest','bounce','careful','trial']);
  for (let n = 1; n <= 30; n++) for (let seed = 1; seed <= 10; seed++) {
    const { stage } = createStagePlay(seed, challengeDifficulty(n, 'normal'));
    const ids = new Set(stage.walls.map(w => w.materialId));
    assert.ok(ids.size <= 2);
    assert.ok([...ids].every(id => id === 'default' || id === stage.theme.material));
    if (stage.theme.id !== 'basic') assert.ok(ids.has(stage.theme.material));
    for (const w of stage.walls) if (w.x < 0 || w.y < 0 || w.x + w.w > 7 || w.y + w.h > 7) assert.equal(w.materialId, 'default');
  }
});
