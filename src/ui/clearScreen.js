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
      const challenge = v.gameMode === 'challenge';
      el.querySelector('#clear-heading').textContent = challenge ? `${v.stageIndex}面目 クリア` : 'クリア';
      el.querySelector('#clear-best-field').hidden = challenge;
      el.querySelector('#clear-hp-field').hidden = !challenge;
      el.querySelector('#clear-hp').textContent = challenge ? `${Math.ceil(Math.max(0, v.hp.value))} / ${Math.ceil(v.hp.max)}` : '—';
      el.querySelector('#clear-note').textContent = challenge
        ? `${v.noDamage ? 'ノーダメージ！ ' : ''}次の面はHP全回復。残HPは評価として表示し、面数には加算しません。`
        : '同じ迷路でタイムを縮めるか、新しい迷路に進めます。';
      el.querySelector('#btn-clear-exit').textContent = challenge ? 'ランを終えて結果を見る' : 'モード選択へ戻る';
      retryBtn.hidden = challenge;
      nextBtn.textContent = challenge ? '次の面へ' : '次の迷路';
      nextBtn.classList.toggle('primary', challenge);
      nextBtn.classList.toggle('ghost', !challenge);
      time.textContent = `${(v.timeMs / 1000).toFixed(2)} 秒`;
      best.textContent = v.bestMs != null ? `${(v.bestMs / 1000).toFixed(2)} 秒` : '—';
      seed.textContent = String(v.seed);
      badge.hidden = !v.isNewBest;
    },
    onRetry(cb) { retryBtn.addEventListener('click', cb); },
    onNext(cb) { nextBtn.addEventListener('click', cb); },
  };
}
