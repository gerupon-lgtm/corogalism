import { RECOVERY } from '../config/gameConfig.js';
import { createRng } from '../maze/rng.js';
import { solvePath } from '../maze/path.js';

/** 迷路生成・壁配置と独立した乱数。試行をやり直しても抽選結果は変わらない。 */
export function createRecovery(maze, chance, cfg = RECOVERY, eligible = () => true) {
  const rng = createRng((maze.seed ^ 0x6e49ac31) >>> 0);
  if (!(rng() < chance)) return null;
  const path = solvePath(maze);
  const first = Math.max(1, Math.ceil((path.length - 1) * cfg.pathMin));
  const last = Math.min(path.length - 2, Math.floor((path.length - 1) * cfg.pathMax));
  if (first > last) return null;
  const candidates=path.slice(first,last+1).filter(p=>eligible({x:p.x+.5,y:p.y+.5}));
  if(!candidates.length)return null;
  const at=candidates[Math.floor(rng()*candidates.length)];
  return { x: at.x + 0.5, y: at.y + 0.5, collected: false };
}
