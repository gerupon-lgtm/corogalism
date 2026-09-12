/**
 * 描画。座標変換はすべてカメラ経由（cellSize をここで計算しない）。
 */
import { TUNING } from '../config/gameConfig.js';
import { goalCenter } from '../world/stage.js';

const COLORS = {
  path: '#0B100F',
  grid: '#182220',
  wall: '#9BB0A9',
  accent: '#FF6A43',
};

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let viewportPx = 0;

  function resize(px) {
    viewportPx = Math.max(1, Math.round(px));
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = viewportPx * dpr;
    canvas.height = viewportPx * dpr;
    canvas.style.width = `${viewportPx}px`;
    canvas.style.height = `${viewportPx}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return viewportPx;
  }

  function draw({ stage, actor, camera, pointerTilt }) {
    const size = stage.maze.size;
    ctx.fillStyle = COLORS.path;
    ctx.fillRect(0, 0, viewportPx, viewportPx);

    // セルの目安グリッド
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let g = 1; g < size; g++) {
      const p = Math.round(camera.toPx(g)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, 0); ctx.lineTo(p, viewportPx);
      ctx.moveTo(0, p); ctx.lineTo(viewportPx, p);
      ctx.stroke();
    }

    // 壁
    ctx.fillStyle = COLORS.wall;
    for (const w of stage.walls) {
      const a = camera.toScreen(w.x, w.y);
      ctx.fillRect(a.px, a.py, camera.toPx(w.w), camera.toPx(w.h));
    }

    // ゴール
    const g = goalCenter(stage.maze);
    const gs = camera.toScreen(g.x, g.y);
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = Math.max(2, camera.toPx(stage.wallThickness * 0.7));
    ctx.beginPath();
    ctx.arc(gs.px, gs.py, camera.toPx(TUNING.goalRadius), 0, Math.PI * 2);
    ctx.stroke();

    // 擬似傾きモードの方向表示
    if (pointerTilt) {
      const c = viewportPx / 2;
      ctx.strokeStyle = 'rgba(255,106,67,.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.lineTo(c + pointerTilt.x * viewportPx * 0.42, c + pointerTilt.y * viewportPx * 0.42);
      ctx.stroke();
    }

    // ボール
    const b = camera.toScreen(actor.x, actor.y);
    ctx.fillStyle = COLORS.accent;
    ctx.beginPath();
    ctx.arc(b.px, b.py, camera.toPx(actor.r), 0, Math.PI * 2);
    ctx.fill();
  }

  return { resize, draw, get viewportPx() { return viewportPx; } };
}
