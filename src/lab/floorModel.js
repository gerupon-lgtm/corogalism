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
  const size = 7;
  const cells = Array.from({ length: size * size }, (_, i) => {
    const x = i % size, y = Math.floor(i / size);
    return { t: +(y === 0), r: +(x === size - 1), b: +(y === size - 1), l: +(x === 0) };
  });
  // 左の直線、下の曲がり角、右の広場。全セルは相互に到達可能。
  for (let y = 0; y < 4; y++) { cells[y * size + 1].r = 1; cells[y * size + 2].l = 1; }
  for (let x = 2; x < 5; x++) { cells[size + x].b = 1; cells[2 * size + x].t = 1; }
  const maze = { size, cells, start: { x: 0, y: 0 }, goal: { x: 5, y: 0 }, seed: 247 };
  if (!checkReachability(maze).ok) throw new Error('おためしコースに到達できない場所があります');
  const stage = createStage(maze);
  return { stage, actor: createActor(maze, CHARACTERS.default) };
}

export const PATCH_CELLS = [
  ...[2, 3].flatMap(y => [0, 1].map(x => ({ x, y }))),
  ...[3, 4, 5].flatMap(y => [3, 4, 5].map(x => ({ x, y }))),
];

export function applyFloor(stage, type, settings) {
  stage.zones = [];
  if (type === 'ice' || type === 'sand') {
    stage.zones.push({ cells: PATCH_CELLS, ...(type === 'ice' ? { kind: 'ice', ...ICE_LAB } : {}), frictionK: settings[type], forceX: 0, forceY: 0 });
  } else if (type === 'gravity' || type === 'repulsion') {
    stage.zones.push({ kind: 'radial', x: 4.5, y: 4.5, radius: settings.radius,
      strength: settings.force * (type === 'gravity' ? 1 : -1) });
  }
}
