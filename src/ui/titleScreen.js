/** S-101 タイトル。開始ボタンは iOS の requestPermission のユーザー操作起点を兼ねる（F-141） */
export function createTitleScreen(root) {
  const el = root.querySelector('#screen-title');
  const startBtn = el.querySelector('#btn-start');
  const settingsBtn = el.querySelector('#btn-title-settings');
  const note = el.querySelector('#title-note');

  return {
    show() { el.hidden = false; },
    hide() { el.hidden = true; },
    setNote(text) { note.textContent = text || ''; },
    onStart(cb) { startBtn.addEventListener('click', cb); },
    onSettings(cb) { settingsBtn.addEventListener('click', cb); },
  };
}
