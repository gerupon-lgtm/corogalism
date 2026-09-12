/**
 * 壁素材の表示契約。
 * CanvasとDOM凡例が同じ名前・色を参照できるよう、描画処理から分離しておく。
 */
export const WALL_MATERIAL_APPEARANCE = Object.freeze({
  default: Object.freeze({
    label: '標準',
    fill: '#B9BCB0',
    edge: '#F1E7D1',
    pattern: '#69736A',
    motif: 'dash',
  }),
  rubber: Object.freeze({
    label: 'ゴム',
    fill: '#27C2D1',
    edge: '#BFF8FC',
    pattern: '#087985',
    motif: 'bubble',
  }),
  stone: Object.freeze({
    label: '石',
    fill: '#BB9A75',
    edge: '#EBD0A7',
    pattern: '#69513D',
    motif: 'masonry',
  }),
  spike: Object.freeze({
    label: '棘',
    fill: '#D94B45',
    edge: '#FFD3C7',
    pattern: '#4A1414',
    motif: 'zigzag',
  }),
  moss: Object.freeze({
    label: '苔',
    fill: '#4F9D69',
    edge: '#C7EDB5',
    pattern: '#173F2A',
    motif: 'speckle',
  }),
});

export function getWallMaterialAppearance(materialId) {
  return WALL_MATERIAL_APPEARANCE[materialId] || WALL_MATERIAL_APPEARANCE.default;
}
