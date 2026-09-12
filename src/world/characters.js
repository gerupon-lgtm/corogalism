/**
 * キャラクター定義。フェーズ1では1体のみ。
 *
 * sizeRatio は係数ではなくキャラ側の絶対値（セルに対する直径の比）。
 * 0.55 はフェーズ1の初期値であって固定値ではない。キャラによって変わる前提。
 * 1マスの通路の実効幅は「1セル − 壁の厚み」なので、sizeRatio を上げると
 * 通路の遊びが急に減る（0.55で0.35セル、0.70で0.20セル）。難易度の軸になる。
 */
export const CHARACTERS = {
  default: {
    id: 'default',
    name: 'ビー玉',
    sizeRatio: 0.55,
    frictionK: 1.0,
    restitutionK: 1.0,
    accelK: 1.0,
  },
};

export function getCharacter(id) {
  return CHARACTERS[id] || CHARACTERS.default;
}
