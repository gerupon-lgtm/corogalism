/** 経路と独立したシード抽選。コンティニューで配置は変えない。 */
import { LEAF, REST, STICKY, HOURGLASS } from '../config/gameConfig.js';
import { createRng } from '../maze/rng.js';
import { solvePath } from '../maze/path.js';
// XORだけの初期化だと抽選同士に相関が出るため、非線形に混ぜる。
function featureSeed(seed, salt) {
  let h = (seed ^ salt) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
export function addStageFeatures(stage, difficulty) {
  stage.leaf = null; stage.rest = null; stage.sticky = []; stage.hourglass = null;
  if (!difficulty?.themed) return;
  const { maze } = stage, path = solvePath(maze), occupied = new Set();
  const key = p => `${p.x},${p.y}`;
  if (stage.recovery) occupied.add(key(stage.recovery));
  function place(salt, chance, min, max, prefer = () => 0, eligible = () => true) {
    const rng = createRng(featureSeed(maze.seed, salt));
    if (rng() >= chance) return null;
    const candidates = path.map((p, i) => ({ x: p.x + .5, y: p.y + .5, i }))
      .filter(p => p.i >= Math.max(2, Math.ceil((path.length - 1) * min))
        && p.i <= Math.min(path.length - 3, Math.floor((path.length - 1) * max)) && !occupied.has(key(p)) && eligible(p))
      .map(p => ({ ...p, rank: prefer(p) + rng() })).sort((a,b) => b.rank-a.rank);
    const at = candidates[0];
    if (!at) return null;
    occupied.add(key(at));
    return { x: at.x, y: at.y };
  }
  const leaf = place(0x125f834b, LEAF.chance[difficulty.level] ?? 0, LEAF.pathMin, LEAF.pathMax);
  if (leaf) stage.leaf = { ...leaf, collected: false };
  const danger = stage.walls.filter(w => ['stone','spike'].includes(w.materialId));
  const rest = place(0x75e1a621, (danger.length ? REST.dangerChance : REST.chance)[difficulty.level] ?? 0,
    REST.pathMin, REST.pathMax, p => {
      // 強い壁に接する区間を抜けた直後を優先する。
      const previous = path.slice(Math.max(0,p.i-3),p.i);
      return previous.some(c => danger.some(w => Math.hypot(c.x+.5-Math.max(w.x,Math.min(c.x+.5,w.x+w.w)),
        c.y+.5-Math.max(w.y,Math.min(c.y+.5,w.y+w.h))) < .6)) ? 1 : 0;
    });
  if (rest) stage.rest = { ...rest, used: false, progress: 0 };
  if (stage.theme.id === 'sticky') {
    const clearOfEnds = p => Math.hypot(p.x-.5,p.y-.5) > STICKY.endpointClearance
      && Math.hypot(p.x-maze.size+.5,p.y-maze.size+.5) > STICKY.endpointClearance;
    const first = place(0x23ca45b7, 1, 0, 1,
      p => p.i/(path.length-1) >= STICKY.pathMin && p.i/(path.length-1) <= STICKY.pathMax ? 1 : 0, clearOfEnds);
    if (first) stage.sticky.push(first);
    // 初登場は必ず1個。以後は経路外に余裕がある場合だけ2個目。
    if (difficulty.stage > STICKY.firstStage) {
      const route = new Set(path.map(p => `${p.x+.5},${p.y+.5}`));
      const rng = createRng((maze.seed ^ 0x69abc532) >>> 0);
      const cells = maze.cells.map((_,i) => ({x:i%maze.size+.5,y:Math.floor(i/maze.size)+.5}))
        .filter(p => !route.has(key(p)) && !occupied.has(key(p))
          && clearOfEnds(p));
      if (cells.length) stage.sticky.push(cells[Math.floor(rng()*cells.length)]);
    }
  }
  for (const tile of stage.sticky) occupied.add(key(tile));
  if (difficulty.stage >= HOURGLASS.firstStage) {
    const at = place(0x4ab297e3, HOURGLASS.chance[difficulty.level] ?? 0, HOURGLASS.pathMin, HOURGLASS.pathMax);
    if (at) stage.hourglass = { ...at, collected: false };
  }
}
