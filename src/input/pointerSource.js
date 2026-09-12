/**
 * 擬似傾き入力（F-104）。
 *
 * 盤面の中心から、押した位置へ向かうベクトルを傾きとして扱う。
 * 押している間だけ有効（離すと0に戻る）。PC・センサー非搭載端末・
 * iOSで許可を拒否した場合の受け皿。
 */
export function createPointerSource(element) {
  let active = false;
  let onVector = null;
  let pointerId = null;

  function toVector(ev) {
    const rect = element.getBoundingClientRect();
    const half = rect.width / 2;
    if (half <= 0) return;
    let x = (ev.clientX - rect.left - half) / half;
    let y = (ev.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    if (onVector) onVector(x, y);
  }

  function down(ev) {
    active = true;
    pointerId = ev.pointerId;
    try { element.setPointerCapture(ev.pointerId); } catch { /* 非対応環境は無視 */ }
    toVector(ev);
    ev.preventDefault();
  }
  function move(ev) {
    if (active && (pointerId === null || ev.pointerId === pointerId)) toVector(ev);
  }
  function up() {
    active = false;
    pointerId = null;
    if (onVector) onVector(0, 0);
  }

  return {
    start(vectorCallback) {
      onVector = vectorCallback;
      element.addEventListener('pointerdown', down);
      element.addEventListener('pointermove', move);
      element.addEventListener('pointerup', up);
      element.addEventListener('pointercancel', up);
      element.addEventListener('pointerleave', up);
    },
    stop() {
      if (pointerId !== null) {
        try { element.releasePointerCapture(pointerId); } catch { /* capture解除済み */ }
      }
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      element.removeEventListener('pointerleave', up);
      up();
      onVector = null;
    },
    get active() { return active; },
  };
}
