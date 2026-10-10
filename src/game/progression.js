/**
 * 難易度カーブ（F-251, F-252）。正典は docs/run-and-score.md §5。
 *
 * 主レバーは「1マスあたりの秒数」を削ること。**迷路サイズは変えない。**
 * サイズを上げると折れ回数が増えてHP初期値も増え、難易度が相殺されるため
 * （避けたはずの「平坦化」が難易度カーブ経由で戻ってくる）。
 *
 * 純粋関数。
 */
import { DIFFICULTY, HP, FLOOR_CHALLENGE as C, PUZZLE_MAIN } from '../config/gameConfig.js';

const lerpDown = (start, end, stages, n) =>
  Math.max(end, start - (start - end) * (n - 1) / Math.max(1, stages - 1));

/** 面数（1始まり）から、その面の難易度パラメータを返す */
export function difficultyAt(stage, cfg = DIFFICULTY) {
  const n = Math.max(1, Math.floor(stage));
  const intro = Math.max(0, (cfg.introEndStage - n) / Math.max(1, cfg.introEndStage - 1));
  return {
    stage: n,
    /** 制限時間 = 経路長 × これ */
    secPerCell: lerpDown(cfg.secPerCellStart, cfg.secPerCellEnd, cfg.secPerCellStages, n)
      * (1 + (cfg.introTimeMult - 1) * intro),
    /** HP初期値 = HP.base + これ × 折れ回数 */
    hpPerTurn: Math.max(cfg.hpPerTurnMin, cfg.hpPerTurnStart - cfg.hpPerTurnPerStage * (n - 1)),
    /** ダメージ倍率（素材の危険度上昇とは別に、全体を底上げする係数） */
    damageMult: Math.min(cfg.damageMultMax, 1 + cfg.damageMultPerStage * (n - 1))
      * (1 - (1 - cfg.introDamageMult) * intro),
    /** 序盤の全力衝突を抑える。通常倍率だけでは35%上限に当たり、軽減されないため。 */
    damageCapRatio: HP.capRatio - (HP.capRatio - cfg.introCapRatio) * intro,
    /** 危険な壁（stone / spike）が占める割合 */
    dangerRatio: Math.min(cfg.dangerRatioMax, cfg.dangerRatioPerStage * (n - 1)),
    /** 危険な壁のうち spike の割合（残りは stone） */
    spikeShare: Math.min(cfg.spikeShareMax, cfg.spikeShareStart + cfg.spikeSharePerStage * (n - 1)),
    /** 安全地帯（moss）が占める割合 */
    mossRatio: Math.max(cfg.mossRatioMin, cfg.mossRatioStart - cfg.mossRatioPerStage * (n - 1)),
  };
}

/** 制限時間（秒）。経路長で正規化する（生成された迷路による難易度のばらつきを消す） */
export function stageTimeLimitSec(maze, difficulty, stage=null) {
  if(difficulty.themed){
    const load=stage?.floorLoad||{};
    const extra=maze.turns*C.turnSec+(load.sandCells||0)*C.sandSec+(load.hinderFields||0)*C.hinderSec+(stage?.theme.firstVisit?C.introSec:0);
    let limit=Math.max(C.minSec[difficulty.level]||25,maze.pathLength*difficulty.secPerCell+extra,maze.pathLength*difficultyAt(difficulty.stage).secPerCell+2)+(difficulty.level==='easy'?5:0);
    if(difficulty.level==='easy')limit=Math.max(limit,maze.pathLength*C.easySecPerCell+maze.turns*C.easyTurnSec+C.easyThinkingSec+(load.sandCells||0)*C.sandSec+(stage?.zones.filter(z=>z.kind==='radial').length||0)*C.easyFieldSec+(stage?.theme.firstVisit?C.introSec:0));
    const result=(stage?.theme.learning?Math.max(C.learningSeconds,limit):limit)+puzzleTimeAllowanceSec(stage,difficulty.level);
    return difficulty.level==='easy'?Math.ceil(result):result;
  }
  return maze.pathLength * difficulty.secPerCell + (difficulty.timeBonusSec ?? 0);
}

/** 道の長さに現れない壁の開閉・返球・切り返しの負担を追加する。 */
export function puzzleTimeAllowanceSec(stage,level='normal'){
 const p=stage?.puzzle;if(!p)return 0;
 const c=PUZZLE_MAIN.time,mode=level==='easy'?'easy':'normal';
 const operation=c.base[mode]+p.gateCount*c.gate[mode]+p.aimCount*c.aim[mode]+p.timingCount*c.timing[mode]+(p.openingSeconds||0);
 return Math.ceil(operation*(c.ease[p.ease]??1)+(p.firstVisit?c.intro:0));
}
