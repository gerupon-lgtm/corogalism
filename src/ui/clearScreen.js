/** S-103 クリア（F-143） */
import { hpLabel } from './hpDisplay.js';
export function createClearScreen(root) {
  const el = root.querySelector('#screen-clear');
  const time = el.querySelector('#clear-time');
  const best = el.querySelector('#clear-best');
  const seed = el.querySelector('#clear-seed');
  const badge = el.querySelector('#clear-badge');
  const retryBtn = el.querySelector('#btn-retry');
  const nextBtn = el.querySelector('#btn-next');

  return {
    show() { el.hidden = false; },
    hide() { el.hidden = true; },
    setResult(v) {
      const challenge = v.gameMode === 'challenge';
      el.querySelector('#clear-heading').textContent = 'クリア！';
      el.querySelector('#clear-best-field').hidden = challenge;
      el.querySelector('#clear-hp-field').hidden = !challenge;
      el.querySelector('#clear-hp').textContent = challenge ? hpLabel(v.hp) : '—';
      el.querySelector('#clear-note').textContent = challenge
        ? `${v.stageIndex}面目${v.noDamage ? ' · ノーダメージ！' : ' · お見事！'}`
        : 'ゴールに到着！';
      el.querySelector('#btn-clear-exit').textContent = challenge ? '結果を見る' : 'モード選択へ';
      retryBtn.hidden = challenge;
      nextBtn.textContent = challenge ? '次の面へ' : '次の迷路';
      nextBtn.classList.add('primary');
      nextBtn.classList.remove('ghost');
      retryBtn.classList.remove('primary');
      retryBtn.classList.add('text-button');
      retryBtn.textContent = '同じ迷路をもう一度';
      time.textContent = `${(v.timeMs / 1000).toFixed(2)} 秒`;
      best.textContent = v.bestMs != null ? `${(v.bestMs / 1000).toFixed(2)} 秒` : '—';
      seed.textContent = String(v.seed);
      badge.hidden = !v.isNewBest;
    },
    onRetry(cb) { retryBtn.addEventListener('click', cb); },
    onNext(cb) { nextBtn.addEventListener('click', cb); },
  };
}
