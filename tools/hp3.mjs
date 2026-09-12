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

function play(seed, desired, cfg) {
  const maze = generateMaze(BASE.mazeSize, seed);
  const stage = createStage(maze);
  const actor = createActor(maze, getCharacter('default'));
  const path = solve(maze).map(c=>({x:c.x+0.5,y:c.y+0.5}));
  const goal = goalCenter(maze);
  const tn = turns(solve(maze));
  const hp0 = cfg.hpBase + cfg.hpPerTurn * tn;
  let hp = hp0, wp = 1, t = 0, lastDmg = -99, worst = 0;
  const cap = cfg.capRatio ? hp0 * cfg.capRatio : Infinity;
  const onImpact = (sp) => {
    if (sp <= cfg.T) return;
    if (t - lastDmg < cfg.cooldown) return;
    const d = Math.min(cap, cfg.scale * (sp - cfg.T) ** cfg.exp);
    hp -= d; lastDmg = t; worst = Math.max(worst, d);
  };
  const dt = 1/120;
  for (let i = 0; i < 60/dt; i++) {
    t = i*dt;
    if (hp <= 0) return { dead:true, turns:tn, hp0, left:0, worst };
    const tg = path[Math.min(wp,path.length-1)];
    const dx=tg.x-actor.x, dy=tg.y-actor.y, d=Math.hypot(dx,dy);
    if (d<0.22 && wp<path.length-1) wp++;
    const ux=d>1e-6?dx/d:0, uy=d>1e-6?dy/d:0;
    let tx=ux*desired-actor.vx, ty=uy*desired-actor.vy;
    const m=Math.hypot(tx,ty); if(m>1){tx/=m;ty/=m;}
    stepPhysics({ actor, stage, tilt:{x:tx,y:ty}, base:BASE, dt, onImpact });
    if (Math.hypot(actor.x-goal.x,actor.y-goal.y) < TUNING.goalRadius)
      return { dead:false, turns:tn, hp0, left:Math.max(0,hp), worst };
  }
  return { dead:false, turns:tn, hp0, left:Math.max(0,hp), worst };
}

const cands = [
  { name:'F 10×(v-1.2)² 上限35% HP40+4t', T:1.2, scale:10, exp:2, capRatio:0.35, hpBase:40, hpPerTurn:4, cooldown:0.25 },
  { name:'G  8×(v-1.2)² 上限35% HP40+4t', T:1.2, scale:8,  exp:2, capRatio:0.35, hpBase:40, hpPerTurn:4, cooldown:0.25 },
  { name:'H 10×(v-1.2)² 上限35% HP50+3t', T:1.2, scale:10, exp:2, capRatio:0.35, hpBase:50, hpPerTurn:3, cooldown:0.25 },
  { name:'I  8×(v-1.2)² 上限35% HP50+3t', T:1.2, scale:8,  exp:2, capRatio:0.35, hpBase:50, hpPerTurn:3, cooldown:0.25 },
  { name:'J  7×(v-1.1)² 上限35% HP45+3t', T:1.1, scale:7,  exp:2, capRatio:0.35, hpBase:45, hpPerTurn:3, cooldown:0.25 },
];

for (const cfg of cands) {
  const line = [];
  for (const d of [3.5, 4.5, 4.8, 5.0, 5.2, 5.5]) {
    const rs = []; for (let s=1;s<=200;s++) rs.push(play(s, d, cfg));
    line.push(`${d.toFixed(1)}:${(rs.filter(r=>!r.dead).length/rs.length*100).toFixed(0).padStart(3)}%`);
  }
  // 難易度勾配（折れ回数別、目標5.0）と全力衝突1発の割合
  const rs5 = []; for (let s=1;s<=200;s++) rs5.push(play(s, 5.0, cfg));
  const b=(lo,hi)=>{const g=rs5.filter(r=>r.turns>=lo&&r.turns<=hi);return g.length?`${(g.filter(r=>!r.dead).length/g.length*100).toFixed(0)}%`:'—';};
  const slam = cfg.capRatio ? Math.min(cfg.capRatio*100, cfg.scale*(5.38-cfg.T)**cfg.exp/1.0) : cfg.scale*(5.38-cfg.T)**cfg.exp;
  const slamPct = cfg.capRatio ? (cfg.capRatio*100).toFixed(0) : (cfg.scale*(5.38-cfg.T)**cfg.exp).toFixed(0);
  console.log(`${cfg.name.padEnd(28)} 生存率 ${line.join('  ')}`);
  console.log(`${''.padEnd(28)} 目標5.0の勾配 少:${b(0,10)} 中:${b(11,19)} 多:${b(20,99)}` +
              `   全力衝突1発 = 初期HPの ${slamPct}%\n`);
}
