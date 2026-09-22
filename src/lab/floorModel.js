import { generateMaze } from '../maze/generator.js';
import { ICE_LAB } from '../config/gameConfig.js';
import { createStage, createActor } from '../world/stage.js';
import { CHARACTERS } from '../world/characters.js';
import { checkReachability } from '../maze/validator.js';

export const FLOOR_OPTIONS = {
  normal: { name: '通常', color: '#e9dcc5', hint: 'いつもの床。ほかの床との手触りを比べてみよう。' },
  ice: { name: '氷', color: '#b9eaf5', hint: '青い床は滑り続けます。速いほど止まりにくいので、早めに逆へ傾けてブレーキ。' },
  sand: { name: '砂', color: '#eed091', hint: '砂の上は勢いが落ちます。強めに傾けて進もう。' },
  gravity: { name: '重力', color: '#d9c7f0', hint: '輪の中心へ引かれます。横をかすめると進路が内側へ曲がります。' },
  repulsion: { name: '反重力', color: '#f8c9bb', hint: '輪の外へ押されます。中心を越えたら加速に注意。' },
};

export function createFloorLab() {
  const maze = generateMaze(7, 250);
  const stage = createStage(maze);
  for (const wall of stage.walls) wall.materialId = 'rubber';
  return { stage, actor: createActor(maze, CHARACTERS.default) };
}

export const PATCH_CELLS = Array.from({ length: 49 }, (_, i) => ({ x: i % 7, y: Math.floor(i / 7) }));
export const FIELD_CENTERS = [0.5, 2.5, 4.5, 6.5].flatMap(y => [0.5, 2.5, 4.5, 6.5].map(x => ({ x, y })));

export function applyFloor(stage, type, settings) {
  stage.zones = [];
  if (type === 'ice' || type === 'sand') {
    stage.zones.push({ cells: PATCH_CELLS, ...(type === 'ice' ? { kind: 'ice', ...ICE_LAB } : {}), frictionK: settings[type], forceX: 0, forceY: 0 });
  } else if (type === 'gravity' || type === 'repulsion') {
    for (const center of FIELD_CENTERS) stage.zones.push({ kind: 'radial', ...center, radius: settings.radius,
      strength: settings.force * (type === 'gravity' ? 1 : -1) });
  }
}
