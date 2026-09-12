/**
 * 難易度カーブ（F-251, F-252）。正典は docs/run-and-score.md §5。
 *
 * 主レバーは「1マスあたりの秒数」を削ること。**迷路サイズは変えない。**
 * サイズを上げると折れ回数が増えてHP初期値も増え、難易度が相殺されるため
 * （避けたはずの「平坦化」が難易度カーブ経由で戻ってくる）。
 *
 * 純粋関数。
 */
import { DIFFICULTY } from '../config/gameConfig.js';

const lerpDown = (start, end, stages, n) =>
  Math.max(end, start - (start - end) * (n - 1) / Math.max(1, stages - 1));

/** 面数（1始まり）から、その面の難易度パラメータを返す */
export function difficultyAt(stage, cfg = DIFFICULTY) {
  const n = Math.max(1, Math.floor(stage));
  return {
    stage: n,
    /** 制限時間 = 経路長 × これ */
    secPerCell: lerpDown(cfg.secPerCellStart, cfg.secPerCellEnd, cfg.secPerCellStages, n),
    /** HP初期値 = HP.base + これ × 折れ回数 */
    hpPerTurn: Math.max(cfg.hpPerTurnMin, cfg.hpPerTurnStart - cfg.hpPerTurnPerStage * (n - 1)),
    /** ダメージ倍率（素材の危険度上昇とは別に、全体を底上げする係数） */
    damageMult: Math.min(cfg.damageMultMax, 1 + cfg.damageMultPerStage * (n - 1)),
    /** 危険な壁（stone / spike）が占める割合 */
    dangerRatio: Math.min(cfg.dangerRatioMax, cfg.dangerRatioPerStage * (n - 1)),
    /** 危険な壁のうち spike の割合（残りは stone） */
    spikeShare: Math.min(cfg.spikeShareMax, cfg.spikeShareStart + cfg.spikeSharePerStage * (n - 1)),
    /** 安全地帯（moss）が占める割合 */
    mossRatio: Math.max(cfg.mossRatioMin, cfg.mossRatioStart - cfg.mossRatioPerStage * (n - 1)),
  };
}

/** 制限時間（秒）。経路長で正規化する（生成された迷路による難易度のばらつきを消す） */
export function stageTimeLimitSec(maze, difficulty) {
  return maze.pathLength * difficulty.secPerCell;
}
