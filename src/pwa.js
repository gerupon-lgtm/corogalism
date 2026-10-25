/** 更新はタイトルの明示操作のみ。別タブのプレイも中断しない。 */
import { UI } from './config/gameConfig.js';
export function initPwa(isTitle) {
  const notice = document.querySelector('#pwa-notice'), message = document.querySelector('#pwa-message');
  const button = document.querySelector('#btn-pwa-update'), status = document.querySelector('#pwa-status');
  const checkButton = document.querySelector('#btn-pwa-check'), checkResult = document.querySelector('#pwa-check-result');
  let registration = null, applying = false, checking = false;
  const supported='serviceWorker' in navigator;
  let manualCheck = false, checkPhase = 'idle', watchedWorker = null, updateRequest = null;
  const results = {
    checking:'更新を確認しています…', latest:'最新版です。', ready:'更新できます。',
    preparing:'更新の準備中…', offlinePreparing:'オフライン準備中…',
    prepareFailed:'更新の準備に失敗しました。もう一度確認してください。',
    failed:'更新を確認できませんでした。少し待ってもう一度お試しください。',
    timeout:'通信に時間がかかっています。あとで再確認できます。',
    offline:'オフラインです。通信できる場所でもう一度お試しください。',
  };
  const setPhase = value => { checkPhase=value;checkResult.textContent=results[value]||''; };
  const preparingPhase = () => registration?.active || navigator.serviceWorker.controller ? 'preparing' : 'offlinePreparing';
  const knownPhase = () => registration?.waiting ? preparingPhase()==='preparing'?'ready':'offlinePreparing' : registration?.installing ? preparingPhase() : null;
  // タイムアウトしてもブラウザ側の通信は続くため、再確認で同じ要求を重ねない。
  const requestUpdate = () => {
    if (!updateRequest) {
      const request = Promise.resolve().then(() => registration.update());
      updateRequest=request;
      const clear=()=>{if(updateRequest===request)updateRequest=null;};
      request.then(clear,clear);
    }
    return updateRequest;
  };

  const render = () => {
    if (manualCheck && knownPhase()==='ready') setPhase('ready');
    checkButton.disabled=!supported||checking||applying;
    checkButton.textContent=checking?'確認中…':'更新をチェック';
    notice.hidden = !isTitle() || !registration?.waiting;
    button.hidden = !registration?.waiting;
    if (registration?.waiting && !applying) message.textContent = '新しいバージョンがあります。';
  };
  if (!supported) { status.textContent = 'このブラウザではオンラインで遊べます。'; checkButton.disabled=true; checkResult.textContent='このブラウザでは更新チェックを利用できません。'; return { render }; }
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
    const watchWorker=()=>{
      const worker=reg.installing;
      if(!worker||worker===watchedWorker)return;
      watchedWorker=worker;
      const isUpdate=Boolean(reg.active||navigator.serviceWorker.controller);
      const changed=()=>{
        if(worker===watchedWorker){
          if(worker.state==='redundant'){
            status.textContent='オフライン準備を完了できませんでした。オンラインでは遊べます。';
            if(manualCheck)setPhase('prepareFailed');
          }else if(manualCheck&&worker.state==='installing')setPhase(isUpdate?'preparing':'offlinePreparing');
          else if(manualCheck&&worker.state==='activated'&&!isUpdate&&checkPhase==='offlinePreparing')setPhase('latest');
          render();
          // installedの通知とwaitingの設定の間には、短いずれがある。
          if(worker.state==='installed')setTimeout(()=>{if(worker===watchedWorker)render();},0);
        }
        if(['activated','redundant'].includes(worker.state)||isUpdate&&worker.state==='installed')worker.removeEventListener('statechange',changed);
      };
      worker.addEventListener('statechange',changed);changed();
    };
    reg.addEventListener('updatefound',watchWorker);
    watchWorker();
    navigator.serviceWorker.ready.then(() => { status.textContent='オフラインでも遊べます。ホーム画面への追加はブラウザのメニューから。'; render(); });
  }).catch(() => { status.textContent='オフライン準備を完了できませんでした。オンラインでは遊べます。'; });
  checkButton.addEventListener('click', async () => {
    if (!isTitle() || checking || applying) return;
    manualCheck=true;checking=true;setPhase('checking');render();
    let timeout, cancelProbe=()=>{}, active=true;
    try {
      const result = await Promise.race([
        (async () => {
          await registrationReady;
          if(!active)return;
          if (!registration) throw new Error('registration');
          if (knownPhase()) return knownPhase();
          if (!navigator.onLine) throw new Error('offline');
          return new Promise((resolve,reject)=>{
            let done=false, settleTimer;
            const cleanup=()=>{registration.removeEventListener('updatefound',found);clearTimeout(settleTimer);};
            const finish=(value,error)=>{if(done)return;done=true;cleanup();error?reject(error):resolve(value);};
            const found=()=>{const phase=knownPhase();if(phase)finish(phase);};
            cancelProbe=()=>{done=true;cleanup();};
            registration.addEventListener('updatefound',found);
            found();
            if(done)return;
            requestUpdate().then(()=>{
              if(done)return;
              settleTimer=setTimeout(()=>finish(knownPhase()||(checkPhase==='prepareFailed'?'prepareFailed':'latest')),0);
            },error=>finish(null,error));
          });
        })(),
        new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('timeout')),UI.updateCheckTimeoutMs);})
      ]);
      setPhase(knownPhase()||(checkPhase==='prepareFailed'?'prepareFailed':result));
    } catch(error) {
      setPhase(knownPhase()||(checkPhase==='prepareFailed'?'prepareFailed':!navigator.onLine?'offline':error.message==='timeout'?'timeout':'failed'));
    } finally {
      active=false;cancelProbe();clearTimeout(timeout);checking=false;render();
    }
  });
  window.addEventListener('online' , () => { if(registration)requestUpdate().catch(() => {}); });
  return {render};
}
