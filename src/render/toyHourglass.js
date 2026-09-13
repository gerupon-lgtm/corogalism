/** 木枠・琥珀色の砂・薄いガラスの、小さなトイ砂時計。 */
export function drawHourglass(ctx, x, y, r) {
  ctx.save(); ctx.translate(x,y); ctx.scale(r,r);
  ctx.fillStyle='rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(0,.96,.8,.22,0,0,Math.PI*2);ctx.fill();
  const wood=ctx.createLinearGradient(-.8,0,.8,0);
  wood.addColorStop(0,'#966333');wood.addColorStop(.35,'#e4bd78');wood.addColorStop(.65,'#c5934e');wood.addColorStop(1,'#81512b');
  ctx.strokeStyle='#764d2c';ctx.lineWidth=.09;ctx.fillStyle=wood;
  for(const side of [-1,1]){ctx.beginPath();ctx.roundRect(side*.68-.07,-.8,.14,1.6,.06);ctx.fill();ctx.stroke();}
  const glass=ctx.createLinearGradient(-.5,0,.5,0);glass.addColorStop(0,'#b4d2bf');glass.addColorStop(.4,'#fff6d8');glass.addColorStop(1,'#b9d0bb');
  ctx.fillStyle=glass;ctx.strokeStyle='#a7bca5';ctx.lineWidth=.06;
  ctx.beginPath();ctx.moveTo(-.48,-.73);ctx.bezierCurveTo(-.5,-.32,-.13,-.16,-.1,0);ctx.bezierCurveTo(-.13,.2,-.5,.3,-.48,.73);
  ctx.lineTo(.48,.73);ctx.bezierCurveTo(.5,.3,.13,.2,.1,0);ctx.bezierCurveTo(.13,-.16,.5,-.32,.48,-.73);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#d99832';ctx.beginPath();ctx.moveTo(-.37,-.49);ctx.lineTo(.37,-.49);ctx.lineTo(0,-.07);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(-.4,.66);ctx.quadraticCurveTo(-.2,.36,0,.3);ctx.quadraticCurveTo(.2,.36,.4,.66);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#f2be52';ctx.lineWidth=.055;ctx.beginPath();ctx.moveTo(0,-.07);ctx.lineTo(0,.32);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,245,.85)';ctx.lineWidth=.07;ctx.beginPath();ctx.moveTo(-.34,-.66);ctx.lineTo(-.3,-.48);ctx.moveTo(-.32,.4);ctx.lineTo(-.37,.59);ctx.stroke();
  for(const yy of [-.9,.73]){ctx.fillStyle=wood;ctx.strokeStyle='#764d2c';ctx.lineWidth=.07;ctx.beginPath();ctx.roundRect(-.85,yy,1.7,.24,.1);ctx.fill();ctx.stroke();ctx.strokeStyle='#f4dba4';ctx.beginPath();ctx.moveTo(-.64,yy+.055);ctx.lineTo(.6,yy+.055);ctx.stroke();}
  ctx.restore();
}
