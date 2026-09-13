/** とりもち中だけタップを解釈。通常の傾き操作と二重計上しない。 */
import { STICKY } from '../config/gameConfig.js';
export function createEscapeInput(board, active, assist) {
  let first = null, down = null, lastAssist = -Infinity, touchAt = -Infinity;
  let motionAt = -Infinity, previous = null, armed = true, pending = null;
  const now = () => performance.now();
  function help(fromMotion = false) {
    // 画面タップは2回で1組に分けているため、組の間を間引かない。
    if (!active() || (fromMotion && now()-lastAssist < STICKY.motionAssistCooldownMs)) return;
    lastAssist = now(); assist();
  }
  function reset() { first = null; down = null; previous = null; armed = true; clearTimeout(pending); }
  board.addEventListener('pointerdown', e => {
    touchAt = now(); clearTimeout(pending);
    if (!active() || !e.isPrimary || e.button !== 0) { first = null; return; }
    down = { id:e.pointerId, x:e.clientX, y:e.clientY, at:now() };
  }, true);
  window.addEventListener('pointerup', e => {
    if (!down || down.id !== e.pointerId) return;
    const point = down; down = null;
    if (!active() || now()-point.at > STICKY.tapHoldMs || Math.hypot(e.clientX-point.x,e.clientY-point.y)>STICKY.tapTravelPx) { first=null; return; }
    const stamp = now();
    if (first && stamp-first.at >= STICKY.tapMinMs && stamp-first.at <= STICKY.tapMaxMs) { help(); first=null; }
    else first = { ...point, at:stamp };
  });
  window.addEventListener('pointercancel', reset);
  window.addEventListener('devicemotion', e => {
    const stamp = now(), a = e.accelerationIncludingGravity;
    if (!a || ![a.x,a.y,a.z].every(Number.isFinite)) return;
    const gap = stamp-motionAt; motionAt = stamp;
    if (!active()) { previous = null; armed = true; return; }
    const magnitude = previous && gap <= STICKY.motionGapMs ? Math.hypot(a.x-previous.x,a.y-previous.y,a.z-previous.z) : 0;
    previous = {x:a.x,y:a.y,z:a.z};
    if (magnitude < STICKY.motionReset) armed = true;
    if (armed && magnitude > STICKY.motionThreshold && stamp-touchAt > STICKY.touchSuppressMs) {
      armed = false; clearTimeout(pending);
      // 同じ動作から遅れて届く画面タップを先に検知して、二重計上を避ける。
      pending = setTimeout(() => { if (now()-touchAt > STICKY.touchSuppressMs) help(true); }, STICKY.tapMinMs);
    }
  });
  return {
    reset,
    get motionAvailable() { return now()-motionAt < STICKY.motionGapMs*2; },
    async requestPermission() {
      try { if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') await DeviceMotionEvent.requestPermission(); }
      catch { /* 拒否・未対応でも画面ダブルタップと自然脱出を維持。 */ }
    },
  };
}
