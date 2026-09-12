/**
 * 1面（ステージ）。迷路から壁の矩形と床の素材配置を導出する。
 *
 * 座標はすべてマス（セル）単位。ピクセルへの変換は render/camera.js だけが行う。
 */
import { TUNING } from '../config/gameConfig.js';
import { getMaterial } from './materials.js';

const NEUTRAL_ZONE = { id: 'none', frictionK: 1, restitutionK: 1, accelK: 1, forceX: 0, forceY: 0 };

/** 迷路から壁の矩形配列を作る。壁は円×矩形の衝突解決で使う（セル単位のクランプにしない） */
export function buildWalls(maze, wallThickness = TUNING.wallThickness) {
  const { size, cells } = maze;
  const wt = wallThickness;
  const walls = [];
  const add = (x, y, w, h) => walls.push({ x, y, w, h, materialId: 'default' });

  for (let i = 0; i < size * size; i++) {
    const cx = i % size;
    const cy = (i - cx) / size;
    const c = cells[i];
    if (c.t) add(cx - wt / 2, cy - wt / 2, 1 + wt, wt);
    if (c.l) add(cx - wt / 2, cy - wt / 2, wt, 1 + wt);
    if (cx === size - 1 && c.r) add(cx + 1 - wt / 2, cy - wt / 2, wt, 1 + wt);
    if (cy === size - 1 && c.b) add(cx - wt / 2, cy + 1 - wt / 2, 1 + wt, wt);
  }
  return walls;
}

export function createStage(maze) {
  return {
    maze,
    floors: new Array(maze.size * maze.size).fill('default'),
    walls: buildWalls(maze),
    zones: [], // フェーズ1では常に空
    wallThickness: TUNING.wallThickness,
  };
}

/**
 * ボールが乗っている床の素材を返す。
 *
 * ボールは複数のマスにまたがり得るため「どのマスか」は一意に決まらない。
 * フェーズ1は「中心のあるマス」方式で実装している（docs/physics.md §7 の案A）。
 * フェーズ2で氷と砂の境目の手触りを見てから、重なり面積の加重平均（案B）へ
 * 移す場合は、この関数の中身だけを差し替えればよい。
 * 呼び出し側に「どのマスか」を知らせないことが重要。
 */
export function sampleMaterial(stage, actor) {
  const { size } = stage.maze;
  const cx = Math.min(size - 1, Math.max(0, Math.floor(actor.x)));
  const cy = Math.min(size - 1, Math.max(0, Math.floor(actor.y)));
  return getMaterial(stage.floors[cy * size + cx]);
}

/** ボールが入っているゾーン（重力・ギミック）を返す。フェーズ1では常に中立値 */
export function sampleZone(stage, actor) {
  if (!stage.zones.length) return NEUTRAL_ZONE;
  const cx = Math.floor(actor.x);
  const cy = Math.floor(actor.y);
  for (const z of stage.zones) {
    if (z.cells.some((c) => c.x === cx && c.y === cy)) return z;
  }
  return NEUTRAL_ZONE;
}

/** ゴールの中心（マス単位） */
export function goalCenter(maze) {
  return { x: maze.goal.x + 0.5, y: maze.goal.y + 0.5 };
}

/** スタート位置に置いたアクターを作る */
export function createActor(maze, character) {
  return {
    character,
    x: maze.start.x + 0.5,
    y: maze.start.y + 0.5,
    vx: 0,
    vy: 0,
    r: character.sizeRatio / 2,
  };
}
