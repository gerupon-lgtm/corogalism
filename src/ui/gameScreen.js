/** S-102 ゲーム（F-142）。キャリブレーションはプレイ中も実行できる（F-103） */
export function createGameScreen(root) {
  const el = root.querySelector('#screen-game');
  const time = el.querySelector('#hud-time');
  const hits = el.querySelector('#hud-hits');
  const tilt = el.querySelector('#hud-tilt');
  const mode = el.querySelector('#hud-mode');
  const pauseBtn = el.querySelector('#btn-pause');
  const calBtn = el.querySelector('#btn-calibrate');
  const settingsBtn = el.querySelector('#btn-game-settings');
  const orientWarn = el.querySelector('#orient-warn');

  return {
    show() { el.hidden = false; },
    hide() { el.hidden = true; },
    setHud(v) {
      time.textContent = (v.timeMs / 1000).toFixed(1);
      hits.textContent = String(v.wallHits);
      tilt.textContent = v.tiltMagnitude.toFixed(2);
      mode.textContent = v.mode === 'tilt' ? '傾き' : '擬似';
    },
    setPaused(paused) { pauseBtn.textContent = paused ? '再開' : '一時停止'; },
    setOrientationWarning(show) { orientWarn.hidden = !show; },
    onPause(cb) { pauseBtn.addEventListener('click', cb); },
    onCalibrate(cb) { calBtn.addEventListener('click', cb); },
    onSettings(cb) { settingsBtn.addEventListener('click', cb); },
  };
}
