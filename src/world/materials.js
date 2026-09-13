/**
 * 素材定義。
 *
 * 床は frictionK / accelK が、壁は restitutionK / damageK が主に効く。
 * 同じテーブルに置き、使われ方で決まる。
 * 素材を足す作業はデータの追加だけで済む（物理コードは触らない。docs/physics.md）。
 */
export const MATERIALS = {
  //                        摩擦   反発   加速   ダメージ
  default: { id: 'default', frictionK: 1.0, restitutionK: 1.0, accelK: 1.0, damageK: 1.0 },
  // 壁の素材（フェーズ2）。反発とダメージを別々に振ることで、壁そのものがギミックになる
  rubber:  { id: 'rubber',  frictionK: 1.0, restitutionK: 2.6, accelK: 1.0, damageK: 0.0 }, // よく跳ねるが痛くない
  stone:   { id: 'stone',   frictionK: 1.0, restitutionK: 0.7, accelK: 1.0, damageK: 1.4 }, // 跳ねないが痛い
  spike:   { id: 'spike',   frictionK: 1.0, restitutionK: 1.2, accelK: 1.0, damageK: 2.0 }, // 跳ねて痛い
  moss:    { id: 'moss',    frictionK: 1.0, restitutionK: 0.5, accelK: 1.0, damageK: 0.2 }, // 安全地帯
};

export function getMaterial(id) {
  return MATERIALS[id] || MATERIALS.default;
}
