/** HPは生存中に0と見せないよう切り上げ。増減表示も同じ整数値の差から作る。 */
export const displayedHp = value => Math.ceil(Math.max(0, value));
export const hpLabel = hp => `${displayedHp(hp.value)} / ${displayedHp(hp.max)}`;

export function damageLabel(before, after) {
  const change = displayedHp(before) - displayedHp(after);
  return change > 0 ? `−${change}` : '微小';
}

export function recoveryLabel(before, after) {
  const change = displayedHp(after) - displayedHp(before);
  return change > 0 ? `HP +${change}` : 'HPを少し回復';
}
