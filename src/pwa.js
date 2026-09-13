/** 更新はタイトルの明示操作のみ。別タブのプレイも中断しない。 */
import { UI } from './config/gameConfig.js';
export function initPwa(isTitle) {
  const notice = document.querySelector('#pwa-notice'), message = document.querySelector('#pwa-message');
  const button = document.querySelector('#btn-pwa-update'), status = document.querySelector('#pwa-status');
  const checkButton = document.querySelector('#btn-pwa-check'), checkResult = document.querySelector('#pwa-check-result');
  let registration = null, applying = false, checking = false;

  const render = () => {
    notice.hidden = !isTitle() || !registration?.waiting;
    button.hidden = !registration?.waiting;
    if (registration?.waiting && !applying) message.textContent = '新しいバージョンがあります。';
  };
  if (!('serviceWorker' in navigator)) { status.textContent = 'このブラウザではオンラインで遊べます。'; checkButton.disabled=true; checkResult.textContent='このブラウザでは更新チェックを利用できません。'; return { render }; }
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
  const registrationReady = navigator.serviceWorker.register('./sw.js', { updateViaCache:'none' }).then(reg => {
    registration=reg;render();
    reg.addEventListener('updatefound', () => {
      const worker=reg.installing;
      worker?.addEventListener('statechange', () => { render(); if(worker.state==='redundant') status.textContent='オフライン準備を完了できませんでした。オンラインでは遊べます。'; });
    });
    navigator.serviceWorker.ready.then(() => { status.textContent='オフラインでも遊べます。ホーム画面への追加はブラウザのメニューから。'; render(); });
  }).catch(() => { status.textContent='オフライン準備を完了できませんでした。オンラインでは遊べます。'; });
  checkButton.addEventListener('click', async () => {
    if (!isTitle() || checking || applying) return;
    checking=true;checkButton.disabled=true;checkButton.textContent='確認中…';
    checkResult.textContent='更新を確認しています…';
    let timeout;
    try {
      const result = await Promise.race([
        (async () => {
          await registrationReady;
          if (!registration) throw new Error('registration');
          if (registration.waiting) return '新しいバージョンがあります。上の「更新する」で反映できます。';
          if (!navigator.onLine) throw new Error('offline');
          await registration.update();
          const worker=registration.installing;
          if (worker) await new Promise((resolve,reject) => {
            const changed=()=>{
              if (['installed','activated','redundant'].includes(worker.state)) {
                worker.removeEventListener('statechange',changed);
                if(worker.state==='redundant') reject(new Error('install')); else resolve();
              }
            };
            worker.addEventListener('statechange',changed);changed();
          });
          // installed通知直後のwaitingの切り替えを待つ。
          await new Promise(resolve=>setTimeout(resolve,0));
          return registration.waiting ? '新しいバージョンがあります。上の「更新する」で反映できます。' : '最新版です。';
        })(),
        new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('timeout')),UI.updateCheckTimeoutMs);})
      ]);
      checkResult.textContent=result;
    } catch {
      checkResult.textContent=navigator.onLine ? '更新を確認できませんでした。少し待ってもう一度お試しください。' : 'オフラインです。通信できる場所でもう一度お試しください。';
    } finally {
      clearTimeout(timeout);checking=false;checkButton.disabled=applying;checkButton.textContent='更新をチェック';render();
    }
  });
  window.addEventListener('online' , () => { registration?.update().catch(() => {}); });
  return {render};
}
