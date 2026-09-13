/** S-102 ゲーム（F-142）。キャリブレーションはプレイ中も実行できる（F-103） */
import { UI, RECOVERY, REST } from '../config/gameConfig.js';
import { hpLabel, damageLabel, recoveryLabel } from './hpDisplay.js';

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
        hpBar.setAttribute('aria-valuetext', hpLabel(v.hp));
        root.querySelector('#hud-hp').textContent = hpLabel(v.hp);
        const stock = root.querySelector('#hud-shield');
        if (stock) { stock.textContent = String(Math.ceil(v.shield ?? 0)); stock.parentElement?.setAttribute('aria-label', `葉っぱのまもり ${Math.ceil(v.shield ?? 0)}`); }
        timeBar.value = v.remainingSec / v.limitSec;
        timeBar.setAttribute('aria-valuetext', `${v.remainingSec.toFixed(1)} 秒`);
        root.querySelector('#hud-remaining').textContent = v.remainingSec.toFixed(1);
        root.querySelector('#time-meter-block').classList.toggle('urgent', timeBar.value <= UI.urgentTimeRatio);
        hpBlock.classList.toggle('urgent', v.hp.ratio <= UI.lowHpRatio);
      }
      if (v.now >= damageUntil) {
        hpBlock.classList.remove('damaged');
        damageText.textContent = '';
        damageText.removeAttribute('aria-label');
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
      damageText.removeAttribute('aria-label');
      damageUntil = 0;
    },
    showDamage(before, after, now) {
      damageUntil = now + UI.damageFeedbackMs;
      damageText.textContent = damageLabel(before, after);
      damageText.setAttribute('aria-label', damageText.textContent === '微小' ? '1未満のダメージ。げんきのゲージに反映しています。' : `${damageText.textContent} げんき`);
      hpBlock.classList.add('damaged');
    },
    showRecovery(before, after, now) {
      recoveryUntil = now + RECOVERY.feedbackMs;
      root.querySelector('#recovery-feedback').textContent = recoveryLabel(before, after);
    },
    showFeature(kind, now) {
      recoveryUntil = now + UI.featureFeedbackMs;
      root.querySelector('#recovery-feedback').textContent = { leaf: '葉っぱのまもりが増えた！', guard: '葉っぱが守ってくれた！', rest: `げんき回復！ のこりじかん＋${REST.durationSec}秒` }[kind];
    },
    setFeatureHint(play, camera, visible, motion) {
      const hint = root.querySelector('#feature-hint');
      const resting = play.stage.rest && !play.stage.rest.used && play.stage.rest.progress > 0;
      hint.hidden = !visible || (!play.trap && !resting);
      if (hint.hidden) return;
      const message = play.trap ? `☝ ダブルタップで はやくぬける${motion ? '\nスマホを軽くトントンでもOK' : ''}` : 'ひとやすみ中…';
      if (hint.textContent !== message) hint.textContent = message;
      const at = camera.toScreen(play.actor.x, play.actor.y);
      const board = root.querySelector('#board');
      const width = hint.offsetWidth;
      hint.style.left = `${Math.max(width/2+4,Math.min(board.clientWidth-width/2-4,at.px))}px`;
      hint.style.top = `${Math.max(4, at.py-camera.toPx(play.actor.r)-hint.offsetHeight-6)}px`;
    },
    setPaused(paused) { pauseBtn.textContent = paused ? '▶ 再開' : 'Ⅱ ポーズ'; },
    setOrientationWarning(show) { orientWarn.hidden = !show; },
    onPause(cb) { pauseBtn.addEventListener('click', cb); },
    onCalibrate(cb) { calBtn.addEventListener('click', cb); },
    onSettings(cb) { settingsBtn.addEventListener('click', cb); },
  };
}
