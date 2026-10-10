/** C案のトイ調描画。静止した盤面はキャッシュし、球とクリア演出のみ更新する。 */
import { TUNING, UI } from '../config/gameConfig.js';
import { goalCenter } from '../world/stage.js';
import { drawHourglass } from './toyHourglass.js';
import { createToyBall } from './toyBall.js';
import { drawLeaf, drawFeatureFloors, drawGuard, drawTrap } from './toyFeatures.js';
import { drawToyCandy } from './toyCandy.js';
import { drawFloorVisuals } from './floorVisuals.js';
import { drawToyWall, drawToyFloor, drawToyGoal, drawConfetti, wallTextureReady } from './toyWorld.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const background = document.createElement('canvas');
  const bg = background.getContext('2d');
  const wallLayer=document.createElement('canvas'),walls=wallLayer.getContext('2d');
  const ball = createToyBall();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let viewportPx = 0, dpr = 1, cachedStage = null, clearAt = null, lastActor = null;
  let cachedTextureReady = false, visualTime=0,visualLast=null;

  // 端末側の描画領域の復元では、寸法が同じでも倍率と静止画が失われる。
  const contexts = [ctx, bg, walls];
  function invalidate() { cachedStage = null; ball.invalidate(); }
  for (const context of contexts) {
    context.canvas.addEventListener('contextlost', invalidate);
    context.canvas.addEventListener('contextrestored', invalidate);
  }
  function prepareContexts() {
    if (contexts.some(context => context.isContextLost?.())) return false;
    // 通知を受けられない状態初期化も、描画倍率の変化から検出する。
    for (const context of contexts) {
      const transform = context.getTransform();
      if (transform.a !== dpr || transform.d !== dpr || transform.b || transform.c || transform.e || transform.f) {
        context.setTransform(dpr,0,0,dpr,0,0);
        invalidate();
      }
    }
    return true;
  }

  function resize(px) {
    const next = Math.max(1, Math.round(px)), ratio = Math.min(window.devicePixelRatio || 1, 3);
    if (viewportPx === next && dpr === ratio) return viewportPx;
    viewportPx = next; dpr = ratio;
    canvas.width = background.width = wallLayer.width = Math.round(viewportPx*dpr);
    canvas.height = background.height = wallLayer.height = Math.round(viewportPx*dpr);
    canvas.style.width = `${viewportPx}px`; canvas.style.height = `${viewportPx}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0); bg.setTransform(dpr,0,0,dpr,0,0);walls.setTransform(dpr,0,0,dpr,0,0);
    cachedStage = null;
    return viewportPx;
  }

  function draw({ stage, actor, camera, pointerTilt, status = 'playing', shield = 0, trap = null, now = performance.now(), animationActive=true, drawExtras }) {
    if (!prepareContexts()) return;
    const textureReady = wallTextureReady();
    if (stage !== cachedStage || textureReady !== cachedTextureReady) {
      drawToyFloor(bg,stage,camera,viewportPx,false);
      drawFloorVisuals(bg,camera,{actor,time:0,reduced:true,stage,settings:{force:6},dynamicLayer:false});
      walls.clearRect(0,0,viewportPx,viewportPx);
      for(const wall of stage.walls)drawToyWall(walls,wall,camera);
      if(!stage.zones.length)bg.drawImage(wallLayer,0,0,viewportPx,viewportPx);
      cachedStage=stage;cachedTextureReady=textureReady;
    }
    if (actor !== lastActor) {clearAt=null;lastActor=actor;visualTime=0;visualLast=now;}
    if(animationActive&&visualLast!==null)visualTime+=Math.min(100,now-visualLast);visualLast=now;
    if (status === 'clear' && clearAt === null) clearAt=now;
    if (status !== 'clear') clearAt=null;
    const elapsed=clearAt===null ? -1 : now-clearAt;
    const progress=elapsed<0 ? 0 : reducedMotion.matches ? 1 : Math.min(1,elapsed/UI.goalSettleMs);
    // 静止画が一時的に透明になっても、前の球を残さない。
    ctx.clearRect(0,0,viewportPx,viewportPx);
    ctx.drawImage(background,0,0,viewportPx,viewportPx);
    if(stage.zones.length){
      drawFloorVisuals(ctx,camera,{actor,time:visualTime,reduced:reducedMotion.matches,stage,settings:{force:6},staticLayer:false});
      ctx.drawImage(wallLayer,0,0,viewportPx,viewportPx);
    }
    drawFeatureFloors(ctx,stage,camera);
    drawExtras?.(ctx,camera);
    if (stage.leaf && !stage.leaf.collected) { const at=camera.toScreen(stage.leaf.x,stage.leaf.y);drawLeaf(ctx,at.px,at.py,camera.toPx(.3)); }
    if (stage.hourglass && !stage.hourglass.collected) {
      const at=camera.toScreen(stage.hourglass.x,stage.hourglass.y);
      drawHourglass(ctx,at.px,at.py,camera.toPx(.32));
    }
    const goal=goalCenter(stage.maze), gs=camera.toScreen(goal.x,goal.y);
    drawToyGoal(ctx,gs.px,gs.py,camera.toPx(TUNING.goalRadius),progress);
    if (stage.recovery && !stage.recovery.collected) {
      const item = camera.toScreen(stage.recovery.x, stage.recovery.y);
      drawToyCandy(ctx, item.px, item.py, camera.toPx(0.34), now, reducedMotion.matches);
    }
    if(pointerTilt) {
      const c=viewportPx/2;ctx.strokeStyle='rgba(255,202,139,.38)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(c,c);ctx.lineTo(c+pointerTilt.x*viewportPx*.42,c+pointerTilt.y*viewportPx*.42);ctx.stroke();
    }
    ball.update(actor);
    const p=camera.toScreen(actor.x,actor.y);
    drawGuard(ctx,p.px,p.py,camera.toPx(actor.r),shield);
    const ease=1-Math.pow(1-progress,3);
    ball.draw(ctx,p.px+(gs.px-p.px)*ease,p.py+(gs.py-p.py)*ease,camera.toPx(actor.r)*(1-.15*ease));
    drawTrap(ctx,p.px,p.py,camera.toPx(actor.r),trap);
    if(stage.theme?.special&&status==='clear'){ctx.save();ctx.strokeStyle='#99e5e9';ctx.lineWidth=2;ctx.globalAlpha=.55;ctx.beginPath();ctx.arc(gs.px,gs.py,camera.toPx(.45)+(reducedMotion.matches?0:Math.min(elapsed,800)/800*camera.toPx(1)),0,Math.PI*2);ctx.stroke();ctx.restore();}
    if(elapsed>=0 && !reducedMotion.matches) drawConfetti(ctx,gs,camera.toPx(1),elapsed,UI.clearCelebrationMs);
  }
  return { resize, draw, get viewportPx() {return viewportPx;} };
}
