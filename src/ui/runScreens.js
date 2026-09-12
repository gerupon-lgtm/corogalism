/** S-105 / S-106 / S-107。ランの進行と記録計算は呼び出し側が担う。 */
const seconds = (ms) => `${(ms / 1000).toFixed(2)} 秒`;
const bestLabel = (best) => best ? `${best.stages}面 / ${seconds(best.totalTimeMs)}` : '記録なし';

export function createRunScreens(root) {
  const find = (id) => root.querySelector(`#${id}`);
  return {
    setModeBests(bests, note) {
      find('mode-best-no').textContent = bestLabel(bests.noContinue);
      find('mode-best-continue').textContent = bestLabel(bests.withContinue);
      find('mode-note').textContent = note;
    },
    setOver(run) {
      find('over-heading').textContent = run.cause === 'timeout' ? '時間切れ' : 'HPがなくなりました';
      find('over-note').textContent = `${run.stageIndex}面目で終了。${run.usedContinue ? 'コンティニュー使用' : 'ノーコンティニュー'}の記録です。`;
      find('over-stages').textContent = `${run.clearedStages} 面`;
      find('over-time').textContent = seconds(run.totalTimeMs);
      find('btn-continue').disabled = !run.canContinue;
      find('btn-continue').textContent = `コンティニュー（残り${run.continuesLeft}回）`;
      find('continue-note').textContent = run.canContinue
        ? '同じ面をHP満タン・制限時間リセットで再開。以降の記録はコンティニュー使用枠になります。'
        : 'コンティニューを使い切りました。結果を確認して、新しいランに挑戦できます。';
    },
    setResult(result, record) {
      find('run-category').textContent = result.usedContinue ? 'コンティニュー使用の記録' : 'ノーコンティニューの記録';
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
