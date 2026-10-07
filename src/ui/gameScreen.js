/** S-102 ゲーム（F-142）。キャリブレーションはプレイ中も実行できる（F-103） */
import { UI, RECOVERY, REST, STICKY, HOURGLASS } from '../config/gameConfig.js';
import { hpLabel, damageLabel, recoveryLabel } from './hpDisplay.js';
import { restFloors } from '../world/stageFeatures.js';

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
  const noticeRoot = el.querySelector('#play-notices');
  const playHint = root.querySelector('#play-hint');
  const recoveryNotice = root.querySelector('#recovery-feedback');
  const floorNotice = root.querySelector('#floor-contact-hint');
  const featureNotice = root.querySelector('#feature-hint');
  let damageUntil = 0;
  let recoveryUntil = 0;
  let escapeUntil = 0;
  let escapeActor = null;
  let escapeTrap = null;

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
      if (v.tutorial && !v.paused && !v.preparing) el.querySelector('#game-status').textContent = '好きなペースで、ゴールまで。';
      if (v.hp) {
        hpBar.value = v.hp.ratio;
        hpBar.setAttribute('aria-valuetext', hpLabel(v.hp));
        root.querySelector('#hud-hp').textContent = hpLabel(v.hp);
        const stock = root.querySelector('#hud-shield');
        if (stock) { stock.textContent = String(Math.ceil(v.shield ?? 0)); stock.parentElement?.setAttribute('aria-label', `葉っぱのまもり ${Math.ceil(v.shield ?? 0)}`); }
        if (v.limitSec !== null) {
          timeBar.value = v.remainingSec / v.limitSec;
          timeBar.setAttribute('aria-valuetext', `${v.remainingSec.toFixed(1)} 秒`);
          root.querySelector('#hud-remaining').textContent = v.remainingSec.toFixed(1);
          root.querySelector('#time-meter-block').classList.toggle('urgent', timeBar.value <= UI.urgentTimeRatio);
        }
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
      el.querySelector('#btn-game-exit').textContent = challenge ? '終了して結果を見る' : 'モード選択へ戻る';
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
      root.querySelector('#recovery-feedback').textContent = { full: 'げんきはまんたん！', hourglass: `のこりじかん ＋${HOURGLASS.bonusSec}秒！`, leaf: '葉っぱのまもりが増えた！', guard: '葉っぱが守ってくれた！', rest: `げんき回復！ のこりじかん＋${REST.durationSec}秒` }[kind];
    },
    showEscape(play, now) {
      escapeUntil = now + UI.featureFeedbackMs;
      escapeActor = play.actor;
      escapeTrap = play.trap;
    },
    resetNotices() {
      recoveryUntil = 0;
      escapeUntil = 0;
      escapeActor = escapeTrap = null;
      recoveryNotice.textContent = floorNotice.textContent = '';
      for (const notice of [recoveryNotice, floorNotice, featureNotice]) notice.hidden = true;
      noticeRoot.hidden = true;
      playHint.classList.remove('has-play-notice');
    },
    renderNotices({ visible, floorText = '' }) {
      if (floorNotice.textContent !== floorText) floorNotice.textContent = floorText;
      // 脱出などの操作案内、取得／回復、床の説明の順。同じ場所へ重ねない。
      const selected = !visible ? null : !featureNotice.hidden ? featureNotice
        : recoveryNotice.textContent ? recoveryNotice : floorText ? floorNotice : null;
      for (const notice of [recoveryNotice, floorNotice, featureNotice]) notice.hidden = notice !== selected;
      noticeRoot.hidden = !selected;
      playHint.classList.toggle('has-play-notice', Boolean(selected));
    },
    setFeatureHint(play, camera, visible, motion, now = performance.now()) {
      const hint = root.querySelector('#feature-hint');
      const resting = restFloors(play.stage).some(rest=>!rest.used&&rest.progress>0);
      const escaped = escapeActor === play.actor && (!play.trap || play.trap === escapeTrap) && now < escapeUntil;
      hint.hidden = !visible || (!play.trap && !resting && !escaped);
      if (hint.hidden) return;
      hint.classList.toggle('is-success', escaped);
      const message = escaped ? (play.trap ? `${STICKY.shortenSec}秒短縮！` : 'ぬけられた！') : play.trap
        ? motion ? '盤面ダブルタップ／本体を軽くトントンで早く脱出' : '盤面をダブルタップで早く脱出'
        : 'ひとやすみ中…';
      if (hint.textContent !== message) hint.textContent = message;
    },
    setPaused(paused) { pauseBtn.textContent = paused ? '▶ 再開' : 'Ⅱ ポーズ'; },
    setOrientationWarning(show) { orientWarn.hidden = !show; },
    onPause(cb) { pauseBtn.addEventListener('click', cb); },
    onCalibrate(cb) { calBtn.addEventListener('click', cb); },
    onSettings(cb) { settingsBtn.addEventListener('click', cb); },
  };
}
