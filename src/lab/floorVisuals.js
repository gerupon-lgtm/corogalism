import { PATCH_CELLS } from './floorModel.js';

// 物理に触れず、セル座標の描画だけを担当する。
export function drawFloorVisuals(ctx, camera, { type, settings, actor, time, reduced }) {
  ctx.save();
  ctx.scale(camera.toPx(1), camera.toPx(1));
  const circle = (x, y, r, fill) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } else ctx.stroke();
  };
  const line = points => { ctx.beginPath(); points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke(); };
  const arrow = (x, y, angle, length, color) => {
    ctx.save(); ctx.translate(x,y); ctx.rotate(angle); ctx.strokeStyle = color; ctx.lineWidth = .025;
    line([[-length/2,0],[length/2,0]]);
    line([[length/2-.07,-.055],[length/2,0],[length/2-.07,.055]]); ctx.restore();
  };
  if (type === 'ice' || type === 'sand') {
    for (const {x,y} of PATCH_CELLS) {
      ctx.save(); ctx.beginPath(); ctx.rect(x+.025,y+.025,.95,.95); ctx.clip();
      const tint = ctx.createLinearGradient(x,y,x+1,y+1);
      tint.addColorStop(0, type === 'ice' ? '#e6fbfc' : '#f6dfaa');
      tint.addColorStop(1, type === 'ice' ? '#91d0df' : '#d7b375');
      ctx.fillStyle = tint; ctx.fillRect(x,y,1,1);
      if (type === 'ice') {
        ctx.strokeStyle = '#ffffffbd'; ctx.lineWidth = .026;
        line([[x+.1,y+.02],[x+.4,y+.35],[x+.3,y+.65],[x+.58,y+.98]]);
        line([[x+.4,y+.35],[x+.72,y+.25],[x+.98,y+.42]]);
        ctx.strokeStyle = '#ffffff69'; ctx.lineWidth = .11;
        line([[x+.05,y+.7],[x+.7,y+.05]]);
        ctx.lineWidth = .025; line([[x+.25,y+.96],[x+.97,y+.24]]);
      } else {
        ctx.strokeStyle = '#a87b3d40'; ctx.lineWidth = .02;
        for (let j=0;j<4;j++) {
          ctx.beginPath(); ctx.moveTo(x,y+.15+j*.23);
          ctx.bezierCurveTo(x+.3,y+j*.23,x+.6,y+.35+j*.23,x+1,y+.18+j*.23); ctx.stroke();
        }
        for (let j=0;j<22;j++) {
          const px = ((j*37+x*17+y*13)%97)/97, py=((j*59+x*11+y*7)%89)/89;
          circle(x+px,y+py,.009+(j%3)*.003,j%2 ? '#a9874a77' : '#fff1c7');
        }
      }
      ctx.restore();
    }
    const onSand = type === 'sand' && PATCH_CELLS.some(c=>c.x===Math.floor(actor.x)&&c.y===Math.floor(actor.y));
    const speed = Math.hypot(actor.vx,actor.vy);
    if (onSand && speed > .15 && !reduced) {
      const angle=Math.atan2(actor.vy,actor.vx);
      for(let i=0;i<7;i++) {
        const age=(time/650+i/7)%1, side=Math.sin(i*13)*.12;
        const back=actor.r+.08+age*.35;
        circle(actor.x-Math.cos(angle)*back-Math.sin(angle)*side,actor.y-Math.sin(angle)*back+Math.cos(angle)*side,.025+age*.035,`rgba(172,131,64,${(1-age)*.35})`);
      }
    }
  }
  if (type === 'gravity' || type === 'repulsion') {
    const inward=type==='gravity', x=4.5, y=4.5, radius=settings.radius;
    const rgb=inward?'127,102,175':'208,122,75';
    const color=inward?'#8066a6':'#b5683f';
    const membrane=ctx.createRadialGradient(x,y,0,x,y,radius);
    membrane.addColorStop(0,`rgba(${rgb},0.04)`);
    membrane.addColorStop(.5,`rgba(${rgb},0.20)`);
    membrane.addColorStop(1,`rgba(${rgb},0.015)`);
    circle(x,y,radius,membrane);

    // 中間で最も強い物理の分布と、流れの濃さを合わせる。
    for(let i=0;i<12;i++) {
      const angle=i*Math.PI/6;
      const phase=reduced ? .52 : (time/2600+(i%3)/3)%1;
      const u=.12+.78*(inward?1-phase:phase);
      ctx.globalAlpha=.18+.65*4*u*(1-u);
      arrow(x+Math.cos(angle)*radius*u,y+Math.sin(angle)*radius*u,angle+(inward?Math.PI:0),.14,color);
    }
    ctx.globalAlpha=1;
    // 凹んだすり鉢と凸のドームを陰影・輪郭で区別する。
    circle(x,y+.035,.36,'#6a4d4430');
    circle(x,y,.35,inward?'#b5a2ce':'#dcb493');
    const disk=ctx.createRadialGradient(x-.1,y-.12,.025,x,y,.31);
    disk.addColorStop(0,inward?'#65517f':'#fff1cf');
    disk.addColorStop(.7,inward?'#aa92c9':'#e5b485');
    disk.addColorStop(1,inward?'#e0d4eb':'#a76945');
    circle(x,y,.29,disk);
    ctx.strokeStyle=inward?'#f4eaff':'#9b603e'; ctx.lineWidth=.025; circle(x,y,.31);
    const dx=x-actor.x,dy=y-actor.y,d=Math.hypot(dx,dy);
    if(d>0.02&&d<radius) {
      const a=Math.atan2(dy,dx)+(inward?0:Math.PI), u=d/radius;
      ctx.globalAlpha=4*u*(1-u);
      // 球の手前を隠さず、力が働く方向へ短い矢印を添える。
      arrow(actor.x+Math.cos(a)*(actor.r+.16),actor.y+Math.sin(a)*(actor.r+.16),a,.22,color);
    }
  }
  ctx.restore();
}
