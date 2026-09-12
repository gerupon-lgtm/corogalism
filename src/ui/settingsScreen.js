/** S-104 設定（F-144）。最大傾き角は端末別の定数ではなくユーザー設定項目 */
export function createSettingsScreen(root) {
  const el = root.querySelector('#screen-settings');
  const modeTilt = el.querySelector('#set-mode-tilt');
  const modePointer = el.querySelector('#set-mode-pointer');
  const angle = el.querySelector('#set-angle');
  const angleOut = el.querySelector('#set-angle-value');
  const calBtn = el.querySelector('#btn-settings-calibrate');
  const closeBtn = el.querySelector('#btn-settings-close');
  const note = el.querySelector('#settings-note');

  function paintMode(mode) {
    modeTilt.setAttribute('aria-pressed', String(mode === 'tilt'));
    modePointer.setAttribute('aria-pressed', String(mode === 'pointer'));
  }

  return {
    show() { el.hidden = false; },
    hide() { el.hidden = true; },
    setTiltAvailable(available, reason) {
      modeTilt.disabled = !available;
      note.textContent = available ? '' : reason || '';
    },
    render(settings) {
      paintMode(settings.mode);
      angle.value = String(settings.maxTiltAngleDeg);
      angleOut.textContent = `${settings.maxTiltAngleDeg}°`;
      for (const [id, key] of [['bgm', 'bgmVolume'], ['se', 'seVolume']]) {
        el.querySelector(`#set-${id}-volume`).value = String(Math.round(settings[key] * 100));
        el.querySelector(`#set-${id}-value`).textContent = `${Math.round(settings[key] * 100)}%`;
      }
    },
    onModeChange(cb) {
      modeTilt.addEventListener('click', () => cb('tilt'));
      modePointer.addEventListener('click', () => cb('pointer'));
    },
    onAngleChange(cb) {
      angle.addEventListener('input', () => {
        const v = Number(angle.value);
        angleOut.textContent = `${v}°`;
        cb(v);
      });
    },
    onCalibrate(cb) { calBtn.addEventListener('click', cb); },
    onVolumeChange(cb) {
      for (const [id, key] of [['bgm', 'bgmVolume'], ['se', 'seVolume']]) {
        el.querySelector(`#set-${id}-volume`).addEventListener('input', (event) => {
          el.querySelector(`#set-${id}-value`).textContent = `${event.target.value}%`;
          cb(key, Number(event.target.value) / 100);
        });
      }
    },
    onClose(cb) { closeBtn.addEventListener('click', cb); },
  };
}
