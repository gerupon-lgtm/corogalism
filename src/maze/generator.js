/**
 * 迷路生成（DFSバックトラッカー）。
 *
 * DOM・描画から独立した純粋関数。サイズとシードだけに依存する。
 * 後続2作（迷路脱出ゲーム / AmazingMaze）から再利用できるよう、
 * このゲーム固有の概念（素材・キャラ・カメラ）を持ち込まない。
 *
 * 出力は全セル連結のスパニングツリーになる。生成の一部として
 * 必ず到達可能性検証（validator）を通す（F-122、迂回しない）。
 */
import { createRng, randInt } from './rng.js';
import { checkReachability } from './validator.js';

const DIRS = [
  { dx: 0, dy: -1, wall: 't', opposite: 'b' },
  { dx: 1, dy: 0, wall: 'r', opposite: 'l' },
  { dx: 0, dy: 1, wall: 'b', opposite: 't' },
  { dx: -1, dy: 0, wall: 'l', opposite: 'r' },
];

export function createCells(size) {
  const cells = [];
  for (let i = 0; i < size * size; i++) cells.push({ t: 1, r: 1, b: 1, l: 1 });
  return cells;
}

export function generateMaze(size, seed) {
  if (!Number.isInteger(size) || size < 2) throw new Error('size は2以上の整数');
  const rng = createRng(seed);
  const cells = createCells(size);
  const visited = new Array(size * size).fill(false);

  const stack = [0];
  visited[0] = true;

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const cx = cur % size;
    const cy = (cur - cx) / size;

    const candidates = [];
    for (const d of DIRS) {
      const nx = cx + d.dx;
      const ny = cy + d.dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const ni = ny * size + nx;
      if (visited[ni]) continue;
      candidates.push({ ni, d });
    }

    if (!candidates.length) { stack.pop(); continue; }

    const pick = candidates[randInt(rng, candidates.length)];
    cells[cur][pick.d.wall] = 0;
    cells[pick.ni][pick.d.opposite] = 0;
    visited[pick.ni] = true;
    stack.push(pick.ni);
  }

  const maze = {
    size,
    seed: seed >>> 0,
    cells,
    start: { x: 0, y: 0 },
    goal: { x: size - 1, y: size - 1 },
  };

  // F-122: 生成の一部として必ず検証する。迂回しない。
  const result = checkReachability(maze);
  if (!result.ok) {
    throw new Error(
      `迷路生成の到達可能性検証に失敗しました（size=${size}, seed=${seed}, 未到達=${result.unreachable.length}）`
    );
  }

  return maze;
}
