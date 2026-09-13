import { CHALLENGE_LEVELS, EASY_TIME } from '../config/gameConfig.js';
import { difficultyAt } from './progression.js';

export function normalizeLevel(level) { return level === 'easy' ? 'easy' : 'normal'; }
export function challengeDifficulty(stage, level) {
  const id = normalizeLevel(level);
  const base = difficultyAt(stage);
  const cfg = CHALLENGE_LEVELS[id];
  return { ...base, level: id, themed: true,
    timeBonusSec: id === 'easy' ? Math.min(EASY_TIME.maxBonusSec, Math.max(0, base.stage - EASY_TIME.firstStage + 1) * EASY_TIME.stepSec) : 0,
    damageMult: base.damageMult * cfg.damageFactor,
    damageCapRatio: base.damageCapRatio * cfg.damageFactor,
    recoveryChance: cfg.recoveryChance };
}
