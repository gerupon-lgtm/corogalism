/**
 * HP（F-211〜F-215）。正典は docs/hp-and-materials.md。
 *
 *   HP初期値 = HP.base + HP係数(面数) × 折れ回数
 *   ダメージ = min(初期HP × capRatio,
 *                 damageScale × 倍率 × 素材のダメージ係数 × max(0, v − threshold)²)
 *
 * threshold と capRatio は仕組みごと外さないこと:
 * - threshold が無いと、壁への押し付けで3秒に254回発生する微小接触が全部ダメージになる
 * - capRatio が無いと、全力衝突（5.38マス/s）で1発即死する
 *
 * 衝突判定は持たない。physics/collision.js の onImpact から速度と壁を受け取るだけ。
 */
import { HP } from '../config/gameConfig.js';
import { getMaterial } from '../world/materials.js';

/** 折れ回数とHP係数から初期HPを求める */
export function initialHp(turns, hpPerTurn, cfg = HP) {
  return cfg.base + hpPerTurn * turns;
}

export function createHp({ turns, hpPerTurn, damageMult = 1, cfg = HP, damageCapRatio = cfg.capRatio } = {}) {
  const max = initialHp(turns, hpPerTurn, cfg);
  const cap = max * Math.min(cfg.capRatio, damageCapRatio);
  let value = max;
  let lastDamageAt = -Infinity;
  let tookDamage = false;

  return {
    get value() { return value; },
    get max() { return max; },
    get ratio() { return max > 0 ? Math.max(0, value / max) : 0; },
    get isDead() { return value <= 0; },
    /** この面で一度でもダメージを受けたか（ノーミス面数の判定に使う） */
    get tookDamage() { return tookDamage; },

    /** 回復しても被弾履歴は維持。死亡後の復活には使わない。 */
    heal(amount) {
      if (value <= 0 || !Number.isFinite(amount) || amount <= 0) return 0;
      const gained = Math.min(amount, max - value);
      value += gained;
      return gained;
    },

    /**
     * 衝突を適用して、実際に減ったHPを返す（0なら無傷）。
     * speed は法線方向の速度（マス/s）、wall は衝突した壁（materialId を持つ）。
     */
    applyImpact(speed, wall, nowSec) {
      if (!(speed > cfg.threshold)) return 0;
      if (nowSec - lastDamageAt < cfg.cooldownSec) return 0;
      const damageK = getMaterial(wall && wall.materialId).damageK ?? 1;
      const raw = cfg.damageScale * damageMult * damageK * (speed - cfg.threshold) ** 2;
      const dealt = Math.min(cap, raw);
      value -= dealt;
      lastDamageAt = nowSec;
      tookDamage = true;
      return dealt;
    },
  };
}
