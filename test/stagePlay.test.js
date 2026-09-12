import test from 'node:test';
import assert from 'node:assert/strict';
import { createStagePlay } from '../src/game/stagePlay.js';
import { difficultyAt } from '../src/game/progression.js';
import { BASE } from '../src/config/gameConfig.js';
import { goalCenter } from '../src/world/stage.js';

const tick = (play, elapsedMs = 1000 / 60, tilt = { x: 0, y: 0 }) =>
  play.advance({ dt: Math.min(elapsedMs / 1000, 1 / 20), elapsedMs, tilt, base: BASE });

test('衝突通知は実際の衝突を伝え、音の有無で物理やHPを変えない', () => {
  const a = createStagePlay(123, difficultyAt(1)), b = createStagePlay(123, difficultyAt(1));
  for (const play of [a, b]) { play.actor.x = play.actor.r + .13; play.actor.vx = -4; }
  const impacts = [];
  const input = { dt: .05, elapsedMs: 50, tilt: { x: 0, y: 0 }, base: BASE };
  assert.equal(a.advance({ ...input, onImpact: (speed, wall) => impacts.push({ speed, wall }) }), b.advance(input));
  assert.ok(impacts.length > 0);
  assert.ok(impacts[0].speed > 0);
  assert.equal(impacts[0].wall.materialId, 'default');
  assert.deepEqual(a.actor, b.actor); assert.equal(a.hp.value, b.hp.value);
});

test('プラクティスはHP・制限時間なしで、標準の壁だけを使う', () => {
  const play = createStagePlay(123);
  assert.equal(play.hp, null);
  assert.equal(play.limitSec, null);
  assert.ok(play.stage.walls.every((wall) => wall.materialId === 'default'));
  play.teleport(0.5, 0.5);
  tick(play, 600000);
  assert.equal(play.status, 'playing');
  assert.equal(play.timeMs, 600000);
});

test('動き始めるまで時間は減らず、開始後は停止したボールにも時間が流れる', () => {
  const play = createStagePlay(123, difficultyAt(1));
  tick(play, 5000);
  assert.equal(play.timeMs, 0);
  assert.equal(play.started, false);
  tick(play, 50, { x: 1, y: 0 });
  assert.equal(play.started, true);
  assert.equal(play.timeMs, 0);
  play.actor.vx = 0; play.actor.vy = 0;
  tick(play, 2000);
  assert.equal(play.timeMs, 2000);
  assert.equal(play.remainingSec, play.limitSec - 2);
});

test('制限時間を超えたフレームでゴールにいても時間切れを優先し、終了後は進行しない', () => {
  const play = createStagePlay(123, difficultyAt(1));
  const goal = goalCenter(play.stage.maze);
  play.teleport(goal.x, goal.y);
  tick(play, play.limitSec * 1000);
  assert.equal(play.status, 'timeout');
  assert.equal(play.remainingSec, 0);
  const time = play.timeMs;
  tick(play, 3000);
  assert.equal(play.timeMs, time);
});

test('既存の物理衝突からHPが減り、閾値未満の接触は無傷', () => {
  const play = createStagePlay(123, difficultyAt(1));
  play.actor.x = play.actor.r + 0.06;
  play.actor.vx = -5.38;
  const damage = tick(play, 50);
  assert.ok(damage > 0);
  assert.ok(damage <= play.hp.max * 0.35);
  assert.equal(play.hp.value, play.hp.max - damage);
  const gentle = createStagePlay(123, difficultyAt(1));
  gentle.actor.x = gentle.actor.r + 0.05;
  gentle.actor.vx = -0.5;
  assert.equal(tick(gentle, 50), 0);
  assert.equal(gentle.hp.value, gentle.hp.max);
});

test('HP0はゴールより優先し、同一シードの再開ではHP・時間・素材を復元する', () => {
  const play = createStagePlay(123, difficultyAt(4));
  for (let i = 0; i < 10 && !play.hp.isDead; i++) play.hp.applyImpact(30, null, i);
  const goal = goalCenter(play.stage.maze);
  play.teleport(goal.x, goal.y);
  tick(play);
  assert.equal(play.status, 'dead');
  const retried = createStagePlay(123, difficultyAt(4));
  assert.equal(retried.hp.value, retried.hp.max);
  assert.equal(retried.timeMs, 0);
  assert.equal(retried.started, false);
  assert.deepEqual(retried.stage.walls, play.stage.walls);
  assert.equal(retried.limitSec, play.limitSec);
});

test('時間内かつHPが残っていればクリアできる', () => {
  const play = createStagePlay(123, difficultyAt(1));
  const goal = goalCenter(play.stage.maze);
  play.teleport(goal.x, goal.y);
  tick(play, 100);
  assert.equal(play.status, 'clear');
  assert.equal(play.hp.tookDamage, false);
});

test('チャレンジは微速でも実移動で時計が始まり、時間無制限で進めない', () => {
  const play = createStagePlay(42, difficultyAt(1));
  const [start, next] = play.stage.maze.path;
  const tilt = { x: (next.x - start.x) * 0.05, y: (next.y - start.y) * 0.05 };
  for (let i = 0; i < 60; i++) tick(play, 1000 / 60, tilt);
  assert.ok(Math.hypot(play.actor.vx, play.actor.vy) < 0.5);
  assert.equal(play.started, true);
  assert.ok(play.timeMs > 0);
  tick(play, play.limitSec * 1000);
  assert.equal(play.status, 'timeout');
});
