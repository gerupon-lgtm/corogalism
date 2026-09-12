/**
 * 経路と折れ回数（F-201, F-202）。
 *
 * 迷路は全セル連結のスパニングツリーなので、スタート→ゴールの経路は一意に決まる。
 * 折れ回数（経路上の方向転換の回数）は、壁への衝突回数との相関が 1.000 で、
 * 「その面で何回ぶつかることになるか」の予測値そのもの（docs/hp-and-materials.md §2）。
 *
 * このゲーム固有の概念を持ち込まない純粋関数。
 * 後続2作（迷路脱出ゲーム / AmazingMaze）でもそのまま使える。
 */

/** スタートからゴールまでの一意な経路をセルの配列で返す */
export function solvePath(maze) {
  const { size, cells, start, goal } = maze;
  const startIndex = start.y * size + start.x;
  const goalIndex = goal.y * size + goal.x;
  const from = new Array(size * size).fill(-1);
  const seen = new Array(size * size).fill(false);
  seen[startIndex] = true;

  const queue = [startIndex];
  let head = 0;
  let found = false;
  while (head < queue.length) {
    const cur = queue[head++];
    if (cur === goalIndex) { found = true; break; }
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
      from[ni] = cur;
      queue.push(ni);
    }
  }
  if (!found) throw new Error('ゴールへの経路が見つかりません（到達可能性検証が通っていない可能性）');

  const path = [];
  for (let i = goalIndex; i !== -1; i = from[i]) path.push({ x: i % size, y: Math.floor(i / size) });
  return path.reverse();
}

/** 経路上の方向転換の回数 */
export function countTurns(path) {
  let turns = 0;
  for (let i = 2; i < path.length; i++) {
    const a = { x: path[i - 1].x - path[i - 2].x, y: path[i - 1].y - path[i - 2].y };
    const b = { x: path[i].x - path[i - 1].x, y: path[i].y - path[i - 1].y };
    if (a.x !== b.x || a.y !== b.y) turns++;
  }
  return turns;
}
