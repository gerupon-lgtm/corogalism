import { STAGE_THEMES } from '../config/gameConfig.js';
import { createRng } from '../maze/rng.js';
import { solvePath } from '../maze/path.js';

export function themeAt(stage, cfg = STAGE_THEMES) {
  const n = Math.max(1, Math.floor(stage));
  const id = n <= cfg.introStages ? 'basic' : cfg.cycle[(n - cfg.introStages - 1) % cfg.cycle.length];
  return { id, ...cfg.definitions[id] };
}

/** 経路上の曲がり角に接する壁を優先。外周とスタート・ゴールの周囲は標準のまま。 */
export function assignTheme(stage, difficulty) {
  const theme = themeAt(difficulty.stage);
  stage.theme = theme;
  if (theme.material === 'default') return;
  const { maze, wallThickness: wt } = stage;
  const path = solvePath(maze);
  const turns = path.filter((p, i) => i > 0 && i < path.length - 1
    && (p.x - path[i - 1].x !== path[i + 1].x - p.x || p.y - path[i - 1].y !== path[i + 1].y - p.y));
  const touches = (w, p) => {
    const x = p.x + 0.5, y = p.y + 0.5;
    return Math.hypot(x - Math.max(w.x, Math.min(x, w.x + w.w)), y - Math.max(w.y, Math.min(y, w.y + w.h))) <= 0.51;
  };
  const rng = createRng((maze.seed ^ 0x318be952) >>> 0);
  const eligible = stage.walls.filter(w => w.x > -wt / 4 && w.y > -wt / 4
    && w.x + w.w < maze.size + wt / 4 && w.y + w.h < maze.size + wt / 4
    && !touches(w, maze.start) && !touches(w, maze.goal));
  const ranked = eligible.map(w => ({ w, score: (turns.some(p => touches(w, p)) ? 1 : 0) + rng() }));
  ranked.sort((a, b) => b.score - a.score);
  for (const { w } of ranked.slice(0, Math.round(eligible.length * theme.ratio))) w.materialId = theme.material;
}
