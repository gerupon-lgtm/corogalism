/**
 * 傾きベクトル（F-105, F-107）。
 *
 * 傾きモードと擬似傾きモードの共通の出口。ゲーム本体は入力の出所を知らない。
 * 値は {x, y}、大きさは常に1以下に正規化される。
 */
export function createTiltVector() {
  const raw = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };

  function setRaw(x, y) {
    let nx = Number.isFinite(x) ? x : 0;
    let ny = Number.isFinite(y) ? y : 0;
    const m = Math.hypot(nx, ny);
    if (m > 1) { nx /= m; ny /= m; }
    raw.x = nx;
    raw.y = ny;
  }

  return {
    setRaw,
    /** smoothing: 0で平滑化なし、1に近づくほど鈍い */
    update(dt, smoothing) {
      const k = smoothing > 0 ? 1 - Math.pow(smoothing, Math.max(dt, 0) * 60) : 1;
      cur.x += (raw.x - cur.x) * k;
      cur.y += (raw.y - cur.y) * k;
    },
    reset() {
      raw.x = raw.y = 0;
      cur.x = cur.y = 0;
    },
    get value() { return cur; },
    get rawValue() { return raw; },
    get magnitude() { return Math.hypot(cur.x, cur.y); },
  };
}
