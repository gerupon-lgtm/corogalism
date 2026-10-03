import {BASE} from '../config/gameConfig.js';
import {resolveParams} from '../physics/resolveParams.js';
import {getMaterial} from '../world/materials.js';
import {sampleMaterial,sampleZone} from '../world/stage.js';

export function applyExploration(stage, physics='explore', settleBounce=false) {
  stage.physicsPolicy={unrestricted:physics==='explore',settleBounce};
}
export function describeExploration(actor,stage) {
  const p=resolveParams({base:BASE,character:actor.character,material:sampleMaterial(stage,actor),zone:sampleZone(stage,actor),policy:stage.physicsPolicy});
  const wall=stage.walls[0];
  const bounce=resolveParams({base:BASE,character:actor.character,material:{...getMaterial(wall?.materialId),...wall?.physicsMaterial},policy:{...stage.physicsPolicy,settleBounce:false}}).restitution;
  const number=v=>Number.isFinite(v)?Number(v.toPrecision(4)).toString():'計算不能';
  return `壁の反発 ${number(bounce)}倍 · 床の減速 ${number(p.friction)} · 傾きの加速 ${number(p.accel)} · 最高速 ${stage.physicsPolicy?.unrestricted?'制限なし':actor.character.maxSpeed??30} · 氷の反応補正 ${stage.physicsPolicy?.unrestricted?'なし':'あり'}`;
}
export function haltMessage(halt) {
  const reason={workload:'この条件では1回の移動計算が処理量を超えました',precision:'速さが増え、移動時間を数値で区別できなくなりました',nonfinite:'この条件では数値を計算し続けられませんでした'}[halt.reason];
  return `${reason}。速度を丸めず一時停止しました。条件は設定のコピーに残ります。数値を変えて再開するか、スタートへ戻せます。`;
}
export function crossesGoal(from,to,x=6.5,y=6.5,radius=.4) {
  const dx=to.x-from.x,dy=to.y-from.y,length=dx*dx+dy*dy;
  const t=length?Math.max(0,Math.min(1,((x-from.x)*dx+(y-from.y)*dy)/length)):0;
  return Math.hypot(from.x+dx*t-x,from.y+dy*t-y)<radius;
}
