// ランの長さの検証（本実装版）。
//
// tools/run2.mjs は設計時の見積りで、素材の危険度上昇を「ダメージ倍率」で代理していた。
// こちらは実装した progression / hp / stage（素材配置つき）をそのまま使う。
//
// 使い方: node tools/balance.mjs
import { pathToFileURL } from 'node:url';
import { generateMaze } from '../src/maze/generator.js';
import { createStage, createActor, goalCenter } from '../src/world/stage.js';
import { getCharacter } from '../src/world/characters.js';
import { stepPhysics } from '../src/physics/integrator.js';
import { difficultyAt, stageTimeLimitSec } from '../src/game/progression.js';
import { createHp } from '../src/game/hp.js';
import { createRun } from '../src/game/run.js';
import { BASE, TUNING } from '../src/config/gameConfig.js';
import { RECOVERY } from '../src/config/gameConfig.js';
import { challengeDifficulty } from '../src/game/challenge.js';

/**
 * 1面を自動操縦で通す。
 * urgency = 間に合うペースに対する走り方の余裕（1.0=ぴったり、1.3=3割速く）
 */
export function playStage(seed, stageIndex, urgency, level = null) {
  const d = level ? challengeDifficulty(stageIndex, level) : difficultyAt(stageIndex);
  const maze = generateMaze(BASE.mazeSize, seed);
  const stage = createStage(maze, d);
  const actor = createActor(maze, getCharacter('default'));
  const path = maze.path.map((c) => ({ x: c.x + 0.5, y: c.y + 0.5 }));
  const goal = goalCenter(maze);
  const limitSec = stageTimeLimitSec(maze, d);
  const hp = createHp({ turns: maze.turns, ...d });

  let wp = 1;
  let t = 0;
  const dt = 1 / 120;
  const onImpact = (speed, wall) => hp.applyImpact(speed, wall, t);

  for (let i = 0; i < (limitSec + 1) / dt; i++) {
    t = i * dt;
    if (hp.isDead) return { result: 'dead', sec: t, hp, maze, limitSec };
    if (t > limitSec) return { result: 'timeout', sec: t, hp, maze, limitSec };

    const tg = path[Math.min(wp, path.length - 1)];
    const dx = tg.x - actor.x, dy = tg.y - actor.y, d2 = Math.hypot(dx, dy);
    if (d2 < 0.22 && wp < path.length - 1) wp++;

    const remainCells = (path.length - wp) + d2;
    const remainSec = Math.max(0.3, limitSec - t);
    const desired = Math.max(1.2, Math.min(8, (remainCells / remainSec) * urgency));

    const ux = d2 > 1e-6 ? dx / d2 : 0, uy = d2 > 1e-6 ? dy / d2 : 0;
    let tx = ux * desired - actor.vx, ty = uy * desired - actor.vy;
    const m = Math.hypot(tx, ty);
    if (m > 1) { tx /= m; ty /= m; }
    stepPhysics({ actor, stage, tilt: { x: tx, y: ty }, base: BASE, dt, onImpact });
    const item = stage.recovery;
    if (!hp.isDead && item && !item.collected && hp.value < hp.max
      && Math.hypot(actor.x - item.x, actor.y - item.y) < actor.r + RECOVERY.radius) {
      if (hp.heal(hp.max * RECOVERY.healRatio) > 0) item.collected = true;
    }

    if (Math.hypot(actor.x - goal.x, actor.y - goal.y) < TUNING.goalRadius)
      return { result: 'clear', sec: t, hp, maze, limitSec };
  }
  return { result: 'timeout', sec: limitSec, hp, maze, limitSec };
}

/** 1ラン通して、クリアできた面数と終了理由を返す */
export function playRun(runSeed, urgency, maxStage = 80) {
  const run = createRun(runSeed);
  for (let n = 1; n <= maxStage; n++) {
    const r = playStage(run.currentSeed(), n, urgency);
    if (r.result !== 'clear') {
      run.failStage(r.result);
      return { stages: run.clearedStages, cause: r.result };
    }
    run.clearStage({ timeMs: r.sec * 1000, noDamage: !r.hp.tookDamage });
  }
  return { stages: run.clearedStages, cause: 'cap' };
}

const stat = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return {
    min: s[0], p25: s[Math.floor(s.length * 0.25)], med: s[Math.floor(s.length / 2)],
    p75: s[Math.floor(s.length * 0.75)], p95: s[Math.floor(s.length * 0.95)], max: s[s.length - 1],
  };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log('到達面数（本実装・素材配置あり）／ラン100回、コンティニューなし\n');
  for (const urgency of [1.0, 1.15, 1.3]) {
    const runs = [], causes = { dead: 0, timeout: 0, cap: 0 };
    for (let s = 1; s <= 100; s++) {
      const r = playRun(s, urgency);
      runs.push(r.stages);
      causes[r.cause]++;
    }
    console.log(`urgency ${urgency.toFixed(2)}: ${JSON.stringify(stat(runs))}` +
      `  終了理由 HP0:${causes.dead} 時間切れ:${causes.timeout} 上限:${causes.cap}`);
  }
}
