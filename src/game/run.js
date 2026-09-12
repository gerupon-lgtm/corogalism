/**
 * ラン（チャレンジモードの進行状態、F-232, F-241〜F-246）。
 * 正典は docs/run-and-score.md。
 *
 * 迷路生成やHPは持たない純粋な状態管理。面の生成は呼び出し側が行う。
 */
import { RUN } from '../config/gameConfig.js';

/**
 * ラン全体を1つのシードから導出する。
 * これでラン全体が再現でき、同じランを他人と競える（将来のデイリーの土台）。
 */
export function stageSeed(runSeed, stageIndex) {
  return ((runSeed * 2654435761 + stageIndex * 40503) % 1000003) >>> 0;
}

export function createRun(runSeed, cfg = RUN) {
  let stageIndex = 1;
  let clearedStages = 0;
  let totalTimeMs = 0;
  let noDamageStages = 0;
  let continuesLeft = cfg.continues;
  let usedContinue = false;
  let over = false;
  let cause = null; // 'dead' | 'timeout'

  return {
    runSeed: runSeed >>> 0,
    get stageIndex() { return stageIndex; },
    get clearedStages() { return clearedStages; },
    get totalTimeMs() { return totalTimeMs; },
    get noDamageStages() { return noDamageStages; },
    get continuesLeft() { return continuesLeft; },
    get usedContinue() { return usedContinue; },
    get isOver() { return over; },
    get cause() { return cause; },
    get canContinue() { return over && continuesLeft > 0; },

    /** 現在の面のシード */
    currentSeed() { return stageSeed(this.runSeed, stageIndex); },

    /** 面をクリアした */
    clearStage({ timeMs, noDamage }) {
      clearedStages++;
      totalTimeMs += timeMs;
      if (noDamage) noDamageStages++;
      stageIndex++;
    },

    /** 面で失敗した（HP0 または時間切れ）。ランは終了状態になる */
    failStage(failCause) {
      over = true;
      cause = failCause === 'timeout' ? 'timeout' : 'dead';
    },

    /** コンティニューする。失敗した面から再開し、到達面数は維持する */
    useContinue() {
      if (!over || continuesLeft <= 0) return false;
      continuesLeft--;
      usedContinue = true;
      over = false;
      cause = null;
      return true;
    },

    /** 記録に載せる形 */
    result() {
      return {
        stages: clearedStages,
        totalTimeMs,
        noDamageStages,
        usedContinue,
        cause,
      };
    },
  };
}
