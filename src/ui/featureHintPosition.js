/** 上端でヒントを押し下げて球に重ねず、空いている側を選ぶ。 */
export function featureHintPosition({ x, y, radius, width, height, boardWidth, boardHeight, gap = 6, padding = 4 }) {
  const left = Math.max(padding, Math.min(boardWidth - width - padding, x - width / 2));
  const above = y - radius - height - gap;
  if (above >= padding) return { left, top: above };
  const below = y + radius + gap;
  if (below + height <= boardHeight - padding) return { left, top: below };
  // 大きな文字などで上下に置けない場合は、左右の空きを使う。
  const side = x + radius + gap;
  return { left: side + width <= boardWidth - padding ? side : Math.max(padding,x-radius-gap-width),
    top: Math.max(padding, Math.min(boardHeight-height-padding,y-height/2)) };
}
