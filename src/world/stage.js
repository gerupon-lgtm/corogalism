/**
 * 1面（ステージ）。迷路から壁の矩形と床の素材配置を導出する。
 *
 * 座標はすべてマス（セル）単位。ピクセルへの変換は render/camera.js だけが行う。
 */
import { TUNING } from '../config/gameConfig.js';
import { getMaterial } from './materials.js';
import { createRng } from '../maze/rng.js';
import { assignTheme } from './themes.js';
import { addStageFeatures } from './stageFeatures.js';
import { createRecovery } from './recovery.js';

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

export function createStage(maze, difficulty) {
  const stage = {
    maze,
    floors: new Array(maze.size * maze.size).fill('default'),
    walls: buildWalls(maze),
    zones: [], // フェーズ2でも空（ゾーンはフェーズ3以降）
    wallThickness: TUNING.wallThickness,
  };
  if (difficulty?.themed) assignTheme(stage, difficulty);
  else if (difficulty) assignWallMaterials(stage, difficulty);
  stage.recovery = difficulty ? createRecovery(maze, difficulty.recoveryChance ?? 0) : null;
  addStageFeatures(stage, difficulty);
  return stage;
}

/**
 * 壁に素材を配置する（F-223）。
 *
 * シードから決定的に配置するので、同じ面は常に同じ素材配置になる。
 * 難易度が上がると危険な壁（stone / spike）が増え、安全地帯（moss）が減る。
 * 外周の壁は対象外（盤面の縁が痛いのは理不尽なため）【想定】。
 */
export function assignWallMaterials(stage, difficulty) {
  const { size } = stage.maze;
  const rng = createRng((stage.maze.seed ^ 0x5bf03635) >>> 0);
  const { dangerRatio, spikeShare, mossRatio } = difficulty;

  for (const w of stage.walls) {
    if (isOuterWall(w, size, stage.wallThickness)) { w.materialId = 'default'; continue; }
    const r = rng();
    if (r < dangerRatio) {
      w.materialId = rng() < spikeShare ? 'spike' : 'stone';
    } else if (r < dangerRatio + mossRatio) {
      w.materialId = 'moss';
    } else {
      w.materialId = 'default';
    }
  }
  return stage;
}

function isOuterWall(w, size, wt) {
  const eps = wt;
  return (
    w.y <= -wt / 2 + eps * 0.5 ||
    w.x <= -wt / 2 + eps * 0.5 ||
    w.x + w.w >= size + wt / 2 - eps * 0.5 ||
    w.y + w.h >= size + wt / 2 - eps * 0.5
  );
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
    if (z.kind === 'radial') {
      const dx = z.x - actor.x, dy = z.y - actor.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= z.radius) continue;
      // 中心でも境界でも力は0。中心を横切る際に方向が不連続にならない。
      const scale = z.strength * 4 * (1 - distance / z.radius) / z.radius;
      return { ...NEUTRAL_ZONE, ...z, forceX: dx * scale, forceY: dy * scale };
    }
    if (z.cells.some((c) => c.x === cx && c.y === cy)) {
      if (z.kind === 'ice') {
        // 速度がある間は傾きによる加減速を弱め、静止に近づくほど通常の操作性へ戻す。
        const speed = Math.hypot(actor.vx, actor.vy);
        const accelK = z.minAccelK + (1 - z.minAccelK) / (1 + (speed / z.transitionSpeed) ** 2);
        return { ...z, accelK };
      }
      return z;
    }
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
