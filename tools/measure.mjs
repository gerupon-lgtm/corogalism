import { generateMaze } from './src/maze/generator.js';
import { createStage, createActor, goalCenter } from './src/world/stage.js';
import { getCharacter } from './src/world/characters.js';
import { stepPhysics } from './src/physics/integrator.js';
import { BASE, TUNING } from './src/config/gameConfig.js';

function solve(maze) {
  const { size, cells, start, goal } = maze;
  const from = new Array(size * size).fill(-1);
  const si = start.y * size + start.x, gi = goal.y * size + goal.x;
  const seen = new Array(size * size).fill(false); seen[si] = true;
  const q = [si];
  while (q.length) {
    const cur = q.shift(); if (cur === gi) break;
    const cx = cur % size, cy = (cur - cx) / size, c = cells[cur];
    for (const s of [{o:!c.t,nx:cx,ny:cy-1},{o:!c.r,nx:cx+1,ny:cy},{o:!c.b,nx:cx,ny:cy+1},{o:!c.l,nx:cx-1,ny:cy}]) {
      if (!s.o || s.nx<0||s.ny<0||s.nx>=size||s.ny>=size) continue;
      const ni = s.ny*size+s.nx; if (seen[ni]) continue;
      seen[ni]=true; from[ni]=cur; q.push(ni);
    }
  }
  const cellsPath = [];
  for (let i = gi; i !== -1; i = from[i]) cellsPath.push({ x: i % size, y: Math.floor(i / size) });
  return cellsPath.reverse();
}

function turns(path) {
  let t = 0;
  for (let i = 2; i < path.length; i++) {
    const d1 = { x: path[i-1].x - path[i-2].x, y: path[i-1].y - path[i-2].y };
    const d2 = { x: path[i].x - path[i-1].x, y: path[i].y - path[i-1].y };
    if (d1.x !== d2.x || d1.y !== d2.y) t++;
  }
  return t;
}

function autoplay(maze, stage, desired = 2.5) {
  const actor = createActor(maze, getCharacter('default'));
  const path = solve(maze).map(c => ({ x: c.x + 0.5, y: c.y + 0.5 }));
  const goal = goalCenter(maze);
  let wp = 1, hits = 0, peak = 0;
  const impacts = [];
  const onImpact = (sp) => { if (sp > 0.3) impacts.push(sp); };
  const dt = 1/120;
  for (let i = 0; i < 60/dt; i++) {
    const t = path[Math.min(wp, path.length-1)];
    const dx = t.x - actor.x, dy = t.y - actor.y, d = Math.hypot(dx,dy);
    if (d < 0.22 && wp < path.length-1) wp++;
    const ux = d>1e-6?dx/d:0, uy = d>1e-6?dy/d:0;
    let tx = ux*desired - actor.vx, ty = uy*desired - actor.vy;
    const m = Math.hypot(tx,ty); if (m>1) { tx/=m; ty/=m; }
    const before = Math.hypot(actor.vx, actor.vy);
    const r = stepPhysics({ actor, stage, tilt:{x:tx,y:ty}, base:BASE, dt, onImpact });
    hits += r.wallHits;
    peak = Math.max(peak, before);
    if (Math.hypot(actor.x-goal.x, actor.y-goal.y) < TUNING.goalRadius) return { sec: i*dt, hits, peak, impacts };
  }
  return { sec: 60, hits, peak, impacts };
}

const N = BASE.mazeSize;
const rows = [];
for (let seed = 1; seed <= 400; seed++) {
  const maze = generateMaze(N, seed);
  const path = solve(maze);
  rows.push({ seed, len: path.length, turns: turns(path) });
}
const stat = (a) => {
  const s = [...a].sort((x,y)=>x-y);
  return { min: s[0], p25: s[Math.floor(s.length*0.25)], med: s[Math.floor(s.length/2)],
           p75: s[Math.floor(s.length*0.75)], max: s[s.length-1],
           avg: +(a.reduce((p,c)=>p+c,0)/a.length).toFixed(2) };
};
console.log(`=== ${N}×${N} 迷路 400シード ===`);
console.log('経路長（マス）:', JSON.stringify(stat(rows.map(r=>r.len))));
console.log('折れ回数      :', JSON.stringify(stat(rows.map(r=>r.turns))));

// 折れ回数の分布
const hist = {};
for (const r of rows) hist[r.turns] = (hist[r.turns]||0)+1;
console.log('折れ回数の分布:', Object.keys(hist).sort((a,b)=>a-b).map(k=>`${k}回:${hist[k]}`).join('  '));

// 折れ回数と実プレイの難しさの相関（自動操縦100シード）
const sample = [];
for (let seed = 1; seed <= 100; seed++) {
  const maze = generateMaze(N, seed);
  const stage = createStage(maze);
  const path = solve(maze);
  const r = autoplay(maze, stage);
  sample.push({ turns: turns(path), len: path.length, sec: r.sec, hits: r.hits, peak: r.peak });
}
const corr = (a,b) => {
  const ma=a.reduce((p,c)=>p+c,0)/a.length, mb=b.reduce((p,c)=>p+c,0)/b.length;
  let n=0,da=0,db=0;
  for (let i=0;i<a.length;i++){ n+=(a[i]-ma)*(b[i]-mb); da+=(a[i]-ma)**2; db+=(b[i]-mb)**2; }
  return +(n/Math.sqrt(da*db)).toFixed(3);
};
console.log('\n=== 自動操縦100シード ===');
console.log('クリア秒 :', JSON.stringify(stat(sample.map(s=>s.sec))));
console.log('壁ヒット :', JSON.stringify(stat(sample.map(s=>s.hits))));
console.log('最高速度 :', JSON.stringify(stat(sample.map(s=>+s.peak.toFixed(2)))), 'マス/s');
console.log('\n相関（折れ回数 vs）: クリア秒', corr(sample.map(s=>s.turns), sample.map(s=>s.sec)),
            '/ 壁ヒット', corr(sample.map(s=>s.turns), sample.map(s=>s.hits)));
console.log('相関（経路長 vs）  : クリア秒', corr(sample.map(s=>s.len), sample.map(s=>s.sec)),
            '/ 壁ヒット', corr(sample.map(s=>s.len), sample.map(s=>s.hits)));

// --- 折れ回数は経路長と独立した情報を持つか ---
console.log('\n=== 折れ回数は経路長の代理ではないか ===');
console.log('相関（折れ回数 vs 経路長）:', corr(rows.map(r=>r.turns), rows.map(r=>r.len)));
const dens = rows.map(r => +(r.turns / r.len).toFixed(3));
console.log('折れ密度（折れ÷経路長）  :', JSON.stringify(stat(dens)));

// --- 荒い操縦で衝突速度の分布を取る（人間のプレイに近い条件） ---
console.log('\n=== 荒い操縦（目標速度5.0）60シード — 衝突の実態 ===');
const rough = [];
for (let seed = 1; seed <= 60; seed++) {
  const maze = generateMaze(N, seed);
  const stage = createStage(maze);
  const r = autoplay(maze, stage, 5.0);
  rough.push({ turns: turns(solve(maze)), len: solve(maze).length, ...r });
}
const allImpacts = rough.flatMap(r => r.impacts);
console.log('1面あたりの衝突回数:', JSON.stringify(stat(rough.map(r=>r.impacts.length))));
console.log('衝突速度（マス/s）  :', JSON.stringify(stat(allImpacts.map(v=>+v.toFixed(2)))));
const strong = allImpacts.filter(v=>v>2).length;
console.log(`  うち2マス/s超: ${strong} / ${allImpacts.length} (${(strong/allImpacts.length*100).toFixed(1)}%)`);
console.log('クリア秒            :', JSON.stringify(stat(rough.map(r=>r.sec))));
console.log('相関（折れ回数 vs 衝突回数）:', corr(rough.map(r=>r.turns), rough.map(r=>r.impacts.length)));
console.log('相関（経路長   vs 衝突回数）:', corr(rough.map(r=>r.len), rough.map(r=>r.impacts.length)));
