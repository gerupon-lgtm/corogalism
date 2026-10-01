import { drawFloorVisuals } from './floorVisuals.js';
/** ガイドと開始・予告が共用する、小さな滑走シーン。 */
export function drawFloorArt(canvas,id='ice',time=0){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 c.clearRect(0,0,w,h);c.save();c.beginPath();c.roundRect(1,1,w-2,h-2,14);c.clip();
 c.fillStyle='#304438';c.fillRect(0,0,w,h);
 const scale=w/3,cols=[0,1,2],cells=cols.flatMap(x=>[0,1,2].map(y=>({x,y})));
 const zones=[];
 if(id==='ice'||id==='sand'||id==='iceSand'||id==='specialFlow'){
  zones.push({kind:id==='sand'?'sand':'ice',cells,frictionK:1,forceX:0,forceY:0,minAccelK:.28,transitionSpeed:1.2});
  if(id==='iceSand'){zones[0].cells=cells.filter(p=>p.x!==2);zones.push({kind:'sand',cells:cells.filter(p=>p.x===2),frictionK:3.2});}
 }
 if(['gravity','repulsion','specialFlow'].includes(id))zones.push({kind:'radial',x:2,y:.85,radius:1.25,strength:id==='repulsion'?-3.3:3.3,corner:true});
 if(id==='specialFlow')zones.push({kind:'radial',x:.7,y:.65,radius:.75,strength:-3.3,corner:true});
 const actor={x:1,y:.95,vx:0,vy:0,r:.18},stage={zones};
 drawFloorVisuals(c,{toPx:n=>n*scale},{actor,stage,time,reduced:true,settings:{force:3.3}});
 c.strokeStyle=id==='sand'?'#f5e7b5':'#fff6d8';c.lineWidth=2.5;c.setLineDash([7,6]);
 c.beginPath();c.moveTo(w*.08,h*.76);c.bezierCurveTo(w*.4,h*.72,w*.66,h*.9,w*.81,h*.33);c.stroke();c.setLineDash([]);
 c.fillStyle='#fff2c7';c.beginPath();c.moveTo(w*.8,h*.2);c.lineTo(w*.74,h*.35);c.lineTo(w*.86,h*.35);c.fill();
 const x=w*.31,y=h*.71,r=Math.min(w,h)*.1;
 const g=c.createRadialGradient(x-r*.35,y-r*.45,0,x,y,r);g.addColorStop(0,'#fff7d3');g.addColorStop(.35,'#ffb554');g.addColorStop(1,'#c55425');
 c.fillStyle=g;c.shadowColor='#07100b99';c.shadowBlur=3;c.shadowOffsetY=2;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
 c.restore();
}
