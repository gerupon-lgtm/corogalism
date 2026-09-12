/**
 * 転がり物理の積分（F-111, F-113）。すべてマス単位。
 *
 * 順序: パラメータ解決 → 力の集約 → 加速 → 減衰 → 速度上限 →
 *       サブステップ分割 → 位置更新 → 衝突解決 → 盤内クランプ
 *
 * 力は fx/fy に集約する。tilt から直接 vx に足し込まないこと
 * （傾き以外の力を足すときに1行では済まなくなる）。
 */
import { TUNING } from '../config/gameConfig.js';
import { resolveParams } from './resolveParams.js';
import { resolveCollisions } from './collision.js';
import { sampleMaterial, sampleZone } from '../world/stage.js';
import { getMaterial } from '../world/materials.js';

export function stepPhysics({ actor, stage, tilt, base, dt, onImpact }) {
  const step = Math.min(dt, TUNING.maxDt);
  if (step <= 0) return { wallHits: 0, params: null };

  const material = sampleMaterial(stage, actor);
  const zone = sampleZone(stage, actor);
  const p = resolveParams({ base, character: actor.character, material, zone });

  // 力の集約（マス/s²）
  const fx = tilt.x * p.accel + p.forceX;
  const fy = tilt.y * p.accel + p.forceY;

  actor.vx += fx * step;
  actor.vy += fy * step;

  const damp = Math.exp(-p.friction * step);
  actor.vx *= damp;
  actor.vy *= damp;

  const speed = Math.hypot(actor.vx, actor.vy);
  if (speed > TUNING.maxSpeed) {
    const k = TUNING.maxSpeed / speed;
    actor.vx *= k;
    actor.vy *= k;
  }

  // 壁ごとの反発は、その壁の素材とキャラから解決する
  const restitutionOf = (wall) =>
    resolveParams({
      base,
      character: actor.character,
      material: getMaterial(wall.materialId),
      zone,
    }).restitution;

  const sub = Math.max(1, Math.ceil((Math.hypot(actor.vx, actor.vy) * step) / (actor.r * 0.6)));
  let wallHits = 0;
  for (let s = 0; s < sub; s++) {
    actor.x += (actor.vx * step) / sub;
    actor.y += (actor.vy * step) / sub;
    wallHits += resolveCollisions(actor, stage.walls, restitutionOf, onImpact);
  }

  const size = stage.maze.size;
  actor.x = Math.min(size - actor.r, Math.max(actor.r, actor.x));
  actor.y = Math.min(size - actor.r, Math.max(actor.r, actor.y));

  return { wallHits, params: p };
}
