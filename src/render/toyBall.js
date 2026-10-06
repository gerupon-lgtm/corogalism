import { inverseRotation, rollQuaternion } from './ballRotation.js';

/** C案のパール球。球面の模様だけを回し、照明は左上に固定する。 */
export function createToyBall() {
  const sprite = document.createElement('canvas');
  const context = sprite.getContext('2d');
  let quaternion = [0, 0, 0, 1];
  let previous = null, previousActor = null, previousAppearance=null, pixels = 0, dirty = true;
  let bitmap=null,surface=[];
  const invalidate = () => { dirty = true; };
  sprite.addEventListener('contextlost', invalidate);
  sprite.addEventListener('contextrestored', invalidate);

  function update(actor) {
    if(actor.character?.appearance!==previousAppearance){previousAppearance=actor.character?.appearance;dirty=true;}
    if (actor !== previousActor) {
      quaternion = [0, 0, 0, 1]; previous = null; dirty = true;
    }
    if (previous) {
      const dx = actor.x - previous.x, dy = actor.y - previous.y;
      // デバッグteleportは転がりとして補間しない。
      if (Math.hypot(dx, dy) < actor.r * 3 && (dx || dy)) {
        quaternion = rollQuaternion(quaternion, dx, dy, actor.r); dirty = true;
      }
    }
    previous = { x: actor.x, y: actor.y }; previousActor = actor;
  }

  function paint(resolution) {
    if (!dirty && resolution === pixels) return;
    if(resolution!==pixels){
      pixels=resolution;sprite.width=pixels;sprite.height=pixels;
      bitmap=context.createImageData(pixels,pixels);surface=[];
      // 球の形と固定照明は回転に依存しない。寸法が変わった時だけ計算する。
      for(let j=0;j<pixels;j++)for(let i=0;i<pixels;i++){
        const x=(i+.5)/pixels*2-1,y=(j+.5)/pixels*2-1,rr=x*x+y*y;if(rr>=1)continue;
        const z=Math.sqrt(1-rr),light=Math.max(0,-.38*x-.48*y+.79*z);
        const shine=Math.pow(Math.max(0,-.32*x-.4*y+.858*z),48);
        const soft=Math.pow(Math.max(0,-.24*x-.35*y+.906*z),9)*.21,rim=Math.pow(1-z,3)*.18;
        surface.push({x,y,z,light,shine,soft,rim,offset:(j*pixels+i)*4});
        bitmap.data[(j*pixels+i)*4+3]=Math.min(255,(1-Math.sqrt(rr))*pixels*255);
      }
    }
    const m = inverseRotation(quaternion);
    for (const {x,y,z,light,shine,soft,rim,offset} of surface) {
      const u = m[0]*x+m[1]*y+m[2]*z, v = m[3]*x+m[4]*y+m[5]*z, t = m[6]*x+m[7]*y+m[8]*z;
      const seam = u + .42 * Math.sin(v*3 + t*1.6);
      const band = seam > .48;
      const dot = u*.43 + v*.12 + t*.895 > .991;
      let base = dot ? [255,233,193] : band ? [255,209,161] : [255,113,69];
      const appearance=previousActor?.character?.appearance;
      let gloss=1;
      if(appearance==='metal'){
        const brushed=Math.sin(v*190+t*70)*5;base=[133+brushed,151+brushed,162+brushed];
      }else if(appearance==='wood'){
        const grain=Math.sin(v*42+Math.sin(u*7)*3+t*4)*13;base=[184+grain,120+grain*.7,62+grain*.3];gloss=.25;
      }else if(appearance==='superball')base=dot?[255,243,150]:band?[67,211,194]:[237,76,137];
      else if(appearance==='sponge'){
        const pore=Math.sin(u*71)*Math.sin(v*57)*Math.sin(t*67)>.5?-.24:0;base=[175*(1+pore),210*(1+pore),132*(1+pore)];gloss=.08;
      }
      // 曲線の継ぎ目は浅い溝。照明やハイライトと一緒には回転しない。
      const groove = Math.abs(seam-.48) < .016 && !dot ? .74 : 1;
      const shade = (.41+.59*light)*groove;
      const pearl = (Math.sin(u*397+v*239+t*127)*.5+.5)*light*3;
      const reflection = Math.min(.97, (shine*.95+soft)*gloss+rim);
      for (let c=0; c<3; c++) {
        bitmap.data[offset+c] = base[c]*shade*(1-reflection)+255*reflection+pearl+(c===2 ? rim*35 : 0);
      }
    }
    context.putImageData(bitmap, 0, 0); dirty = false;
  }

  function draw(ctx, x, y, radius) {
    if (context.isContextLost?.()) return;
    paint(Math.min(96, Math.max(32, Math.ceil(radius*2*(window.devicePixelRatio || 1)))));
    ctx.save();
    const shadow = ctx.createRadialGradient(x+radius*.15, y+radius*.24, radius*.25, x+radius*.15, y+radius*.24, radius*1.18);
    shadow.addColorStop(0, '#0009'); shadow.addColorStop(1, '#0000');
    ctx.fillStyle = shadow; ctx.beginPath(); ctx.arc(x+radius*.15, y+radius*.24, radius*1.18, 0, Math.PI*2); ctx.fill();
    ctx.drawImage(sprite, x-radius, y-radius, radius*2, radius*2);
    ctx.restore();
  }
  return { update, draw, invalidate };
}
