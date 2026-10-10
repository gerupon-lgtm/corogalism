/** Moving rackets are drawn each frame, outside the cached static wall layer. */
export function drawRackets(ctx,camera,stage,flashes,now) {
  ctx.save();
  for(const w of stage.rackets){
    const vertical=w.h>=w.w,moveY=w.axis==='y',center=camera.toScreen(w.x+w.w/2,w.y+w.h/2);
    const start=camera.toScreen(moveY?w.x+w.w/2:w.min+w.w/2,moveY?w.min+w.h/2:w.y+w.h/2);
    const end=camera.toScreen(moveY?w.x+w.w/2:w.max+w.w/2,moveY?w.max+w.h/2:w.y+w.h/2);
    ctx.strokeStyle='rgba(227,212,251,.32)';ctx.lineWidth=1.5;ctx.setLineDash([3,5]);
    ctx.beginPath();ctx.moveTo(start.px,start.py);ctx.lineTo(end.px,end.py);ctx.stroke();ctx.setLineDash([]);
    for(const p of [start,end]){ctx.fillStyle='rgba(227,212,251,.45)';ctx.beginPath();ctx.arc(p.px,p.py,2,0,Math.PI*2);ctx.fill();}
    const p=camera.toScreen(w.x,w.y),width=camera.toPx(w.w),height=camera.toPx(w.h);
    const glow=now-(flashes.get(w.id)??-Infinity)<180;
    ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
    const gradient=ctx.createLinearGradient(p.px,p.py,p.px+(vertical?width:0),p.py+(vertical?0:height));
    gradient.addColorStop(0,glow?'#f4e0ff':'#d2b2e8');gradient.addColorStop(.45,glow?'#d9b1ed':'#a16bb7');gradient.addColorStop(1,'#613d73');
    ctx.fillStyle=gradient;ctx.strokeStyle='#e2c6ee';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(p.px,p.py,width,height,Math.min(width,height)/2);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.stroke();
    ctx.strokeStyle='rgba(255,245,255,.86)';ctx.lineWidth=1;
    for(const fraction of w.bounce==='reflect'?[.1,.9]:[.18,.5,.82]){ctx.beginPath();if(vertical){const y=p.py+height*fraction;ctx.moveTo(p.px+width*.2,y);ctx.lineTo(p.px+width*.8,y);}else{const x=p.px+width*fraction;ctx.moveTo(x,p.py+height*.2);ctx.lineTo(x,p.py+height*.8);}ctx.stroke();}
    ctx.fillStyle='#fbebff';ctx.font=`bold ${Math.max(9,camera.toPx(.21))}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(moveY?'↕':'↔',center.px,center.py);
    if(w.label){const label=camera.toScreen(w.x+w.w*(vertical?.5:.25),w.y+w.h*(vertical?.25:.5));ctx.fillText(w.label,label.px,label.py);}
  }
  ctx.restore();
}
