import { generateMaze } from './src/maze/generator.js';
import { createStage, createActor, goalCenter } from './src/world/stage.js';
import { getCharacter } from './src/world/characters.js';
import { stepPhysics } from './src/physics/integrator.js';
import { BASE, TUNING } from './src/config/gameConfig.js';

function solve(m){const{size,cells,start,goal}=m;const f=new Array(size*size).fill(-1),si=start.y*size+start.x,gi=goal.y*size+goal.x;
 const seen=new Array(size*size).fill(false);seen[si]=true;const q=[si];
 while(q.length){const c0=q.shift();if(c0===gi)break;const cx=c0%size,cy=(c0-cx)/size,c=cells[c0];
  for(const s of [{o:!c.t,nx:cx,ny:cy-1},{o:!c.r,nx:cx+1,ny:cy},{o:!c.b,nx:cx,ny:cy+1},{o:!c.l,nx:cx-1,ny:cy}]){
   if(!s.o||s.nx<0||s.ny<0||s.nx>=size||s.ny>=size)continue;const ni=s.ny*size+s.nx;if(seen[ni])continue;seen[ni]=true;f[ni]=c0;q.push(ni);}}
 const p=[];for(let i=gi;i!==-1;i=f[i])p.push({x:i%size,y:Math.floor(i/size)});return p.reverse();}
function turns(p){let t=0;for(let i=2;i<p.length;i++){const a={x:p[i-1].x-p[i-2].x,y:p[i-1].y-p[i-2].y},b={x:p[i].x-p[i-1].x,y:p[i].y-p[i-1].y};if(a.x!==b.x||a.y!==b.y)t++;}return t;}

const T = 1.2, SCALE = 10, COOLDOWN = 0.25;
const dmgOf = (v) => v > T ? SCALE * (v - T) ** 2 : 0;
const hpOf  = (t) => 40 + 4 * t;

// ---- A) 壁に押し付け続けたときの微小接触（本当の連打リスク） ----
{
  const maze = generateMaze(7, 1);
  const stage = createStage(maze);
  const actor = createActor(maze, getCharacter('default'));
  const speeds = [];
  const onImpact = (sp) => speeds.push(sp);
  // 左上から右へ全力で押し付け続ける（3秒）
  for (let i = 0; i < 3 * 120; i++) stepPhysics({ actor, stage, tilt:{x:1,y:0}, base:BASE, dt:1/120, onImpact });
  const st=(a)=>{const s=[...a].sort((x,y)=>x-y);return {n:a.length,min:+s[0].toFixed(3),med:+s[Math.floor(s.length/2)].toFixed(3),max:+s[s.length-1].toFixed(3)};};
  const over = speeds.filter(v=>v>T);
  console.log('=== 壁に3秒押し付け続けたとき ===');
  console.log('接触通知:', JSON.stringify(st(speeds)));
  console.log(`閾値(${T})を超えたもの: ${over.length} 回 / ${speeds.length} 回`);
  console.log(`→ 閾値なしなら ${speeds.length} 回ダメージ。閾値ありなら ${over.length} 回。`);
  console.log(`   累計ダメージ: 閾値なし(線形) ${speeds.reduce((p,c)=>p+c*SCALE,0).toFixed(0)} / 閾値あり ${over.reduce((p,c)=>p+dmgOf(c),0).toFixed(1)}\n`);
}

// ---- B) HP = 40 + 4×折れ回数 の検証 ----
function play(seed, desired) {
  const maze = generateMaze(BASE.mazeSize, seed);
  const stage = createStage(maze);
  const actor = createActor(maze, getCharacter('default'));
  const path = solve(maze).map(c=>({x:c.x+0.5,y:c.y+0.5}));
  const goal = goalCenter(maze);
  const tn = turns(solve(maze));
  let hp = hpOf(tn), wp = 1, t = 0, lastDmg = -99;
  const onImpact = (sp) => {
    const d = dmgOf(sp);
    if (d > 0 && t - lastDmg >= COOLDOWN) { hp -= d; lastDmg = t; }
  };
  const dt = 1/120;
  for (let i = 0; i < 60/dt; i++) {
    t = i*dt;
    if (hp <= 0) return { dead:true, turns:tn, hp0:hpOf(tn), left:0, sec:t };
    const tg = path[Math.min(wp,path.length-1)];
    const dx=tg.x-actor.x, dy=tg.y-actor.y, d=Math.hypot(dx,dy);
    if (d<0.22 && wp<path.length-1) wp++;
    const ux=d>1e-6?dx/d:0, uy=d>1e-6?dy/d:0;
    let tx=ux*desired-actor.vx, ty=uy*desired-actor.vy;
    const m=Math.hypot(tx,ty); if(m>1){tx/=m;ty/=m;}
    stepPhysics({ actor, stage, tilt:{x:tx,y:ty}, base:BASE, dt, onImpact });
    if (Math.hypot(actor.x-goal.x,actor.y-goal.y) < TUNING.goalRadius)
      return { dead:false, turns:tn, hp0:hpOf(tn), left:Math.max(0,hp), sec:t };
  }
  return { dead:false, timeout:true, turns:tn, hp0:hpOf(tn), left:Math.max(0,hp), sec:60 };
}

console.log('=== HP = 40 + 4×折れ回数、ダメージ = 10×(v-1.2)²、無敵0.25秒 ===');
console.log('操縦の荒さ | 生存率 | 残HPの割合(中央値) | 折れ回数別の生存率');
for (const desired of [2.5, 3.5, 4.5, 5.0, 5.5, 6.5]) {
  const rs = []; for (let s=1;s<=200;s++) rs.push(play(s, desired));
  const alive = rs.filter(r=>!r.dead);
  const ratio = alive.map(r=>r.left/r.hp0).sort((a,b)=>a-b);
  const bucket = (lo,hi) => { const g=rs.filter(r=>r.turns>=lo&&r.turns<=hi);
    return g.length? `${(g.filter(r=>!r.dead).length/g.length*100).toFixed(0)}%` : '—'; };
  console.log(`   ${desired.toFixed(1)}     | ${(alive.length/rs.length*100).toFixed(0).padStart(3)}%  |` +
    ` ${(ratio.length?ratio[Math.floor(ratio.length/2)]*100:0).toFixed(0).padStart(3)}%             |` +
    ` 少(〜10):${bucket(0,10)}  中(11〜19):${bucket(11,19)}  多(20〜):${bucket(20,99)}`);
}
