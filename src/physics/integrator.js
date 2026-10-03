/**
 * 転がり物理の積分（F-111, F-113）。すべてマス単位。
 *
 * 本編の順序: パラメータ解決 → 力の集約 → 加速 → 減衰 → 速度上限 →
 *       サブステップ分割 → 位置更新 → 衝突解決 → 盤内クランプ
 * 制限を外す検証は速度上限を使わず、反発後の速さで移動刻みを作り直す。
 *
 * 力は fx/fy に集約する。tilt から直接 vx に足し込まないこと
 * （傾き以外の力を足すときに1行では済まなくなる）。
 */
import { TUNING, LAB_EXPLORATION } from '../config/gameConfig.js';
import { resolveParams } from './resolveParams.js';
import { resolveCollisions } from './collision.js';
import { sampleMaterial, sampleZone } from '../world/stage.js';
import { getMaterial } from '../world/materials.js';

export function stepPhysics({ actor, stage, tilt, base, dt, onImpact, onTravel }) {
  const step = Math.min(dt, TUNING.maxDt);
  if (step <= 0) return { wallHits: 0, params: null };

  const material = sampleMaterial(stage, actor);
  const zone = sampleZone(stage, actor);
  const policy = stage.physicsPolicy;
  const p = resolveParams({ base, character: actor.character, material, zone, policy });
  if (policy?.unrestricted) return stepExploration({actor, stage, tilt, base, step, zone, p, onImpact, onTravel});

  // 力の集約（マス/s²）
  const fx = tilt.x * p.accel + p.forceX;
  const fy = tilt.y * p.accel + p.forceY;

  actor.vx += fx * step;
  actor.vy += fy * step;

  const damp = Math.exp(-p.friction * step);
  actor.vx *= damp;
  actor.vy *= damp;

  const speed = Math.hypot(actor.vx, actor.vy);
  const maxSpeed=Number.isFinite(actor.character?.maxSpeed)?Math.min(TUNING.maxSpeed,Math.max(TUNING.characterMinSpeed,actor.character.maxSpeed)):TUNING.maxSpeed;
  if (speed > maxSpeed) {
    const k = maxSpeed / speed;
    actor.vx *= k;
    actor.vy *= k;
  }

  // 壁ごとの反発は、その壁の素材とキャラから解決する
  const restitutionOf = (wall, impactSpeed) =>
    resolveParams({
      base,
      character: actor.character,
      material: {...getMaterial(wall.materialId),...wall.physicsMaterial},
      zone,
      impactSpeed,
      policy,
    }).restitution;

  const sub = Math.max(1, Math.ceil((Math.hypot(actor.vx, actor.vy) * step) / (actor.r * 0.6)));
  let wallHits = 0;
  for (let s = 0; s < sub; s++) {
    const from = onTravel ? {x: actor.x, y: actor.y} : null;
    actor.x += (actor.vx * step) / sub;
    actor.y += (actor.vy * step) / sub;
    wallHits += resolveCollisions(actor, stage.walls, restitutionOf, onImpact);
    onTravel?.(from, {x: actor.x, y: actor.y});
  }

  const size = stage.maze.size;
  actor.x = Math.min(size - actor.r, Math.max(actor.r, actor.x));
  actor.y = Math.min(size - actor.r, Math.max(actor.r, actor.y));

  return { wallHits, params: p };
}

/** 制限を外した検証。反発による加速のたびに移動刻みを再計算し、壁抜けを防ぐ。 */
function stepExploration({actor, stage, tilt, base, step, zone, p, onImpact, onTravel}) {
  let wallHits = 0, steps = 0, remaining = step;
  const snapshot = () => ({x: actor.x, y: actor.y, vx: actor.vx, vy: actor.vy});
  const finite = () => [actor.x, actor.y, actor.vx, actor.vy].every(Number.isFinite);
  const stop = reason => ({wallHits, params: p, halt: {reason, steps, remainingSec: remaining, speed: Math.hypot(actor.vx, actor.vy)}});
  const before = snapshot();
  if (!finite() || ![p.accel,p.friction,p.forceX,p.forceY].every(Number.isFinite)) return stop('nonfinite');
  actor.vx += (tilt.x * p.accel + p.forceX) * step;
  actor.vy += (tilt.y * p.accel + p.forceY) * step;
  const damp = Math.exp(-p.friction * step);
  actor.vx *= damp; actor.vy *= damp;
  if (!finite()) {Object.assign(actor,before); return stop('nonfinite');}
  const restitutionOf = (wall, impactSpeed) => resolveParams({base,character:actor.character,material:{...getMaterial(wall.materialId),...wall.physicsMaterial},zone,impactSpeed,policy:stage.physicsPolicy}).restitution;
  while (remaining > 0) {
    if (steps >= LAB_EXPLORATION.maxSubsteps) return stop('workload');
    const speed = Math.hypot(actor.vx,actor.vy);
    if (!Number.isFinite(speed)) return stop('nonfinite');
    const slice = speed > 0 ? Math.min(remaining, actor.r * .6 / speed) : remaining;
    if (!(slice > 0) || remaining - slice === remaining) return stop('precision');
    const from = snapshot();
    actor.x += actor.vx * slice; actor.y += actor.vy * slice;
    wallHits += resolveCollisions(actor,stage.walls,restitutionOf,onImpact);
    if (!finite()) {Object.assign(actor,from); return stop('nonfinite');}
    onTravel?.({x:from.x,y:from.y},{x:actor.x,y:actor.y});
    remaining = Math.max(0,remaining-slice); steps++;
  }
  const size = stage.maze.size;
  actor.x = Math.min(size-actor.r,Math.max(actor.r,actor.x));
  actor.y = Math.min(size-actor.r,Math.max(actor.r,actor.y));
  return {wallHits,params:p};
}
