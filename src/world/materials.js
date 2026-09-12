/**
 * 素材定義。フェーズ1では default のみ。
 *
 * フェーズ2で氷（frictionK を下げる）・砂（上げる）・粘着（大きく上げる）などを
 * ここに足す。物理コードは触らない（docs/physics.md）。
 */
export const MATERIALS = {
  default: { id: 'default', frictionK: 1.0, restitutionK: 1.0, accelK: 1.0 },
};

export function getMaterial(id) {
  return MATERIALS[id] || MATERIALS.default;
}
