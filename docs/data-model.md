# データモデル（フェーズ2 / v0.2.0）

単位の原則: **位置・速度・加速度・サイズはマス（セル）単位で保持する。** ピクセルへの変換は描画と積分の最終段だけで行う。画面サイズで難易度が変わらないようにするため。

## MazeGraph（`maze/generator.js` の出力）

```js
{
  size: 7,                    // N（N×N）
  seed: 20260910,
  cells: [                    // 長さ N*N。index = y*N + x
    { t: 0|1, r: 0|1, b: 0|1, l: 0|1 },   // 1 = 壁がある
  ],
  start: { x: 0, y: 0 },
  goal:  { x: 6, y: 6 },
  path: [{ x, y }, ...],       // startからgoalへの一意な経路
  pathLength: 25,              // 経路のセル数（path.length）
  turns: 15,                  // 経路上の方向転換の回数
}
```

全セル連結のスパニングツリーになる（DFSバックトラッカーの性質）。`validator.js` の BFS で全セル到達可能性を検証してから返す。

## Wall（`world/stage.js` が MazeGraph から導出）

```js
{ x, y, w, h, materialId: 'default' }   // マス単位の矩形
```

壁の太さは `wallThickness`（セルに対する比、既定 0.10）。`materialId` は衝突時の反発解決に使う。

## Stage（1面）

```js
{
  maze: MazeGraph,
  floors: [materialId, ...],     // 長さ N*N。フェーズ1では全て 'default'
  walls: [Wall, ...],
  zones: [],                     // フェーズ1では常に空
  wallThickness: 0.10,
}
```

## Character（`world/characters.js`）

```js
{
  id: 'default', name: 'ビー玉',
  sizeRatio: 0.55,                              // セルに対する直径の比（絶対値）
  frictionK: 1.0, restitutionK: 1.0, accelK: 1.0,
}
```

## Material（`world/materials.js`）

```js
{ id: 'default', frictionK: 1.0, restitutionK: 1.0, accelK: 1.0, damageK: 1.0 }
```

## Zone（`world/stage.js`）

```js
{ id, cells: [{x,y}], frictionK: 1.0, restitutionK: 1.0, accelK: 1.0, forceX: 0, forceY: 0 }
```

## Actor（実行時のボール）

```js
{
  character: Character,      // 属性
  x, y,                      // 位置（マス）
  vx, vy,                    // 速度（マス/s）
  r,                         // 半径（マス）= character.sizeRatio / 2
}
```

運動状態とキャラ属性を分けて持つこと。`r` を `gameConfig` から導出しない（キャラ側の値）。

## EffectiveParams（`resolveParams` の戻り値）

```js
{ accel, friction, restitution, forceX, forceY }
```

クランプ済みの実効値。物理コードはこれだけを見る。`docs/physics.md` が契約。

## TiltVector（`input/tiltVector.js`）

```js
{ x, y }   // それぞれ -1〜1、大きさは1以下に正規化
```

傾きモードと擬似傾きモードの共通出力。ゲーム本体は出所を知らない。

## Settings（`record/storage.js`、`localStorage`）

```js
{
  mode: 'tilt' | 'pointer',
  maxTiltAngleDeg: 25,
  calibration: { beta, gamma } | null,
}
```

キャリブレーション値を保存するかは【想定】で保存する（次回起動時に持ち方が同じなら手間が省ける）。ただし起動時に再取得を促す導線は残す。

## BestRecords（`record/storage.js`、`localStorage`）

```js
{ [seed]: { timeMs, wallHits, at } }
```

読めない・書けない環境でもゲームが動くこと（try/catch）。

## Camera（`render/camera.js`）

```js
// フェーズ1は fixed 実装のみ。将来のスクロール対応で差し替える
createFixedCamera(stage, viewportPx) => {
  toScreen(x, y) => {px, py},
  toCells(px, py) => {x, y},
  toPx(cellValue),
  cellSizePx,
  visibleBounds,
}
```

描画とヒットテストはこの抽象経由で座標変換する。`cellSize` を各所で直接計算しないこと。

## StagePlay（`game/stagePlay.js`）

`createStagePlay(seed, difficulty = null)` で生成する。`difficulty` があればチャレンジ。

```js
{
  stage, actor,
  hp,                     // createHpのインスタンス。練習はnull
  limitSec,               // 1面の制限時間。練習はnull
  timeMs, remainingSec, wallHits, started, // getter
  status,                 // playing | clear | dead | timeout
  advance({ dt, elapsedMs, tilt, base }), // ダメージ量を返す。停止中は呼ばない
  teleport(x, y),          // 開発確認用。速度0、計測開始済みにする
}
```

`main.js` がランとこの1面を接続する。停止・設定・非表示中はadvanceを呼ばない。
HP0→時間切れ→ゴールの順に判定し、終了後はadvanceしても変化しない。

## RunとRunBests

`game/run.js` の `createRun(runSeed)` が面数・合計タイム・残りコンティニューを保持する。
`currentSeed()`、`clearStage({timeMs,noDamage})`、`failStage(cause)`、`useContinue()`、`result()` を使う。
`stageLimitSec` はRunには持たず、StagePlayの `limitSec` として計算する。

```js
// result()
{ stages, totalTimeMs, noDamageStages, usedContinue, cause }
// localStorage: corogalism-run-bests（従来のcorogalism-bestsから独立）
{
  noContinue: { stages, totalTimeMs, at } | null,
  withContinue: { stages, totalTimeMs, at } | null,
}
```

`loadRunBests()` が不正・未保存データをnullに正規化する。
`saveRunBest(result)` は `{updated, saved, best}` を返す。面数降順、タイム昇順。
書き込み失敗時は `saved:false`。初回失敗時のノーコン記録と、コンティニュー後の記録を分ける。
