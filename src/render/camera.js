/**
 * カメラ抽象（F-124）。
 *
 * フェーズ1は「1画面完結・カメラ固定」の実装のみ。ただしカメラを固定値として
 * コードに埋め込まず、差し替え可能な形にしておく（フェーズ4でカメラ追従に対応する）。
 *
 * cellSize の計算はここに閉じ込める。描画コードが直接計算しないこと。
 */
export function createFixedCamera(stage, viewportPx) {
  const size = stage.maze.size;
  const cellSizePx = viewportPx / size;

  return {
    kind: 'fixed',
    cellSizePx,
    viewportPx,
    /** マス座標 → 画面座標（px） */
    toScreen(x, y) {
      return { px: x * cellSizePx, py: y * cellSizePx };
    },
    /** 画面座標（px） → マス座標 */
    toCells(px, py) {
      return { x: px / cellSizePx, y: py / cellSizePx };
    },
    /** マス単位の長さ → px */
    toPx(lengthInCells) {
      return lengthInCells * cellSizePx;
    },
    visibleBounds: { x0: 0, y0: 0, x1: size, y1: size },
  };
}
