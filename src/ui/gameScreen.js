/** S-102 ゲーム（F-142）。キャリブレーションはプレイ中も実行できる（F-103） */
import { UI, RECOVERY } from '../config/gameConfig.js';

export function createGameScreen(root) {
  const el = root.querySelector('#screen-game');
  const time = el.querySelector('#hud-time');
  const hits = el.querySelector('#hud-hits');
  const tilt = el.querySelector('#hud-tilt');
  const mode = el.querySelector('#hud-mode');
  const pauseBtn = root.querySelector('#btn-pause');
  const calBtn = el.querySelector('#btn-calibrate');
  const settingsBtn = el.querySelector('#btn-game-settings');
  const orientWarn = el.querySelector('#orient-warn');
  const hpBar = root.querySelector('#hp-bar');
  const timeBar = root.querySelector('#time-bar');
  const hpBlock = root.querySelector('#hp-meter-block');
  const damageText = root.querySelector('#hud-damage');
  let damageUntil = 0;
  let recoveryUntil = 0;

  return {
    show() { el.hidden = false; },
    hide() { el.hidden = true; },
    setHud(v) {
      time.textContent = (v.timeMs / 1000).toFixed(1);
      hits.textContent = String(v.wallHits);
      tilt.textContent = v.tiltMagnitude.toFixed(2);
      mode.textContent = v.mode === 'tilt' ? '傾き' : '擬似';
      calBtn.disabled = v.mode !== 'tilt';
      root.querySelector('#btn-pause-calibrate').hidden = v.mode !== 'tilt';
      if (v.now >= recoveryUntil) root.querySelector('#recovery-feedback').textContent = '';
      el.querySelector('#game-status').textContent = v.paused ? '一時停止中。再開ボタンで続けます。'
        : v.preparing ? '準備ができたら、3・2・1でスタート！'
        : !v.started ? '動き出すとタイム計測が始まります。' : '';
      if (v.hp) {
        hpBar.value = v.hp.ratio;
        hpBar.setAttribute('aria-valuetext', `${Math.ceil(Math.max(0, v.hp.value))} / ${Math.ceil(v.hp.max)}`);
        root.querySelector('#hud-hp').textContent = `${Math.ceil(Math.max(0, v.hp.value))} / ${Math.ceil(v.hp.max)}`;
        timeBar.value = v.remainingSec / v.limitSec;
        timeBar.setAttribute('aria-valuetext', `${v.remainingSec.toFixed(1)} 秒`);
        root.querySelector('#hud-remaining').textContent = v.remainingSec.toFixed(1);
        root.querySelector('#time-meter-block').classList.toggle('urgent', timeBar.value <= UI.urgentTimeRatio);
        hpBlock.classList.toggle('urgent', v.hp.ratio <= UI.lowHpRatio);
      }
      if (v.now >= damageUntil) {
        hpBlock.classList.remove('damaged');
        damageText.textContent = '';
      }
    },
    setStage({ challenge, stageIndex, continuesLeft }) {
      root.querySelector('#play-mode-label').textContent = challenge ? 'CHALLENGE' : 'PRACTICE';
      root.querySelector('#hud-stage').textContent = `${stageIndex}面目`;
      root.querySelector('#hud-continues').textContent = `コンティニュー 残り${continuesLeft}回`;
      el.querySelector('#btn-game-exit').textContent = challenge ? 'ランを終えて結果を見る' : 'モード選択へ戻る';
      el.querySelector('#material-legend').hidden = !challenge;
      el.querySelector('#material-legend').open = false;
      hpBlock.classList.remove('damaged');
      damageText.textContent = '';
      damageUntil = 0;
    },
    showDamage(amount, now) {
      damageUntil = now + UI.damageFeedbackMs;
      damageText.textContent = `−${Math.ceil(amount)}`;
      hpBlock.classList.add('damaged');
    },
    showRecovery(amount, now) {
      recoveryUntil = now + RECOVERY.feedbackMs;
      root.querySelector('#recovery-feedback').textContent = `HP +${Number(amount.toFixed(1))}`;
    },
    setPaused(paused) { pauseBtn.textContent = paused ? '▶ 再開' : 'Ⅱ ポーズ'; },
    setOrientationWarning(show) { orientWarn.hidden = !show; },
    onPause(cb) { pauseBtn.addEventListener('click', cb); },
    onCalibrate(cb) { calBtn.addEventListener('click', cb); },
    onSettings(cb) { settingsBtn.addEventListener('click', cb); },
  };
}
