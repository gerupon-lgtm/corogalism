/**
 * 基準値（baseline）とクランプ範囲の一元管理。
 *
 * BASE の値は、フェーズ0のプロトタイプを Pixel 6a / iPhone XR の実機で
 * 調整して得たもの（合格ライン a〜e 全通過、2026-09-11）。
 *
 * 重要: 物理コードは BASE を直接読まない。必ず resolveParams() の
 * 戻り値（実効値）を使う。理由は docs/physics.md §1。
 */

export const BASE = {
  tiltSensitivity: 17,   // 最大傾き時の加速度（マス/s²）
  friction: 2.5,         // 指数減衰の係数。v *= Math.exp(-friction * dt)。クーロン摩擦ではない
  maxTiltAngleDeg: 25,   // この角度で入力が最大。ユーザー設定で変更可能（これは既定値）
  wallRestitution: 0.35, // 壁の反発係数
  inputSmoothing: 0.35,  // 入力の平滑化。0で平滑化なし
  mazeSize: 7,           // フェーズ1固定。generateMaze はサイズを引数で受ける
};

/**
 * 実効値のクランプ範囲。
 * 根拠: フェーズ0プロトタイプのスライダー範囲＝人が実機で触って操作が成立した範囲。
 * 係数の掛け合わせで到達してしまう操作不能な組み合わせを、実効値の側で止める。
 */
export const CLAMP = {
  friction:    { min: 0.2, max: 8.0 },
  restitution: { min: 0.0, max: 0.7 },
  accel:       { min: 4,   max: 60  }, // マス/s²
};

/** 物理・描画の固定値（層構造の対象外） */
export const TUNING = {
  wallThickness: 0.10,   // セルに対する壁の厚み比
  maxSpeed: 30,          // マス/s。トンネリング防止の速度上限
  maxDt: 1 / 20,         // s。タブ復帰時などの巨大なdtを切る
  wallHitSpeed: 2.0,     // マス/s。これを超える法線速度の衝突を「壁ヒット」と数える
  goalRadius: 0.30,      // セル比。ゴール判定の半径
  startMoveSpeed: 0.5,   // マス/s。これを超えたらタイム計測を開始する
  challengeStartDistance: 0.02, // マス。微速移動でチャレンジの時間制限を回避させない
};

/**
 * HPとダメージ（フェーズ2）。根拠と検証データは docs/hp-and-materials.md。
 * threshold と capRatio は仕組みごと外さないこと（CLAUDE.md §9-6）。
 */
export const HP = {
  base: 40,          // HP初期値の下駄
  damageScale: 10,   // ダメージ = damageScale × 倍率 × 素材係数 × (v - threshold)^2
  threshold: 1.2,    // マス/s。これ以下の接触は無傷（壁への押し付けによる微小接触を無効化）
  capRatio: 0.35,    // 1発で失えるHPの上限（初期HPに対する比）。全力衝突の即死を防ぐ
  cooldownSec: 0.25, // 無敵時間
};

/**
 * 難易度カーブ（フェーズ2）。tools/run2.mjs の検証で「緩」を採用。
 * 根拠は docs/run-and-score.md §5。
 */
export const DIFFICULTY = {
  introEndStage: 10,      // この面で序盤の緩和を終え、従来の難易度につなげる
  introTimeMult: 2.5,     // 1面目の制限時間を延長する倍率
  introDamageMult: 0.5,   // 1面目の通常ダメージを半分にする
  introCapRatio: 0.20,    // 1面目の単発上限。10面目でHP.capRatioへ戻す
  secPerCellStart: 0.55,   // 序盤の時間延長を掛ける前の基準秒数
  secPerCellEnd: 0.28,     // 底
  secPerCellStages: 20,    // 何面かけて底まで削るか
  hpPerTurnStart: 4.0,     // HP係数（折れ回数に掛ける）
  hpPerTurnMin: 3.0,
  hpPerTurnPerStage: 0.06,
  damageMultMax: 2.0,      // 素材の危険度上昇の代理値
  damageMultPerStage: 0.04,
  dangerRatioPerStage: 0.035, // stone/spike が占める壁の割合
  dangerRatioMax: 0.5,
  spikeShareStart: 0.0,    // 危険な壁のうち spike の割合
  spikeShareMax: 0.45,
  spikeSharePerStage: 0.03,
  mossRatioStart: 0.12,    // 安全地帯（moss）の割合
  mossRatioMin: 0.02,
  mossRatioPerStage: 0.01,
};

/** ラン（チャレンジモード） */
export const RUN = {
  continues: 2,  // 1ランに使えるコンティニュー回数
};

/** 表示専用。物理や難易度の数値とは分離する。 */
export const UI = {
  startCountdownMs: 3000,
  countdownMaxStepMs: 250,
  goalSettleMs: 520,
  clearCelebrationMs: 1500,
  damageFeedbackMs: 450,
  urgentTimeRatio: 0.25,
  lowHpRatio: 0.35,
};
