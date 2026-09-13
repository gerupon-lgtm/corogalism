/** S-105 / S-106 / S-107。ランの進行と記録計算は呼び出し側が担う。 */
import { CHALLENGE_LEVELS } from '../config/gameConfig.js';
const seconds = (ms) => `${(ms / 1000).toFixed(2)} 秒`;
const bestLabel = (best) => best ? `${best.stages}面 / ${seconds(best.totalTimeMs)}` : '記録なし';

function renderModeBest(el, best) {
  el.classList.toggle('record-empty', !best);
  el.replaceChildren();
  if (!best) { el.textContent = 'これから挑戦'; return; }
  const time = el.ownerDocument.createElement('span');
  time.className = 'record-time';
  time.textContent = seconds(best.totalTimeMs);
  el.append(`${best.stages} 面`, time);
}

export function createRunScreens(root) {
  const find = (id) => root.querySelector(`#${id}`);
  return {
    setModeBests(bests, note) {
      renderModeBest(find('mode-best-no'), bests.noContinue);
      renderModeBest(find('mode-best-continue'), bests.withContinue);
      find('mode-note').textContent = note;
    },
    setOver(run) {
      find('over-heading').textContent = run.canContinue ? 'もう一度！' : 'おつかれさま！';
      find('over-note').textContent = `${run.cause === 'timeout' ? '時間切れ' : 'げんきがなくなりました'} · ${run.stageIndex}面目`;
      find('over-stages').textContent = `${run.clearedStages} 面`;
      find('over-time').textContent = seconds(run.totalTimeMs);
      find('btn-continue').disabled = !run.canContinue;
      find('btn-continue').textContent = 'コンティニュー';
      find('continue-note').textContent = run.canContinue
        ? `残り${run.continuesLeft}回 · げんきと時間を回復`
        : 'コンティニューを使い切りました';
      find('btn-run-end').textContent = run.canContinue ? '終了して結果を見る' : '結果を見る';
    },
    setResult(result, record) {
      find('run-category').textContent = `${CHALLENGE_LEVELS[result.level || 'normal'].label} · ${result.usedContinue ? 'コンティニュー使用の記録' : 'ノーコンティニューの記録'}`;
      find('run-stages').textContent = `${result.stages} 面`;
      find('run-time').textContent = seconds(result.totalTimeMs);
      find('run-no-damage').textContent = `${result.noDamageStages} 面`;
      find('run-badge').hidden = !(record.updated && record.saved);
      find('run-best').textContent = `この枠の自己ベスト: ${bestLabel(record.best)}`;
      find('run-save-note').textContent = record.saved
        ? '合計タイムはクリアした面のみ。面数が同じなら、速い記録が自己ベストになります。'
        : 'このブラウザでは記録を保存できませんでした。プレイは続けられます。';
    },
  };
}
