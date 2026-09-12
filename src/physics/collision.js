/**
 * 円（ボール）× 矩形（壁）の衝突解決。すべてマス単位。
 *
 * セル単位のクランプ方式にしないこと。角で壁を抜ける。
 * 最近点への押し出しと法線方向の速度反射で解決する。
 *
 * 反発係数は壁ごとに変わり得るため、呼び出し側から
 * restitutionOf(wall) を受け取る（resolveParams への依存を持たない）。
 */
import { TUNING } from '../config/gameConfig.js';

export function resolveCollisions(actor, walls, restitutionOf) {
  let hits = 0;

  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    const px = Math.max(w.x, Math.min(actor.x, w.x + w.w));
    const py = Math.max(w.y, Math.min(actor.y, w.y + w.h));
    let dx = actor.x - px;
    let dy = actor.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 >= actor.r * actor.r) continue;

    let nx;
    let ny;
    const d = Math.sqrt(d2);
    if (d > 1e-6) {
      nx = dx / d;
      ny = dy / d;
    } else {
      // 中心が矩形の内側：貫通の浅い軸へ押し出す
      const left = actor.x - w.x;
      const right = w.x + w.w - actor.x;
      const top = actor.y - w.y;
      const bottom = w.y + w.h - actor.y;
      const m = Math.min(left, right, top, bottom);
      nx = m === left ? -1 : m === right ? 1 : 0;
      ny = m === top ? -1 : m === bottom ? 1 : 0;
    }

    actor.x = px + nx * actor.r;
    actor.y = py + ny * actor.r;

    const vn = actor.vx * nx + actor.vy * ny;
    if (vn < 0) {
      if (-vn > TUNING.wallHitSpeed) hits++;
      const rest = restitutionOf(w);
      actor.vx -= (1 + rest) * vn * nx;
      actor.vy -= (1 + rest) * vn * ny;
    }
  }

  return hits;
}
