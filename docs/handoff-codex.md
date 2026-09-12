# Codexへの引き継ぎ（2026-09-12 更新）

## 現在地

**フェーズ2の実装・デプロイ・公開URLでの自動検証が完了。T-209の試遊で序盤の時間とHPが厳しいとの報告を受け、v0.2.1で緩和しました。再試遊が必要です。**
ローカルのバージョンは `v0.2.1`。フェーズ0は参照用のまま維持しています。

| 対象 | 状態 |
|---|---|
| フェーズ0・1 | 過去の実機確認・公開済み（従来資料の記録） |
| T-201〜204 / T-210 / T-212 / T-215〜216 | 引き継ぎ前のロジックを維持 |
| T-205〜207 / T-211 / T-213〜214 / T-217表示 | 実装済み、Chromeのブラウザ自動確認済み |
| T-209 | 試遊報告あり：序盤は時間不足・HPが減りすぎる。v0.2.1で緩和、再評価待ち |
| フェーズ2の公開 | **完了**。Git初期化、既存main履歴へ接続してpush。Pages成功・公開URLの動作確認済み。`docs/deployment.md` 参照 |

## 最初に読むもの

1. `AGENTS.md` — 特に§9の7原則
2. `docs/tasks.md` — 残タスク
3. `docs/run-and-score.md` — ラン・制限時間・スコア
4. `docs/hp-and-materials.md` — HPの根拠
5. `docs/phase2-implementation.md` と `docs/verification/README.md` — 今回の判断と検証

## 実装の入口

| ファイル | 責務 |
|---|---|
| `src/main.js` | 7画面の切り替え、入力・停止管理、ラン進行、記録保存の呼び出し |
| `src/game/stagePlay.js` | DOM非依存の1面。既存の迷路・素材・物理・HPを接続し、死亡→時間切れ→クリアを判定 |
| `src/game/run.js` | 面数・シード・コンティニュー。従来実装のまま |
| `src/game/progression.js` / `hp.js` | 難易度・HP。従来実装のまま |
| `src/ui/gameScreen.js` / `clearScreen.js` / `runScreens.js` | HUD、残HP、モード選択の記録、失敗・結果の表示 |
| `src/render/materialAppearance.js` / `canvasRenderer.js` | 素材の名前・色と矩形内の模様 |
| `src/record/storage.js` | 設定、練習タイム、ラン2系統のベスト保存 |

`createStagePlay(seed, difficulty)` は `stage / actor / hp / limitSec` と、
`timeMs / remainingSec / started / status` を持ちます。`advance({dt, elapsedMs, tilt, base})` は
物理の `onImpact` からHPを減らし、そのフレームのダメージを返します。
`difficulty` を省略するとHP・制限時間なし、壁はすべて標準です。

## 決めた動作

- 時間は数字＋バー、HPは数値＋バー。被弾時は背景色と減少値を450ms表示。
- チャレンジは速度0.5マス/s超、または開始位置から0.02マス移動で計測開始。
  微速で制限時間を回避できた問題を修正した。プラクティスの従来の速度判定は維持。
- 一時停止・設定・タブ非表示中は時間と物理を停止。設定やタブから戻っても手動で再開する。
  壁の凡例を開くと一時停止する。
- HPは面ごとに全回復。残HPはクリア時の評価表示であり、面数への加点はしない。
- スコアの「到達面数」はクリア済みの面数。UIでは「クリア面数」と明示する。
- 合計タイムはクリアした面だけを合算。失敗した試行の時間は含めない（既存runの契約）。
- 最初の失敗時にノーコン記録を保存し、その後のコンティニュー結果は別枠に保存。
  面数が多い方、同面数なら合計タイムが短い方を残す。
- プレイ中・クリア画面からもランを終了して結果を残せる。
- プラクティスはランダムシード、または `?seed=` を使用。同じ面のリトライと次の迷路を維持。
- 外周は標準壁。配置比率と物理は維持。v0.2.1では1面目の時間を2.5倍、通常ダメージを半分、単発上限を20%にし、10面目で従来値へ戻す。
  **ゴムは定義・描画対応済みだが、既存の素材配置では出現しない。** 追加配置する際はバランス検証が必要。

## 検証

```powershell
node --test
node tools/balance.mjs
python -m http.server 8765 --bind 127.0.0.1
```

ブラウザの再現スクリプトと実行手順は `docs/verification/README.md`。
`?debug=1` の `window.__corogalism` は従来の `teleport(x,y)` / `setTilt(x,y)` を維持し、
`state` に `screen / gameMode / stageIndex / hp / remainingSec / run / walls` を追加。
クエリなしではフックを公開しない。

## 次の実機試遊

1. 公開済みの `https://gerupon-lgtm.github.io/corogalism/` をPixel 6aとiPhone XRで開く。
2. 許可・拒否・キャリブレーションを確認する。
3. 両端末で素材の見分けやすさ、被弾表示、残り時間、停止・復帰、2回までのコンティニューを試す。
4. 「単調さが解消したか」「無理ゲーになっていないか」を判断し、T-209へ記録する。

本作の7原則、`[hidden]{display:none!important}`、セル単位の物理、指数減衰、
円×矩形衝突、`resolveParams`、HP閾値・単発上限、`noindex`・開発中表示を維持すること。
