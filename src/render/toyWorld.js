import { getWallMaterialAppearance } from './materialAppearance.js';

const circle = (ctx, x,y,r) => { ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); };
function rounded(ctx,x,y,w,h,r) { ctx.beginPath(); ctx.roundRect(x,y,w,h,r); }

/** 色・模様・丸い面取りを、実際の衝突矩形の内側だけに描く。 */
export function drawToyWall(ctx, wall, camera) {
  const point = camera.toScreen(wall.x, wall.y);
  const w = camera.toPx(wall.w), h = camera.toPx(wall.h);
  const horizontal = w >= h, length = Math.max(w,h), thickness = Math.min(w,h);
  const a = getWallMaterialAppearance(wall.materialId);
  ctx.save(); ctx.translate(point.px, point.py);
  ctx.beginPath(); ctx.rect(0,0,w,h); ctx.clip();
  if (!horizontal) { ctx.translate(w,0); ctx.rotate(Math.PI/2); }
  const gradient = ctx.createLinearGradient(0,0,0,thickness);
  gradient.addColorStop(0,a.edge); gradient.addColorStop(.22,a.fill);
  gradient.addColorStop(.62,a.fill); gradient.addColorStop(1,a.pattern);
  ctx.fillStyle = gradient;
  rounded(ctx,0,0,length,thickness,thickness*.23); ctx.fill(); ctx.clip();
  const step = thickness*2.3;
  if (wall.materialId === 'stone') {
    for(let p=0;p<length;p+=step) {
      ctx.strokeStyle='#5e483877'; ctx.lineWidth=.8;
      rounded(ctx,p+.4,.5,step-.8,thickness-1,thickness*.25); ctx.stroke();
      for(let n=0;n<7;n++) {
        const x=p+step*(.1+((n*37)%79)/100), y=thickness*(.18+((n*29)%65)/100);
        ctx.fillStyle=n%2 ? '#6c503b88' : '#ffebc15a'; circle(ctx,x,y,Math.max(.35,thickness*.055));
      }
    }
  } else if (wall.materialId === 'spike') {
    for(let p=thickness*.75;p<length;p+=thickness*1.7) {
      ctx.fillStyle=a.pattern; ctx.beginPath();
      ctx.moveTo(p,thickness*.22); ctx.lineTo(p+thickness*.48,thickness*.78);
      ctx.lineTo(p-thickness*.48,thickness*.78); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#ffb2a566'; ctx.lineWidth=.6; ctx.stroke();
    }
  } else if (wall.materialId === 'moss') {
    for(let n=0;n<length*1.7;n++) {
      const x=(n*7.13)%length,y=thickness*(.15+((n*31)%70)/100);
      ctx.fillStyle=['#accb56','#5e9e38','#375f23','#d2de83'][n%4];
      circle(ctx,x,y,thickness*(.045+(n%3)*.025));
      if(n%9===0) {
        ctx.fillStyle='#b6cf67';
        for(let leaf=0;leaf<4;leaf++) {ctx.save();ctx.translate(x,y);ctx.rotate(leaf*Math.PI/2+.4);ctx.beginPath();ctx.ellipse(thickness*.12,0,thickness*.17,thickness*.065,0,0,Math.PI*2);ctx.fill();ctx.restore();}
      }
    }
  } else if (wall.materialId === 'rubber') {
    for(let p=thickness;p<length;p+=step) {
      const dimple=ctx.createRadialGradient(p-.3,thickness*.46,.1,p,thickness*.5,thickness*.26);
      dimple.addColorStop(0,'#086780');dimple.addColorStop(.75,'#199ebc');dimple.addColorStop(1,'#c1f6ff');
      ctx.fillStyle=dimple;circle(ctx,p,thickness*.5,thickness*.26);
    }
  } else {
    for(const y of [.38,.64]) {
      ctx.fillStyle='#64716e88';ctx.fillRect(1,thickness*y,length-2,.65);
      ctx.fillStyle='#f1ede388';ctx.fillRect(1,thickness*y+.7,length-2,.55);
    }
    for(let p=step;p<length;p+=step*2) {ctx.fillStyle='#53605a55';ctx.fillRect(p,0,.7,thickness);}
  }
  ctx.strokeStyle=a.edge;ctx.lineWidth=.7;
  rounded(ctx,.4,.4,length-.8,thickness-.8,thickness*.2);ctx.stroke();ctx.restore();
}

export function drawToyFloor(ctx, stage, camera, viewport) {
  ctx.fillStyle='#24362e'; ctx.fillRect(0,0,viewport,viewport);
  const size=stage.maze.size;
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const p=camera.toScreen(x,y), cell=camera.toPx(1);
    const gradient=ctx.createLinearGradient(p.px,p.py,p.px+cell,p.py+cell);
    gradient.addColorStop(0,(x+y)%2 ? '#34473b' : '#304337');gradient.addColorStop(1,'#1b2a23');
    ctx.fillStyle=gradient;ctx.fillRect(p.px,p.py,cell,cell);
    ctx.strokeStyle='#ffffff08';ctx.lineWidth=.7;ctx.strokeRect(p.px+.7,p.py+.7,cell-1.4,cell-1.4);
  }
  for(const wall of stage.walls) drawToyWall(ctx,wall,camera);
}

/** カップの縁はゴール半径内。中央のチェック模様が到達地点を示す。 */
export function drawToyGoal(ctx,x,y,r,clearProgress=0) {
  ctx.save();
  ctx.shadowColor='#0009';ctx.shadowBlur=r*.2;ctx.shadowOffsetY=r*.12;
  const rim=ctx.createLinearGradient(x-r,y-r,x+r,y+r);
  rim.addColorStop(0,'#fff4d9');rim.addColorStop(.35,'#ddc09a');rim.addColorStop(.7,'#bb9066');rim.addColorStop(1,'#f9dfb7');
  ctx.fillStyle=rim;circle(ctx,x,y,r);
  ctx.shadowColor='transparent';
  const inside=ctx.createRadialGradient(x,y+r*.2,0,x,y,r*.79);
  inside.addColorStop(0,'#f3a044');inside.addColorStop(.6,'#bd621f');inside.addColorStop(1,'#61301c');
  ctx.fillStyle=inside;circle(ctx,x,y,r*.76);
  ctx.strokeStyle='#fff0cf';ctx.lineWidth=Math.max(.65,r*.055);ctx.beginPath();ctx.arc(x,y,r*.91,Math.PI*.85,Math.PI*1.85);ctx.stroke();
  const tile=r*.25;
  for(let row=0;row<3;row++) for(let col=0;col<3;col++) {
    ctx.fillStyle=(row+col)%2 ? '#f6d9a8' : '#634632';ctx.fillRect(x+(col-1.5)*tile,y+(row-1.5)*tile,tile,tile);
  }
  if(clearProgress>0) {ctx.strokeStyle=`rgba(255,219,137,${.65*(1-clearProgress)})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r*(1+clearProgress*.8),0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}

export function drawConfetti(ctx, origin, cell, elapsed, duration) {
  const t=elapsed/duration;
  if(t<0 || t>1) return;
  const colors=['#ff785d','#ffd277','#65c8c9','#f6e5ba','#a8cc75'];
  ctx.save();ctx.globalAlpha=Math.min(1,(1-t)*3);
  for(let i=0;i<30;i++) {
    // ゴールから盤面の内側へ。画面やカメラ自体は揺らさない。
    const angle=Math.PI+(i/29)*Math.PI*.72, speed=cell*(1.2+(i%7)*.38);
    const x=origin.px+Math.cos(angle)*speed*t, y=origin.py+Math.sin(angle)*speed*t+cell*1.3*t*t;
    ctx.save();ctx.translate(x,y);ctx.rotate(i+t*(i%2 ? 7 : -6));ctx.fillStyle=colors[i%colors.length];
    const s=cell*(.045+(i%3)*.016);ctx.fillRect(-s/2,-s/2,s,s*(.65+Math.abs(Math.cos(t*9+i))*.5));ctx.restore();
  }
  ctx.restore();
}
