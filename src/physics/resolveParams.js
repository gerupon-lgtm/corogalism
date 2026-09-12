/**
 * 物理パラメータの層構造の解決（F-114）。docs/physics.md が契約。
 *
 *   実効値 = 基準値 × キャラの係数 × 素材の係数 × ゾーンの係数 → クランプ
 *
 * 係数の既定はすべて 1.0。修飾子が無ければ基準値どおりに動く。
 * クランプは個々の係数ではなく実効値に対して行う（掛け合わせで範囲外に出るため）。
 *
 * 純粋関数。物理コードはこの戻り値だけを見る。
 */
import { CLAMP } from '../config/gameConfig.js';

const NEUTRAL = { frictionK: 1, restitutionK: 1, accelK: 1, forceX: 0, forceY: 0 };

function clamp(v, range) {
  return Math.min(range.max, Math.max(range.min, v));
}

export function resolveParams({ base, character, material, zone } = {}) {
  if (!base) throw new Error('resolveParams: base は必須');
  const ch = { ...NEUTRAL, ...(character || {}) };
  const mt = { ...NEUTRAL, ...(material || {}) };
  const zn = { ...NEUTRAL, ...(zone || {}) };

  return {
    accel: clamp(base.tiltSensitivity * ch.accelK * mt.accelK * zn.accelK, CLAMP.accel),
    friction: clamp(base.friction * ch.frictionK * mt.frictionK * zn.frictionK, CLAMP.friction),
    restitution: clamp(
      base.wallRestitution * ch.restitutionK * mt.restitutionK * zn.restitutionK,
      CLAMP.restitution
    ),
    forceX: zn.forceX,
    forceY: zn.forceY,
  };
}
