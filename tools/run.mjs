// ランの長さ（到達面数）の見積り。難易度カーブの係数を決めるための検証。
// 素材の危険度上昇は「ダメージ倍率」で代理し、HP係数の低下も反映する。
//
// 使い方: node tools/run.mjs
import { generateMaze } from '../src/maze/generator.js';
import { createStage, createActor, goalCenter } from '../src/world/stage.js';
import { getCharacter } from '../src/world/characters.js';
import { stepPhysics } from '../src/physics/integrator.js';
import { BASE, TUNING } from '../src/config/gameConfig.js';

function solve(m) {
  const { size, cells, start, goal } = m;
  const f = new Array(size * size).fill(-1);
  const si = start.y * size + start.x;
  const gi = goal.y * size + goal.x;
  const seen = new Array(size * size).fill(false);
  seen[si] = true;
  const q = [si];
  while (q.length) {
    const c0 = q.shift();
    if (c0 === gi) break;
    const cx = c0 % size, cy = (c0 - cx) / size, c = cells[c0];
    for (const s of [
      { o: !c.t, nx: cx, ny: cy - 1 }, { o: !c.r, nx: cx + 1, ny: cy },
      { o: !c.b, nx: cx, ny: cy + 1 }, { o: !c.l, nx: cx - 1, ny: cy },
    ]) {
      if (!s.o || s.nx < 0 || s.ny < 0 || s.nx >= size || s.ny >= size) continue;
      const ni = s.ny * size + s.nx;
      if (seen[ni]) continue;
      seen[ni] = true; f[ni] = c0; q.push(ni);
    }
  }
  const p = [];
  for (let i = gi; i !== -1; i = f[i]) p.push({ x: i % size, y: Math.floor(i / size) });
  return p.reverse();
}

function turns(p) {
  let t = 0;
  for (let i = 2; i < p.length; i++) {
    const a = { x: p[i-1].x - p[i-2].x, y: p[i-1].y - p[i-2].y };
    const b = { x: p[i].x - p[i-1].x, y: p[i].y - p[i-1].y };
    if (a.x !== b.x || a.y !== b.y) t++;
  }
  return t;
}

/** ラン全体を1つのシードから導出する（ランごと再現でき、他人と同じランを競える） */
const deriveSeed = (runSeed, n) => ((runSeed * 2654435761 + n * 40503) % 1000003) >>> 0;

const T = 1.2, SCALE = 10, CAP = 0.35, COOL = 0.25;

function playStage(seed, desired, dmgMult, hpPerTurn) {
  const maze = generateMaze(BASE.mazeSize, seed);
  const stage = createStage(maze);
  const actor = createActor(maze, getCharacter('default'));
  const path = solve(maze).map(c => ({ x: c.x + 0.5, y: c.y + 0.5 }));
  const goal = goalCenter(maze);
  const tn = turns(solve(maze));
  const hp0 = 40 + hpPerTurn * tn;
  let hp = hp0, wp = 1, t = 0, lastDmg = -99;
  const cap = hp0 * CAP;
  const onImpact = (sp) => {
    if (sp <= T) return;
    if (t - lastDmg < COOL) return;
    hp -= Math.min(cap, SCALE * dmgMult * (sp - T) ** 2);
    lastDmg = t;
  };
  const dt = 1 / 120;
  for (let i = 0; i < 45 / dt; i++) {
    t = i * dt;
    if (hp <= 0) return { cleared: false, sec: t };
    const tg = path[Math.min(wp, path.length - 1)];
    const dx = tg.x - actor.x, dy = tg.y - actor.y, d = Math.hypot(dx, dy);
    if (d < 0.22 && wp < path.length - 1) wp++;
    const ux = d > 1e-6 ? dx / d : 0, uy = d > 1e-6 ? dy / d : 0;
    let tx = ux * desired - actor.vx, ty = uy * desired - actor.vy;
    const m = Math.hypot(tx, ty);
    if (m > 1) { tx /= m; ty /= m; }
    stepPhysics({ actor, stage, tilt: { x: tx, y: ty }, base: BASE, dt, onImpact });
    if (Math.hypot(actor.x - goal.x, actor.y - goal.y) < TUNING.goalRadius) return { cleared: true, sec: t };
  }
  return { cleared: false, sec: 45, timeout: true };
}

function playRun(runSeed, desired, curve, maxStage = 80) {
  for (let n = 1; n <= maxStage; n++) {
    const r = playStage(deriveSeed(runSeed, n), desired, curve.dmg(n), curve.hp(n));
    if (!r.cleared) return n - 1; // クリアできた面数
  }
  return maxStage;
}

const stat = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return {
    min: s[0], p25: s[Math.floor(s.length * 0.25)], med: s[Math.floor(s.length / 2)],
    p75: s[Math.floor(s.length * 0.75)], p95: s[Math.floor(s.length * 0.95)], max: s[s.length - 1],
    avg: +(a.reduce((p, c) => p + c, 0) / a.length).toFixed(1),
  };
};

const curves = {
  '緩  dmg +4%/面, HP係数 -0.06/面': { dmg: (n) => Math.min(2.0, 1 + 0.04 * (n - 1)), hp: (n) => Math.max(3.0, 4 - 0.06 * (n - 1)) },
  '中  dmg +6%/面, HP係数 -0.08/面': { dmg: (n) => Math.min(2.2, 1 + 0.06 * (n - 1)), hp: (n) => Math.max(3.0, 4 - 0.08 * (n - 1)) },
  '急  dmg +9%/面, HP係数 -0.12/面': { dmg: (n) => Math.min(2.5, 1 + 0.09 * (n - 1)), hp: (n) => Math.max(2.8, 4 - 0.12 * (n - 1)) },
};

console.log('到達面数（クリアできた面数）／ラン100回、コンティニューなし\n');
for (const [name, curve] of Object.entries(curves)) {
  console.log(name);
  for (const desired of [4.0, 4.5, 4.8, 5.0]) {
    const runs = [];
    for (let s = 1; s <= 100; s++) runs.push(playRun(s, desired, curve));
    console.log(`  目標${desired.toFixed(1)}: ${JSON.stringify(stat(runs))}`);
  }
  console.log('');
}
