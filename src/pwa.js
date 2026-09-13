/** 更新はタイトルの明示操作のみ。別タブのプレイも中断しない。 */
export function initPwa(isTitle) {
  const notice = document.querySelector('#pwa-notice'), message = document.querySelector('#pwa-message');
  const button = document.querySelector('#btn-pwa-update'), status = document.querySelector('#pwa-status');
  let registration = null, applying = false;
  const render = () => {
    notice.hidden = !isTitle() || !registration?.waiting;
    button.hidden = !registration?.waiting;
    if (registration?.waiting && !applying) message.textContent = '新しいバージョンがあります。';
  };
  if (!('serviceWorker' in navigator)) { status.textContent = 'このブラウザではオンラインで遊べます。'; return { render }; }
  const unlock = () => { applying=false; document.querySelectorAll('#screen-mode button').forEach(b => { b.disabled=false; }); };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (applying && isTitle()) location.reload(); });
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'UPDATE_BLOCKED') {
      unlock(); message.textContent = 'ほかのタブのコロガリズムを閉じてから更新してください。';
    }
  });
  button.addEventListener('click', () => {
    if (!isTitle() || !registration?.waiting || applying) return;
    applying=true;document.querySelectorAll('#screen-mode button').forEach(b => { b.disabled=true; });
    message.textContent='更新しています…';registration.waiting.postMessage({type:'APPLY_UPDATE'});
  });
  navigator.serviceWorker.register('./sw.js', { updateViaCache:'none' }).then(reg => {
    registration=reg;render();
    reg.addEventListener('updatefound', () => {
      const worker=reg.installing;
      worker?.addEventListener('statechange', () => { render(); if(worker.state==='redundant') status.textContent='オフライン準備を完了できませんでした。オンラインでは遊べます。'; });
    });
    navigator.serviceWorker.ready.then(() => { status.textContent='オフラインでも遊べます。ホーム画面への追加はブラウザのメニューから。'; render(); });
  }).catch(() => { status.textContent='オフライン準備を完了できませんでした。オンラインでは遊べます。'; });
  window.addEventListener('online', () => { registration?.update().catch(() => {}); });
  return {render};
}
