# 物理パラメータの契約（フェーズ1の中核）

## 1. なぜこの形にするか

摩擦・反発・ボールサイズは、**素材や重力やキャラクターによって変わる要素にする**方針が確定している（そこからゲームの面白さが出てくるという発案者の判断）。フェーズ1では素材もキャラも1種類だけなので挙動には差が出ないが、**構造だけは最初から入れる**。

後から層構造に変える場合、次が同時に発生する:

- 摩擦が「盤面で一定」から「位置の関数」に変わるため、減衰の適用位置が積分ループの中へ移る
- 壁が「座標だけ」から「座標＋素材」に変わるため、生成・衝突・描画の3箇所が連動する
- ボールが「運動状態だけ」から「運動状態＋キャラ属性」に変わる
- クランプを1箇所に置けず、複数箇所に散る
- そして最大のコスト: **`friction: 2.5` の意味が「摩擦」から「修飾前の基準摩擦」に変わるため、それまでに試遊で決めた難易度・アイテム持続時間・スコア係数のバランスが崩れる**

係数が全部 1.0 の今なら、通すだけで済む。

## 2. 計算式

```
実効値 = 基準値 × キャラの係数 × 素材の係数 × ゾーンの係数   → クランプ
```

係数の既定はすべて `1.0`。修飾子が無ければ基準値どおりに動く。

## 3. 基準値（baseline）

`src/config/gameConfig.js`。フェーズ0で Pixel 6a / iPhone XR の実機調整により得た値。

```js
export const BASE = {
  tiltSensitivity: 17,    // 最大傾き時の加速度（マス/s²）
  friction: 2.5,          // 指数減衰の係数。v *= Math.exp(-friction * dt)
  maxTiltAngleDeg: 25,    // この角度で入力が最大。ユーザー設定で変更可能（既定値）
  wallRestitution: 0.35,  // 壁の反発係数
  inputSmoothing: 0.35,   // 入力の平滑化。tilt += (raw - tilt) * (1 - smoothing^(dt*60))
  mazeSize: 7,
};
```

`friction` は**クーロン摩擦ではなく指数減衰の係数**。物理的に正しい摩擦モデルに置き換えないこと（上の値はこのモデル前提で実機調整されている）。

`inputSmoothing` と `maxTiltAngleDeg` は入力側の値であり、素材やキャラでは変わらない（層構造の対象外）。`maxTiltAngleDeg` は端末別の定数ではなく**ユーザー設定項目**にする（Pixel 23° / iPhone 26° の差は端末差ではなく持ち方の差と見ているため）。

## 4. クランプ範囲

```js
export const CLAMP = {
  friction:    { min: 0.2,  max: 8.0 },
  restitution: { min: 0.0,  max: 0.7 },
  accel:       { min: 4,    max: 60  },   // マス/s²
};
```

**この範囲の根拠**: フェーズ0プロトタイプのスライダー範囲＝人が実機で触って操作が成立した範囲。範囲外は「係数の掛け合わせで到達してしまう操作不能な組み合わせ」なので、実効値の側で止める。

反発が高く摩擦が低い組み合わせは操作不能になりやすい。素材とキャラの係数はそれぞれ妥当でも、掛け合わせると範囲外に出ることがあるため、**クランプは個々の係数ではなく実効値に対して行う**。

## 5. インターフェース

### 素材（`src/world/materials.js`）

```js
export const MATERIALS = {
  default: { id: 'default', frictionK: 1.0, restitutionK: 1.0, accelK: 1.0 },
};
```

フェーズ1では `default` のみ。フェーズ2で氷（`frictionK` を下げる）・砂（上げる）・粘着（大きく上げる）などを足す。

### キャラクター（`src/world/characters.js`）

```js
export const CHARACTERS = {
  default: {
    id: 'default', name: 'ビー玉',
    sizeRatio: 0.55,          // セルに対する直径の比。係数ではなく絶対値
    frictionK: 1.0, restitutionK: 1.0, accelK: 1.0,
  },
};
```

`sizeRatio` は係数ではなくキャラ側の絶対値として持つ。**0.55 はフェーズ1の初期値であり固定値ではない**（キャラによって変わる前提）。1マスの通路の実効幅は「1セル − 壁の太さ」なので、`sizeRatio` を上げると通路の遊びが急に減る（0.55 で0.35セル、0.70 で0.20セル）。難易度に直結する値なので、キャラを足すときはここを難易度の軸として使う。

### ゾーン（重力・ギミック、`src/world/stage.js`）

```js
// 1面に0個以上。フェーズ1では常に空配列
{ id, cells: [...], frictionK: 1.0, restitutionK: 1.0, accelK: 1.0, forceX: 0, forceY: 0 }
```

`forceX` / `forceY` は傾き由来でない外力（マス/s²）。コンベア・風・磁石はここに乗る。

### 解決（`src/physics/resolveParams.js`）

```js
// 純粋関数。単体テスト必須。
resolveParams({ base, character, material, zone }) => {
  accel:       clamp(base.tiltSensitivity * character.accelK       * material.accelK       * zone.accelK,       CLAMP.accel),
  friction:    clamp(base.friction        * character.frictionK    * material.frictionK    * zone.frictionK,    CLAMP.friction),
  restitution: clamp(base.wallRestitution * character.restitutionK * material.restitutionK * zone.restitutionK, CLAMP.restitution),
  forceX: zone.forceX,
  forceY: zone.forceY,
}
```

`material` / `zone` が未指定のときは全係数 1.0 の中立値を使う。

**反発は壁側の素材で決まる**点に注意。壁の矩形は `{ x, y, w, h, materialId }` として持ち、衝突時にその壁の素材で `restitution` を解決する。床（ボールが乗っているマス）の素材は `friction` と `accel` に効く。

## 6. 積分と適用順

```js
// physics/integrator.js
const p = resolveParams({ base, character, material: sampleMaterial(stage, ball), zone: sampleZone(stage, ball) });

let fx = tilt.x * p.accel + p.forceX;      // マス/s²
let fy = tilt.y * p.accel + p.forceY;

ball.vx += fx * cellSize * dt;             // ピクセルへ変換するのはここだけ
ball.vy += fy * cellSize * dt;

const damp = Math.exp(-p.friction * dt);
ball.vx *= damp; ball.vy *= damp;

// 速度上限 → サブステップ分割 → 位置更新 → 衝突解決
```

力を `fx` / `fy` に集約しておくこと。`ball.vx += tilt.x * accel * dt` と直接書くと、傾き以外の力を足すときに1行では済まなくなる。

## 7. 素材のサンプリング（要判断・フェーズ1では差が出ない）

ボール径 0.55セルでも**ボールは複数のマスにまたがり得る**ため、「どのマスの素材か」は一意に決まらない。選択肢:

- **A: 中心のあるマスで決める**（軽い。境目で切り替わるのが体感で分かる）
- **B: 重なり面積で加重平均する**（滑らか。毎サブステップで重なり計算が必要）

**フェーズ1では素材が1種類なので差が出ない。推奨は A で実装し、`sampleMaterial(stage, ball)` という1つの関数に閉じ込めておくこと**【想定】。フェーズ2で氷と砂の境目の手触りを見てから、この関数の中身だけ差し替えれば B へ移れる。

呼び出し側が「どのマスか」を知らない形にしておくことが重要。ここが漏れると、フェーズ2で呼び出し側も直すことになる。

## 8. テスト（`node --test`）

`resolveParams` は純粋関数なので、次を必ずテストする:

- 係数が全部 1.0 のとき、基準値がそのまま返る
- `material` / `zone` を省略したとき、全係数 1.0 と同じ結果になる
- 係数の掛け合わせが範囲外に出るとき、クランプされる（例: `frictionK: 0.01` × `frictionK: 0.01` → `CLAMP.friction.min`）
- 反発の上限を超える組み合わせがクランプされる
