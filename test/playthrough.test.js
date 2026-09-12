import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMaze } from '../src/maze/generator.js';
import { createStage, createActor, goalCenter } from '../src/world/stage.js';
import { getCharacter } from '../src/world/characters.js';
import { stepPhysics } from '../src/physics/integrator.js';
import { BASE, TUNING } from '../src/config/gameConfig.js';

/** 迷路の唯一経路（スパニングツリー）を start → goal でたどる */
function solve(maze) {
  const { size, cells, start, goal } = maze;
  const from = new Array(size * size).fill(-1);
  const si = start.y * size + start.x;
  const gi = goal.y * size + goal.x;
  const queue = [si];
  const seen = new Array(size * size).fill(false);
  seen[si] = true;

  while (queue.length) {
    const cur = queue.shift();
    if (cur === gi) break;
    const cx = cur % size;
    const cy = (cur - cx) / size;
    const c = cells[cur];
    const steps = [
      { open: !c.t, nx: cx, ny: cy - 1 },
      { open: !c.r, nx: cx + 1, ny: cy },
      { open: !c.b, nx: cx, ny: cy + 1 },
      { open: !c.l, nx: cx - 1, ny: cy },
    ];
    for (const s of steps) {
      if (!s.open || s.nx < 0 || s.ny < 0 || s.nx >= size || s.ny >= size) continue;
      const ni = s.ny * size + s.nx;
      if (seen[ni]) continue;
      seen[ni] = true;
      from[ni] = cur;
      queue.push(ni);
    }
  }

  const path = [];
  for (let i = gi; i !== -1; i = from[i]) path.push({ x: (i % size) + 0.5, y: Math.floor(i / size) + 0.5 });
  return path.reverse();
}

/**
 * 経路上の次の点へ向かうように傾ける単純な操縦（seek）。
 * 「調整済みのパラメータで、生成された迷路が実際に完走できるか」を検証する。
 * 物理の調整を壊したときにここが落ちる。
 */
function autoplay(seed, { maxSeconds = 60 } = {}) {
  const maze = generateMaze(BASE.mazeSize, seed);
  const stage = createStage(maze);
  const actor = createActor(maze, getCharacter('default'));
  const path = solve(maze);
  const goal = goalCenter(maze);

  let wp = 1;
  const dt = 1 / 120;
  const steps = Math.round(maxSeconds / dt);

  for (let i = 0; i < steps; i++) {
    const target = path[Math.min(wp, path.length - 1)];
    const dx = target.x - actor.x;
    const dy = target.y - actor.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.22 && wp < path.length - 1) wp++;

    // 目標速度へ近づける向きに傾ける
    const desired = 2.5;
    const ux = dist > 1e-6 ? dx / dist : 0;
    const uy = dist > 1e-6 ? dy / dist : 0;
    let tx = ux * desired - actor.vx;
    let ty = uy * desired - actor.vy;
    const m = Math.hypot(tx, ty);
    if (m > 1) { tx /= m; ty /= m; }

    stepPhysics({ actor, stage, tilt: { x: tx, y: ty }, base: BASE, dt });

    if (Math.hypot(actor.x - goal.x, actor.y - goal.y) < TUNING.goalRadius) {
      return { cleared: true, seconds: i * dt, pathLength: path.length };
    }
  }
  return { cleared: false, seconds: maxSeconds, pathLength: path.length };
}

test('調整済みパラメータで、生成された迷路を完走できる（20シード）', () => {
  const failed = [];
  const times = [];
  for (let seed = 1; seed <= 20; seed++) {
    const r = autoplay(seed);
    if (!r.cleared) failed.push(seed);
    else times.push(r.seconds);
  }
  assert.deepEqual(failed, [], `完走できなかったシード: ${failed.join(', ')}`);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  assert.ok(avg < 30, `平均クリア時間が長すぎる: ${avg.toFixed(1)}秒`);
});

test('ゴール到達までにボールは盤内に留まる', () => {
  const maze = generateMaze(BASE.mazeSize, 777);
  const stage = createStage(maze);
  const actor = createActor(maze, getCharacter('default'));
  for (let i = 0; i < 3600; i++) {
    stepPhysics({ actor, stage, tilt: { x: Math.sin(i / 37), y: Math.cos(i / 53) }, base: BASE, dt: 1 / 60 });
    assert.ok(actor.x > 0 && actor.x < maze.size && actor.y > 0 && actor.y < maze.size);
  }
});
