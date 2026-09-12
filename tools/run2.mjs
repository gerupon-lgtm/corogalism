// ランの長さ（到達面数）の見積り・第2版。
//
// 第1版（tools/run.mjs）の問題: 自動操縦の目標速度が固定だったため、
// 4.5以下では壁に一度も触れず「永遠に終わらない」、4.8を超えると即死、という二値になった。
// HPだけでは丁寧なプレイヤーに終わりが来ないことが分かった。
//
// 第2版は「制限時間」を入れ、自動操縦が**間に合うペースを自分で選ぶ**ようにする。
//   制限時間 = 経路長 × 1マスあたりの秒数(面数)
// 面が進むと1マスあたりの秒数が削られ、速く走らざるを得なくなり、
// 速く走ると壁に当たり、HPが減る。これが「丁寧に走っても避けられない圧力」。
//
// 使い方: node tools/run2.mjs
import { generateMaze } from '../src/maze/generator.js';
import { createStage, createActor, goalCenter } from '../src/world/stage.js';
import { getCharacter } from '../src/world/characters.js';
import { stepPhysics } from '../src/physics/integrator.js';
import { BASE, TUNING } from '../src/config/gameConfig.js';

function solve(m) {
  const { size, cells, start, goal } = m;
  const f = new Array(size * size).fill(-1);
  const si = start.y * size + start.x, gi = goal.y * size + goal.x;
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
const deriveSeed = (runSeed, n) => ((runSeed * 2654435761 + n * 40503) % 1000003) >>> 0;

const T = 1.2, SCALE = 10, CAP = 0.35, COOL = 0.25;

/**
 * urgency: プレイヤーの性格。1.0 = 間に合うペースぴったりで走る、
 *          1.2 = 2割速く走る（余裕を持ちたがる＝雑になりやすい）
 */
function playStage(seed, urgency, secPerCell, dmgMult, hpPerTurn) {
  const maze = generateMaze(BASE.mazeSize, seed);
  const stage = createStage(maze);
  const actor = createActor(maze, getCharacter('default'));
  const cellsPath = solve(maze);
  const path = cellsPath.map(c => ({ x: c.x + 0.5, y: c.y + 0.5 }));
  const goal = goalCenter(maze);
  const tn = turns(cellsPath);
  const limitSec = cellsPath.length * secPerCell;
  const hp0 = 40 + hpPerTurn * tn;
  const cap = hp0 * CAP;

  let hp = hp0, wp = 1, t = 0, lastDmg = -99;
  const onImpact = (sp) => {
    if (sp <= T || t - lastDmg < COOL) return;
    hp -= Math.min(cap, SCALE * dmgMult * (sp - T) ** 2);
    lastDmg = t;
  };

  const dt = 1 / 120;
  for (let i = 0; i < (limitSec + 1) / dt; i++) {
    t = i * dt;
    if (hp <= 0) return { result: 'dead', sec: t };
    if (t > limitSec) return { result: 'timeout', sec: t };

    const tg = path[Math.min(wp, path.length - 1)];
    const dx = tg.x - actor.x, dy = tg.y - actor.y, d = Math.hypot(dx, dy);
    if (d < 0.22 && wp < path.length - 1) wp++;

    // 残りの経路と残り時間から、間に合うペースを自分で決める
    const remainCells = (path.length - wp) + d;
    const remainSec = Math.max(0.3, limitSec - t);
    const desired = Math.max(1.2, Math.min(8, (remainCells / remainSec) * urgency));

    const ux = d > 1e-6 ? dx / d : 0, uy = d > 1e-6 ? dy / d : 0;
    let tx = ux * desired - actor.vx, ty = uy * desired - actor.vy;
    const m = Math.hypot(tx, ty);
    if (m > 1) { tx /= m; ty /= m; }
    stepPhysics({ actor, stage, tilt: { x: tx, y: ty }, base: BASE, dt, onImpact });
    if (Math.hypot(actor.x - goal.x, actor.y - goal.y) < TUNING.goalRadius)
      return { result: 'clear', sec: t, hpLeft: hp, hp0 };
  }
  return { result: 'timeout', sec: limitSec };
}

function playRun(runSeed, urgency, curve, maxStage = 60) {
  const causes = { dead: 0, timeout: 0 };
  for (let n = 1; n <= maxStage; n++) {
    const r = playStage(deriveSeed(runSeed, n), urgency, curve.sec(n), curve.dmg(n), curve.hp(n));
    if (r.result !== 'clear') { causes[r.result]++; return { stages: n - 1, cause: r.result }; }
  }
  return { stages: maxStage, cause: 'cap' };
}

const stat = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return {
    min: s[0], p25: s[Math.floor(s.length * 0.25)], med: s[Math.floor(s.length / 2)],
    p75: s[Math.floor(s.length * 0.75)], p95: s[Math.floor(s.length * 0.95)], max: s[s.length - 1],
  };
};

// 1マスあたりの秒数: 面1で ease、面 hard で tight まで直線的に削る
const mk = (ease, tight, hard) => (n) => Math.max(tight, ease - (ease - tight) * (n - 1) / (hard - 1));

const curves = {
  '緩  0.55→0.28 (20面で底), dmg+4%/面': { sec: mk(0.55, 0.28, 20), dmg: (n) => Math.min(2.0, 1 + 0.04 * (n - 1)), hp: (n) => Math.max(3.0, 4 - 0.06 * (n - 1)) },
  '中  0.50→0.26 (15面で底), dmg+6%/面': { sec: mk(0.50, 0.26, 15), dmg: (n) => Math.min(2.2, 1 + 0.06 * (n - 1)), hp: (n) => Math.max(3.0, 4 - 0.08 * (n - 1)) },
  '急  0.45→0.24 (12面で底), dmg+9%/面': { sec: mk(0.45, 0.24, 12), dmg: (n) => Math.min(2.5, 1 + 0.09 * (n - 1)), hp: (n) => Math.max(2.8, 4 - 0.12 * (n - 1)) },
};

console.log('到達面数（クリアできた面数）／ラン100回、コンティニューなし');
console.log('urgency = 間に合うペースに対する走り方の余裕（1.0=ぴったり、1.3=3割速く走る）\n');
for (const [name, curve] of Object.entries(curves)) {
  console.log(name);
  for (const urgency of [1.0, 1.15, 1.3]) {
    const runs = [], causes = { dead: 0, timeout: 0, cap: 0 };
    for (let s = 1; s <= 100; s++) {
      const r = playRun(s, urgency, curve);
      runs.push(r.stages);
      causes[r.cause]++;
    }
    console.log(`  urgency ${urgency.toFixed(2)}: ${JSON.stringify(stat(runs))}` +
      `  終了理由 HP0:${causes.dead} 時間切れ:${causes.timeout} 上限:${causes.cap}`);
  }
  console.log('');
}
