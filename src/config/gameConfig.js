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
};
