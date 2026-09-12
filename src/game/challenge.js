import { CHALLENGE_LEVELS } from '../config/gameConfig.js';
import { difficultyAt } from './progression.js';

export function normalizeLevel(level) { return level === 'easy' ? 'easy' : 'normal'; }
export function challengeDifficulty(stage, level) {
  const id = normalizeLevel(level);
  const base = difficultyAt(stage);
  const cfg = CHALLENGE_LEVELS[id];
  return { ...base, level: id, themed: true,
    damageMult: base.damageMult * cfg.damageFactor,
    damageCapRatio: base.damageCapRatio * cfg.damageFactor,
    recoveryChance: cfg.recoveryChance };
}
