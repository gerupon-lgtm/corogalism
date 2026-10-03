/**
 * 物理パラメータの層構造の解決（F-114）。docs/physics.md が契約。
 *
 *   実効値 = 基準値 × キャラの係数 × 素材の係数 × ゾーンの係数
 *
 * 係数の既定はすべて 1.0。修飾子が無ければ基準値どおりに動く。
 * 本編・以前の調整では積をクランプする。policy.unrestrictedの検証では丸めない。
 *
 * 純粋関数。物理コードはこの戻り値だけを見る。
 */
import { CLAMP } from '../config/gameConfig.js';

const NEUTRAL = { frictionK: 1, restitutionK: 1, accelK: 1, forceX: 0, forceY: 0 };

function clamp(v, range) {
  return Math.min(range.max, Math.max(range.min, v));
}

export function resolveParams({ base, character, material, zone, impactSpeed, policy } = {}) {
  if (!base) throw new Error('resolveParams: base は必須');
  const ch = { ...NEUTRAL, ...(character || {}) };
  const mt = { ...NEUTRAL, ...(material || {}) };
  const zn = { ...NEUTRAL, ...(zone || {}) };
  const unrestricted = policy?.unrestricted === true;
  const fieldK = Number.isFinite(ch.fieldK) ? unrestricted ? ch.fieldK : clamp(ch.fieldK, CLAMP.fieldResponse) : 1;
  let bounceK = 1;
  if (policy?.settleBounce !== false && Number.isFinite(impactSpeed) && Number.isFinite(ch.bounce?.stopSpeed) && Number.isFinite(ch.bounce?.fullSpeed)) {
    const stop = clamp(ch.bounce.stopSpeed, { min: CLAMP.bounceSpeed.min, max: CLAMP.bounceSpeed.max - CLAMP.bounceSpeed.min });
    const full = Math.max(stop + CLAMP.bounceSpeed.min, clamp(ch.bounce.fullSpeed, CLAMP.bounceSpeed));
    const t = Math.min(1, Math.max(0, (impactSpeed - stop) / (full - stop)));
    bounceK = t * t * (3 - 2 * t);
  }

  // 検証では積のまま返す。扱いやすさを検証前に決めず、本編の既定とは分離する。
  if (unrestricted) return {
    accel: base.tiltSensitivity * ch.accelK * mt.accelK * zn.accelK,
    friction: base.friction * ch.frictionK * mt.frictionK * zn.frictionK,
    restitution: base.wallRestitution * ch.restitutionK * mt.restitutionK * zn.restitutionK * bounceK,
    forceX: zn.forceX * fieldK,
    forceY: zn.forceY * fieldK,
  };

  return {
    accel: clamp(base.tiltSensitivity * ch.accelK * mt.accelK * zn.accelK, CLAMP.accel),
    friction: clamp(base.friction * ch.frictionK * mt.frictionK * zn.frictionK, CLAMP.friction),
    restitution: clamp(
      base.wallRestitution * ch.restitutionK * mt.restitutionK * zn.restitutionK,
      Number.isFinite(ch.restitutionLimit)
        ? { min: CLAMP.characterRestitution.min, max: clamp(ch.restitutionLimit, CLAMP.characterRestitution) }
        : mt.id === 'rubber' ? CLAMP.rubberRestitution : CLAMP.restitution
    ) * bounceK,
    forceX: zn.forceX * fieldK,
    forceY: zn.forceY * fieldK,
  };
}
