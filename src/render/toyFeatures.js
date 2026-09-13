/** 承認画像の葉っぱ・薄いまもり・ミント床・琥珀のとりもち。 */
import { REST } from '../config/gameConfig.js';
function leafPath(c) {
  c.beginPath(); c.moveTo(-.65,.65); c.bezierCurveTo(-1,-.2,-.35,-.7,.7,-.85);
  c.bezierCurveTo(.63,.1,.35,.9,-.65,.65); c.closePath();
}
export function drawLeaf(c,x,y,r) {
  c.save(); c.translate(x,y); c.scale(r,r);
  c.shadowColor='#bfeaa377'; c.shadowBlur=9;
  const g=c.createLinearGradient(-1,-1,1,1);g.addColorStop(0,'#ecf7d4');g.addColorStop(.45,'#a7cf84');g.addColorStop(1,'#658e4b');
  leafPath(c);c.fillStyle=g;c.fill();c.shadowBlur=0;c.strokeStyle='#dbeab7';c.lineWidth=.045;c.stroke();
  c.beginPath();c.moveTo(-.8,.95);c.quadraticCurveTo(-.1,.1,.48,-.57);c.moveTo(-.36,.4);c.lineTo(-.5,-.08);c.moveTo(-.08,.08);c.lineTo(.4,.07);c.moveTo(.13,-.15);c.lineTo(.12,-.48);c.stroke();c.restore();
}
function heart(c,x,y,r) {
  c.beginPath();c.moveTo(x,y+r*.7);c.bezierCurveTo(x-r*1.6,y-r*.1,x-r*.7,y-r*1.3,x,y-r*.45);
  c.bezierCurveTo(x+r*.7,y-r*1.3,x+r*1.6,y-r*.1,x,y+r*.7);c.closePath();c.fill();c.stroke();
}
function ring(c,x,y,r,progress,color) {
  c.lineWidth=Math.max(1.5,r*.12);c.strokeStyle='#f6e8c04d';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();
  c.strokeStyle=color;c.beginPath();c.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,progress));c.stroke();
}
export function drawFeatureFloors(c,stage,camera) {
  const rest=stage.rest;
  if (rest) {
    const {px:x,py:y}=camera.toScreen(rest.x,rest.y),r=camera.toPx(.35);
    c.save();c.globalAlpha=rest.used ? .48 : 1;c.shadowColor='#07170d99';c.shadowBlur=3;c.shadowOffsetY=2;
    const g=c.createLinearGradient(x-r,y-r,x+r,y+r);g.addColorStop(0,'#c0d6ab');g.addColorStop(.55,'#94b58b');g.addColorStop(1,'#6f936c');
    c.fillStyle=g;c.strokeStyle='#cbdcba';c.lineWidth=1;c.beginPath();c.roundRect(x-r,y-r,r*2,r*2,r*.22);c.fill();c.stroke();c.shadowBlur=0;c.shadowOffsetY=0;
    c.strokeStyle='#648a62';c.beginPath();c.roundRect(x-r*.83,y-r*.83,r*1.66,r*1.66,r*.15);c.stroke();
    c.fillStyle='#7ba276';c.strokeStyle='#cfdfbe';heart(c,x,y,r*.38);
    if (!rest.used) ring(c,x,y,r*.9,rest.progress/REST.durationSec,'#e9f3ce');c.restore();
  }
  for (const tile of stage.sticky) {
    const {px:x,py:y}=camera.toScreen(tile.x,tile.y),r=camera.toPx(.34);
    c.save();c.translate(x,y);c.scale(r,r);const g=c.createRadialGradient(-.3,-.3,.05,0,0,1.2);
    g.addColorStop(0,'#e5b84bcc');g.addColorStop(.65,'#c89725c9');g.addColorStop(1,'#80500fa8');c.fillStyle=g;c.strokeStyle='#e8c875';c.lineWidth=.045;
    c.beginPath();c.moveTo(-.8,-.65);c.bezierCurveTo(-.1,-1.15,.25,-.65,.75,-.85);c.bezierCurveTo(1.25,-.55,.65,0,.95,.55);
    c.bezierCurveTo(.8,1.05,.2,.7,-.45,.95);c.bezierCurveTo(-1.2,.95,-.8,.35,-.95,-.1);c.bezierCurveTo(-1.2,-.4,-1,-.7,-.8,-.65);c.fill();c.stroke();
    c.strokeStyle='#ffe5a4aa';c.lineWidth=.06;c.beginPath();c.ellipse(-.4,-.45,.18,.08,-.4,0,Math.PI*2);c.stroke();c.restore();
  }
}
export function drawGuard(c,x,y,r,value) {
  if (!(value>0)) return;
  const g=c.createRadialGradient(x,y,r*.8,x,y,r*1.55);g.addColorStop(0,'#b8e8a000');g.addColorStop(.5,'#b8e8a052');g.addColorStop(1,'#b8e8a000');
  c.fillStyle=g;c.beginPath();c.arc(x,y,r*1.55,0,Math.PI*2);c.fill();
}
export function drawTrap(c,x,y,r,trap) {
  if (!trap) return;
  c.save();c.lineWidth=Math.max(1,r*.065);c.strokeStyle='#e7c36cbb';
  for (const side of [-1,-.4,.4,1]) { c.beginPath();c.moveTo(x+r*side*.72,y+r*.45);c.bezierCurveTo(x+r*side*.6,y+r,x+r*side,y+r*.9,x+r*side*1.2,y+r*1.15);c.stroke(); }
  ring(c,x,y+r*.18,r*1.1,trap.elapsed/trap.target,'#ffe4a2');c.restore();
}
