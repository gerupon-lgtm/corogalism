// 古いPWAのキャッシュに新しい実行資材を混ぜない。更新は既存の明示操作へ案内。
const status = document.getElementById('status');
try {
  const config = await fetch(new URL('../config/gameConfig.js', import.meta.url));
  if (!config.ok) throw new Error('設定を取得できませんでした');
  const stageSource = await fetch(new URL('../world/stage.js', import.meta.url));
  if (!(await config.text()).includes('export const LAB_EXPLORATION') || !stageSource.ok || !(await stageSource.text()).includes("z.kind === 'ice' && !stage.physicsPolicy?.unrestricted")) {
    status.textContent = 'ゲームの更新が必要です。上の「コロガリズムへ」からトップを開き、「更新をチェック」で更新したあと、このページを開き直してください。';
    document.querySelectorAll('button, input, select').forEach(element => { element.disabled = true; });
  } else {
    await import('./floorLab.js');
  }
} catch {
  status.textContent = '読み込めませんでした。通信状態を確認してページを開き直してください。';
}
