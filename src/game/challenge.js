import { FLOOR_CHALLENGE as C } from '../config/gameConfig.js';
import { difficultyAt } from './progression.js';
export function normalizeLevel(level) { return level === 'easy' ? 'easy' : 'normal'; }
export function challengeDifficulty(stage, level) {
 const id=normalizeLevel(level),base=difficultyAt(stage),n=base.stage;
 const intro=Math.max(0,(10-n)/9);
 return {...base,level:id,themed:true,
  secPerCell:Math.max(C.secPerCellEnd,C.secPerCellStart-(C.secPerCellStart-C.secPerCellEnd)*(n-1)/(C.timeStages-1)),
  hpPerTurn:C.hpPerTurn,damageMult:Math.min(C.damageMax,1+C.damageStep*(n-1))*(1-.5*intro)*C.damageFactor[id],
  damageCapRatio:(.2+.15*(1-intro))*C.damageFactor[id],recoveryChance:C.recoveryChance[id],timeBonusSec:0};
}
