/**
 * 到達可能性検証（BFS）。
 * start から全セルへ到達できることを確認する（F-122）。
 *
 * 「破綻しない迷路生成」がこのプロジェクト群の技術検証テーマそのものなので、
 * 生成後の検証を省かない。
 */
export function checkReachability(maze) {
  const { size, cells, start } = maze;
  const total = size * size;
  const seen = new Array(total).fill(false);
  const startIndex = start.y * size + start.x;

  const queue = [startIndex];
  seen[startIndex] = true;
  let count = 1;

  while (queue.length) {
    const cur = queue.shift();
    const cx = cur % size;
    const cy = (cur - cx) / size;
    const c = cells[cur];

    const steps = [
      { open: !c.t, nx: cx, ny: cy - 1 },
      { open: !c.r, nx: cx + 1, ny: cy },
      { open: !c.b, nx: cx, ny: cy + 1 },
      { open: !c.l, nx: cx - 1, ny: cy },
    ];

    for (const s of steps) {
      if (!s.open) continue;
      if (s.nx < 0 || s.ny < 0 || s.nx >= size || s.ny >= size) continue;
      const ni = s.ny * size + s.nx;
      if (seen[ni]) continue;
      seen[ni] = true;
      count++;
      queue.push(ni);
    }
  }

  const unreachable = [];
  for (let i = 0; i < total; i++) {
    if (!seen[i]) unreachable.push({ x: i % size, y: Math.floor(i / size) });
  }

  return { ok: count === total, visited: count, total, unreachable };
}
