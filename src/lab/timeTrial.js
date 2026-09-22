// 検証ページ専用。本編の記録と保存キーを分ける。
export function createTimeTrial() {
  return { elapsedMs: 0, started: false, finished: false, practice: false };
}
export function advanceTrial(trial, elapsedMs, moved, goal) {
  if (trial.finished) return;
  if (moved) trial.started = true;
  if (!trial.started) return;
  trial.elapsedMs += Math.max(0, elapsedMs);
  if (goal) trial.finished = true;
}
export function trialKey(settings, mode) {
  return `corogalism-floor-trial-v1-250-${mode}-${settings.ice}-${settings.sand}`;
}
export function readTrialBest(storage, key) {
  try {
    const value = Number(storage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch { return null; }
}
export function saveTrialBest(storage, key, trial) {
  if (!trial.finished || trial.practice || trial.elapsedMs <= 0) return false;
  try {
    const old = readTrialBest(storage, key);
    if (old === null || trial.elapsedMs < old) storage.setItem(key, String(trial.elapsedMs));
    return true;
  } catch { return false; }
}
