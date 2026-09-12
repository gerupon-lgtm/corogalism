import { RECOVERY } from '../config/gameConfig.js';
import { createRng } from '../maze/rng.js';
import { solvePath } from '../maze/path.js';

/** 迷路生成・壁配置と独立した乱数。試行をやり直しても抽選結果は変わらない。 */
export function createRecovery(maze, chance, cfg = RECOVERY) {
  const rng = createRng((maze.seed ^ 0x6e49ac31) >>> 0);
  if (!(rng() < chance)) return null;
  const path = solvePath(maze);
  const first = Math.max(1, Math.ceil((path.length - 1) * cfg.pathMin));
  const last = Math.min(path.length - 2, Math.floor((path.length - 1) * cfg.pathMax));
  if (first > last) return null;
  const index = first + Math.floor(rng() * (last - first + 1));
  return { x: path[index].x + 0.5, y: path[index].y + 0.5, collected: false };
}
