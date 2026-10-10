/** 動く壁は静止壁の保存画像とは別に、毎フレームの位置で描く。 */
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

/** 初登場のカウント内で、動く向きと球の軌道を短く見せる。DOMに依存しない描画。 */
export function drawPuzzleIntro(canvas,kind){
 const ctx=canvas.getContext('2d'),width=canvas.width,height=canvas.height;
 ctx.clearRect(0,0,width,height);ctx.save();ctx.scale(width/144,height/112);
 ctx.fillStyle='#cae8de';ctx.fillRect(5,5,134,102);
 const aim=['racket','openRacket','racketTiming'].includes(kind);
 const wall={id:'intro',x:100,y:30,w:7,h:44,axis:'y',min:12,max:53,bounce:aim?'aim':'reflect',label:aim?'':'1'};
 const camera={toScreen:(x,y)=>({px:x,py:y}),toPx:n=>n};
 drawRackets(ctx,camera,{rackets:[wall]},new Map(),0);
 ctx.strokeStyle='#ba783c';ctx.lineWidth=2;ctx.setLineDash([4,4]);
 ctx.beginPath();ctx.moveTo(28,72);ctx.lineTo(96,55);ctx.lineTo(aim?42:123,aim?25:88);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle='#e8874b';ctx.beginPath();ctx.arc(28,72,7,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
