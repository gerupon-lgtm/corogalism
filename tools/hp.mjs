import { generateMaze } from './src/maze/generator.js';
import { createStage, createActor, goalCenter } from './src/world/stage.js';
import { getCharacter } from './src/world/characters.js';
import { stepPhysics } from './src/physics/integrator.js';
import { BASE, TUNING } from './src/config/gameConfig.js';

function solve(maze) {
  const { size, cells, start, goal } = maze;
  const from = new Array(size*size).fill(-1), si = start.y*size+start.x, gi = goal.y*size+goal.x;
  const seen = new Array(size*size).fill(false); seen[si]=true; const q=[si];
  while (q.length) { const cur=q.shift(); if (cur===gi) break;
    const cx=cur%size, cy=(cur-cx)/size, c=cells[cur];
    for (const s of [{o:!c.t,nx:cx,ny:cy-1},{o:!c.r,nx:cx+1,ny:cy},{o:!c.b,nx:cx,ny:cy+1},{o:!c.l,nx:cx-1,ny:cy}]) {
      if (!s.o||s.nx<0||s.ny<0||s.nx>=size||s.ny>=size) continue;
      const ni=s.ny*size+s.nx; if (seen[ni]) continue; seen[ni]=true; from[ni]=cur; q.push(ni); } }
  const p=[]; for (let i=gi;i!==-1;i=from[i]) p.push({x:i%size,y:Math.floor(i/size)}); return p.reverse();
}
function turns(p){ let t=0; for(let i=2;i<p.length;i++){
  const a={x:p[i-1].x-p[i-2].x,y:p[i-1].y-p[i-2].y}, b={x:p[i].x-p[i-1].x,y:p[i].y-p[i-1].y};
  if(a.x!==b.x||a.y!==b.y) t++; } return t; }

const T = 1.2;        // ダメージ閾値（マス/s）
const COOLDOWN = 0.30; // 無敵時間（秒）

function run(seed, desired) {
  const maze = generateMaze(BASE.mazeSize, seed);
  const stage = createStage(maze);
  const actor = createActor(maze, getCharacter('default'));
  const path = solve(maze).map(c=>({x:c.x+0.5,y:c.y+0.5}));
  const goal = goalCenter(maze);
  let wp=1, t=0, lastDamageAt=-99;
  const dt=1/120;
  const raw=[], counted=[], intervals=[]; let lastImpactAt=null;
  let dmgNoCooldown=0, dmgWithCooldown=0;

  const onImpact = (sp) => {
    if (lastImpactAt !== null) intervals.push(t - lastImpactAt);
    lastImpactAt = t;
    raw.push(sp);
    const d = sp > T ? (sp - T) ** 2 : 0;
    dmgNoCooldown += d;
    if (d > 0 && t - lastDamageAt >= COOLDOWN) { dmgWithCooldown += d; lastDamageAt = t; counted.push(sp); }
  };

  for (let i=0;i<60/dt;i++) {
    t = i*dt;
    const tg = path[Math.min(wp,path.length-1)];
    const dx=tg.x-actor.x, dy=tg.y-actor.y, d=Math.hypot(dx,dy);
    if (d<0.22 && wp<path.length-1) wp++;
    const ux=d>1e-6?dx/d:0, uy=d>1e-6?dy/d:0;
    let tx=ux*desired-actor.vx, ty=uy*desired-actor.vy;
    const m=Math.hypot(tx,ty); if(m>1){tx/=m;ty/=m;}
    stepPhysics({ actor, stage, tilt:{x:tx,y:ty}, base:BASE, dt, onImpact });
    if (Math.hypot(actor.x-goal.x,actor.y-goal.y) < TUNING.goalRadius)
      return { sec:t, turns:turns(solve(maze)), raw, counted, intervals, dmgNoCooldown, dmgWithCooldown };
  }
  return { sec:60, turns:turns(solve(maze)), raw, counted, intervals, dmgNoCooldown, dmgWithCooldown, timeout:true };
}

const stat=(a)=>{ if(!a.length) return {n:0}; const s=[...a].sort((x,y)=>x-y);
  return { min:+s[0].toFixed(2), med:+s[Math.floor(s.length/2)].toFixed(2),
           p90:+s[Math.floor(s.length*0.9)].toFixed(2), max:+s[s.length-1].toFixed(2),
           avg:+(a.reduce((p,c)=>p+c,0)/a.length).toFixed(2) }; };

console.log(`閾値 T=${T} マス/s、無敵時間 ${COOLDOWN*1000}ms、ダメージ = (v-T)^2\n`);

// 1) 閾値だけで反発の連打がどれだけ落ちるか
const probe = [];
for (let s=1;s<=60;s++) probe.push(run(s, 5.0));
const allRaw = probe.flatMap(p=>p.raw);
const overT  = allRaw.filter(v=>v>T);
const allInt = probe.flatMap(p=>p.intervals).filter(v=>v<0.5);
console.log('=== 閾値の効果（荒い操縦・目標5.0、60シード） ===');
console.log(`全接触 ${allRaw.length} 回 → 閾値超え ${overT.length} 回 (${(overT.length/allRaw.length*100).toFixed(0)}%)`);
console.log('接触速度         :', JSON.stringify(stat(allRaw)));
console.log('閾値を超えた速度 :', JSON.stringify(stat(overT)));
console.log(`0.5秒以内の再接触: ${allInt.length} 回（反発による連打の候補）`, JSON.stringify(stat(allInt)));
const counted = probe.flatMap(p=>p.counted);
console.log(`無敵時間でさらに ${overT.length - counted.length} 回を無効化 → 実際にダメージになるのは ${counted.length} 回`);

// 2) 操縦の荒さ別に、1面の累計ダメージと折れ回数
console.log('\n=== 操縦の荒さ別・1面の累計ダメージ（60シード） ===');
console.log('目標速度 | 累計ダメージ(無敵あり)               | ダメージ回数 | クリア秒');
for (const desired of [2.5, 3.5, 5.0, 6.5]) {
  const rs = []; for (let s=1;s<=60;s++) rs.push(run(s, desired));
  const dm = rs.map(r=>+r.dmgWithCooldown.toFixed(2));
  const cn = rs.map(r=>r.counted.length);
  console.log(`  ${desired.toFixed(1)}   | ${JSON.stringify(stat(dm))} | ${JSON.stringify(stat(cn))} | ${stat(rs.map(r=>r.sec)).med}`);
}

// 3) 折れ回数とダメージの関係（1折れあたりの平均ダメージ）
console.log('\n=== 折れ回数 1回あたりの平均ダメージ ===');
for (const desired of [3.5, 5.0, 6.5]) {
  const rs = []; for (let s=1;s<=60;s++) rs.push(run(s, desired));
  const per = rs.map(r=>r.dmgWithCooldown / Math.max(1,r.turns));
  console.log(`  目標${desired.toFixed(1)}: ${JSON.stringify(stat(per))}`);
}
