/** S-103 クリア（F-143） */
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
      time.textContent = `${(v.timeMs / 1000).toFixed(2)} 秒`;
      best.textContent = v.bestMs != null ? `${(v.bestMs / 1000).toFixed(2)} 秒` : '—';
      seed.textContent = String(v.seed);
      badge.hidden = !v.isNewBest;
    },
    onRetry(cb) { retryBtn.addEventListener('click', cb); },
    onNext(cb) { nextBtn.addEventListener('click', cb); },
  };
}
