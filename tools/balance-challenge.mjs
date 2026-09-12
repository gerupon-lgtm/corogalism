import { playStage } from './balance.mjs';
import { themeAt } from '../src/world/themes.js';
// 新テーマ・回復込みの実測。旧曲線の回帰はbalance.test.jsで別途維持。
for (const level of ['normal', 'easy']) for (const urgency of [1, 1.3]) {
  const rows = [];
  for (const stage of [1, 2, 3, 4, 5, 8, 10, 12, 18, 20]) {
    const counts = { clear: 0, dead: 0, timeout: 0 };
    for (let seed = 1; seed <= 30; seed++) counts[playStage(seed * 7919, stage, urgency, level).result]++;
    rows.push({ stage, theme: themeAt(stage).id, ...counts });
  }
  console.log(JSON.stringify({ level, urgency, rows }));
}
