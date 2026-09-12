/** 表示専用の姿勢。移動方向に直交する軸で球を転がす。物理状態は変更しない。 */
export function rollQuaternion(q, dx, dy, radius) {
  const distance = Math.hypot(dx, dy);
  if (!distance || radius <= 0) return q;
  const half = distance / radius / 2;
  const s = Math.sin(half) / distance;
  const x = -dy * s, y = dx * s, w = Math.cos(half);
  const next = [w*q[0] + x*q[3] + y*q[2], w*q[1] + y*q[3] - x*q[2],
    w*q[2] + x*q[1] - y*q[0], w*q[3] - x*q[0] - y*q[1]];
  const norm = Math.hypot(...next);
  return next.map(v => v / norm);
}

/** 表面上の法線を模様の座標へ戻すための逆回転行列。 */
export function inverseRotation([x, y, z, w]) {
  return [1-2*(y*y+z*z), 2*(x*y+z*w), 2*(x*z-y*w),
    2*(x*y-z*w), 1-2*(x*x+z*z), 2*(y*z+x*w),
    2*(x*z+y*w), 2*(y*z-x*w), 1-2*(x*x+y*y)];
}
