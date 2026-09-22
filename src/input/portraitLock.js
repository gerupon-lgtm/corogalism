/** 縦向き固定はベストエフォート。全画面は明示操作のときだけ要求する。 */
export function initPortraitLock() {
  const button = document.getElementById('portrait-lock');
  const note = document.getElementById('portrait-note');
  if (!button || !note) return;
  const orientation = window.screen?.orientation;
  const fallback = '固定できない場合は、端末の自動回転をOFF（縦向きロック）にしてください。傾き操作はそのまま使えます。';
  let busy = false;
  async function lock() {
    if (typeof orientation?.lock !== 'function') return false;
    try { await orientation.lock('portrait-primary'); return true; }
    catch { return false; }
  }
  async function request(fullscreen) {
    if (busy) return;
    busy = true; button.disabled = true;
    try {
      // PWAなど全画面なしで許される環境はここで固定する。
      if (!fullscreen) {
        note.textContent = await lock() ? '縦向きに固定しました。' : fallback;
        return;
      }
      if (typeof orientation?.lock !== 'function') { note.textContent = fallback; return; }
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        try { await document.documentElement.requestFullscreen(); }
        catch { /* 全画面が拒否されても固定だけは試す */ }
      }
      note.textContent = await lock() ? '縦向きに固定しました。全画面は端末の戻る操作などで解除できます。' : fallback;
    } finally { busy = false; button.disabled = false; }
  }
  button.addEventListener('click', () => { void request(true); });
  document.addEventListener('fullscreenchange', () => {
    if (busy) return;
    if (document.fullscreenElement) void request(false);
    else note.textContent = '全画面を解除しました。' + fallback;
  });
  void request(false);
}
