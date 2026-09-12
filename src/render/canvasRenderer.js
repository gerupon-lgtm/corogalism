/**
 * 描画。座標変換はすべてカメラ経由（cellSize をここで計算しない）。
 */
import { TUNING } from '../config/gameConfig.js';
import { goalCenter } from '../world/stage.js';
import { WALL_MATERIAL_APPEARANCE, getWallMaterialAppearance } from './materialAppearance.js';

const COLORS = {
  path: '#0B100F',
  grid: '#182220',
  accent: '#FF6A43',
};

function drawAxisLine(ctx, rect, horizontal) {
  ctx.beginPath();
  if (horizontal) {
    ctx.moveTo(rect.x, rect.y + rect.h / 2);
    ctx.lineTo(rect.x + rect.w, rect.y + rect.h / 2);
  } else {
    ctx.moveTo(rect.x + rect.w / 2, rect.y);
    ctx.lineTo(rect.x + rect.w / 2, rect.y + rect.h);
  }
  ctx.stroke();
}

/** 壁矩形内にだけ描く素材パターン。危険形状が当たり判定の外へ見えないよう必ずclipする。 */
function drawWallPattern(ctx, rect, materialId, appearance) {
  const horizontal = rect.w >= rect.h;
  const thickness = horizontal ? rect.h : rect.w;
  const length = horizontal ? rect.w : rect.h;
  const start = horizontal ? rect.x : rect.y;
  const center = horizontal ? rect.y + rect.h / 2 : rect.x + rect.w / 2;

  ctx.strokeStyle = appearance.pattern;
  ctx.fillStyle = appearance.pattern;
  ctx.lineCap = 'round';

  if (materialId === 'rubber') {
    // 丸い気泡。細い壁でも「柔らかい／弾む」印象を残す。
    const radius = Math.max(1, Math.min(2, thickness * 0.23));
    const step = Math.max(8, thickness * 2.1);
    for (let p = start + step / 2; p < start + length; p += step) {
      ctx.beginPath();
      ctx.arc(horizontal ? p : center, horizontal ? center : p, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (materialId === 'stone') {
    // 石積みの目地。壁軸と直交する短線でブロック感を出す。
    const step = Math.max(9, thickness * 2.3);
    ctx.lineWidth = Math.max(1, Math.min(1.5, thickness * 0.22));
    for (let p = start + step; p < start + length; p += step) {
      ctx.beginPath();
      if (horizontal) {
        ctx.moveTo(p, rect.y); ctx.lineTo(p, rect.y + rect.h);
      } else {
        ctx.moveTo(rect.x, p); ctx.lineTo(rect.x + rect.w, p);
      }
      ctx.stroke();
    }
    return;
  }

  if (materialId === 'spike') {
    // 矩形内の警告ジグザグ。棘らしさは出すが、壁の外へ突起を描かない。
    const step = Math.max(6, thickness * 1.45);
    const amplitude = Math.max(1.2, Math.min(2.2, thickness * 0.28));
    ctx.lineWidth = Math.max(1.2, Math.min(1.8, thickness * 0.25));
    ctx.beginPath();
    if (horizontal) ctx.moveTo(rect.x, center);
    else ctx.moveTo(center, rect.y);
    let high = true;
    for (let offset = step / 2; offset < length + step / 2; offset += step / 2) {
      const p = Math.min(start + length, start + offset);
      if (horizontal) ctx.lineTo(p, center + (high ? -amplitude : amplitude));
      else ctx.lineTo(center + (high ? -amplitude : amplitude), p);
      high = !high;
    }
    ctx.stroke();
    return;
  }

  if (materialId === 'moss') {
    // 大小と位置を交互にずらした苔の斑点。乱数を使わず毎フレーム同じ見た目にする。
    const step = Math.max(7, thickness * 1.8);
    for (let i = 0, p = start + step / 3; p < start + length; i += 1, p += step) {
      const radius = Math.max(0.9, Math.min(1.7, thickness * (i % 2 ? 0.18 : 0.27)));
      const drift = (i % 2 ? 1 : -1) * Math.min(1, thickness * 0.16);
      ctx.beginPath();
      ctx.arc(horizontal ? p : center + drift, horizontal ? center + drift : p, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // 基準壁は規則的な直線ダッシュ。未知のmaterialIdもこの見た目へフォールバックする。
  ctx.lineWidth = Math.max(1, Math.min(1.4, thickness * 0.2));
  ctx.setLineDash([Math.max(4, thickness * 0.9), Math.max(3, thickness * 0.65)]);
  drawAxisLine(ctx, rect, horizontal);
}

function drawWall(ctx, wall, camera) {
  const a = camera.toScreen(wall.x, wall.y);
  const rect = {
    x: a.px,
    y: a.py,
    w: camera.toPx(wall.w),
    h: camera.toPx(wall.h),
  };
  const materialId = WALL_MATERIAL_APPEARANCE[wall.materialId] ? wall.materialId : 'default';
  const appearance = getWallMaterialAppearance(materialId);

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();

  ctx.fillStyle = appearance.fill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  drawWallPattern(ctx, rect, materialId, appearance);

  // strokeの外半分もclipされるので、視覚上の壁は衝突矩形からはみ出さない。
  ctx.setLineDash([]);
  ctx.strokeStyle = appearance.edge;
  ctx.lineWidth = Math.max(1, Math.min(1.5, Math.min(rect.w, rect.h) * 0.2));
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

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
    for (const w of stage.walls) {
      drawWall(ctx, w, camera);
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
