# データモデル（フェーズ1）

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
{ id: 'default', frictionK: 1.0, restitutionK: 1.0, accelK: 1.0 }
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
  toScreen({x, y}) => {px, py},
  cellSizePx,
  visibleBounds,
}
```

描画とヒットテストはこの抽象経由で座標変換する。`cellSize` を各所で直接計算しないこと。
