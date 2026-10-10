# コロガリズム / Corogalism

端末の傾きでビー玉を転がし、迷路のゴールを目指すブラウザゲーム。シクミラボ / SIKUMI LAB。
センサーが使えない場合は、盤面のタッチ／クリックで同じゲームを遊べます。
Vanilla JavaScript・Canvas、ビルド不要。バックエンド・外部API・生成AIは使いません。

v0.6.27の[ボールのおためし8](https://corogalism.sikumilab.com/ball-lab.html?preset=cotton)では、スーパーボール＋ゴム壁＋氷床へ一部の綿壁を混ぜて比較できます。綿は跳ね返りを吸収し、壁沿いの滑りを残します。配置数と反発も調整可能。本編の採用は未確定です。[仕様](docs/cotton-wall-lab.md)、[確認と公開状態](docs/verification/cotton-wall.md)。

v0.6.19では、描画領域の復元後に盤面が縮小し、球の残像が連なる問題へ対応しました。同じ画面寸法でも倍率と保存した盤面を復元します。176テスト・ローカルと公開の描画比較・12面の操作・音・オフラインを確認済みです。実端末での初期化の契機は未確認です。[修正と確認範囲](docs/verification/render-recovery.md)。

v0.6.18では、次の面への待機を1秒に揃えました。1秒後から操作でき、そこから0.3秒で彩度が戻ります。[仕様](docs/results-and-timing.md)、[検証・公開状態](docs/verification/end-wait-one-second.md)。

v0.6.17では、「終了して結果を見る」と明記し、終了前に確認を挟みます。「戻る」で元の画面へ戻れ、待機時間と成績を保ちます。チャレンジ中の「○面目」表示も維持しています。[仕様](docs/results-and-timing.md)、[検証・公開状態](docs/verification/run-end-confirm.md)。

v0.6.16の、無効ボタンをグレースケールにし、押せる状態になってから300msで滑らかに彩度を戻す表示も維持しています。[色の確認](docs/verification/end-grayscale.md)。

v0.6.14ではルート上の体験箇所を残し、砂・力場・ひとやすみ・とりもちを脇道にも配置。取得アイテムはルート上です。複数のひとやすみの使用状態もコンティニューで引き継ぎます。[配置仕様](docs/floor-placement.md)、[検証・公開状態](docs/verification/branch-floors.md)、[LP用概要](docs/lp-overview.md)。

v0.6.4では「はじめてのあそび方」で全素材を体験できます。やさしいの時間は最低40秒・床の初登場45秒＋面の負担に応じて加算。「床の練習」では5素材を時間制限なしで比較できます。[現行仕様](docs/tutorial-floors-and-time.md)、[検証](docs/verification/tutorial-floors.md)。

v0.6.5の[ボールのおためし](ball-lab.html)では、金属の重いゴロゴロと長い惰性、スーパーボールの反発などを5素材で比較できます。床・壁・面を切り替え、時間制限なしで音と動きを試せます。[仕様](docs/ball-material-lab.md)、[検証](docs/verification/ball-lab.md)。

v0.6.10の「おためし5」では、木が壁に当たる音を短く乾いた「コン」に変更しました。金属の低く連続する転がりなど、ほかの音と動きは維持しています。[変更と比較音声](docs/verification/wood-knock.md)。

| フェーズ | 状態 |
|---|---|
| フェーズ0（操作感） | 合格。Pixel 6a / iPhone XRで過去に確認済み |
| フェーズ1（迷路生成・タイムアタック） | 完了・公開済み（従来の引き継ぎ記録） |
| フェーズ2（HP・素材・ラン・制限時間） | **v0.6.19公開済み。描画復元時の縮小・残像へ対応。次面待機は1秒＋彩度復帰0.3秒を維持。検証記録はdocs/verification/render-recovery.md、実機の体感評価はdocs/remaining-work.md** |

このフォルダをGit初期化し、既存のリモート履歴に接続してフェーズ2をmainへpushしました。
リポジトリは [gerupon-lgtm/corogalism](https://github.com/gerupon-lgtm/corogalism)、
公開先は [コロガリズム](https://corogalism.sikumilab.com/)（GitHub Pages）。公開版v0.6.19の106資材一致を確認済みです（2026-10-06）。ブラウザ動作の結果は[最新の検証記録](docs/verification/render-recovery.md)、詳細は [デプロイ記録](docs/deployment.md)。

## 起動と検証

プロジェクト直下で実行します。

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

[ローカルで開く](http://127.0.0.1:8765/)。Node環境なら `npx serve .` でも配信できます。

```powershell
node --test
node tools/balance.mjs
```

自動テスト176件成功（最大5ファイルずつ実行）。ブラウザ確認の再実行手順・結果・画面画像は [最新の検証記録](docs/verification/branch-floors.md)。
スマートフォンの傾きセンサー確認はHTTPSの公開先で行います。LANのHTTP配信では利用できません。

## 遊び方

1. 端末を楽な姿勢で持ち、開始ボタンで許可と基準姿勢を取得します。
2. チャレンジまたはプラクティスを選びます。
3. 端末を傾けるか、盤面の中心から進みたい方向を押し続け、右下の輪を目指します。

チャレンジはHP・制限時間あり。各面でHP全回復、面が進むと時間が短くなり危険な壁が増えます。
v0.2.1では序盤を緩和。1面目は時間2.5倍、通常ダメージ半分、単発上限20%で始まり、10面目で従来の難易度につながります。
HP0または時間切れで失敗。同じ面から2回までコンティニューできます。
記録はクリア面数を優先し、同じ面数なら合計クリアタイムで比較。ノーコンと使用後の記録を別々に保存します。

プラクティスはHP・制限時間なし。`?seed=123` で迷路を指定でき、同じ面のリトライとベストタイム更新を狙えます。
一時停止・設定画面・タブ非表示中は時計も停止します。戻ったら「再開」で続けます。

壁は色と模様で区別します。標準・石・棘・苔・ゴム・コルクを配置済み。
`noindex` と開発中表示を維持し、ポートフォリオからのリンクはフェーズ3の判断です。

## 開発の入口

- [AGENTS.md](AGENTS.md): 全体の指示と守る7原則（CLAUDE.md / GEMINI.mdと共通）
- [Codex引き継ぎ](docs/handoff-codex.md): 現在地・変更箇所・残タスク
- [タスク](docs/tasks.md): タスクIDと実装状況
- [ランとスコア](docs/run-and-score.md) / [HPと素材](docs/hp-and-materials.md): 数値の根拠
- [画面](docs/screens.md) / [データモデル](docs/data-model.md) / [物理の契約](docs/physics.md)

`?debug=1` の場合だけ `window.__corogalism` を公開します。
`state` の読取、`teleport(x,y)`、`setTilt(x,y)` がブラウザでの確認に使えます。

## フェーズ0の参照

[phase0/index.html](phase0/index.html) は操作感を検証した単一ファイルのプロトタイプです。変更していません。
合格ラインは「通路を通せる」「狙った隙間で止まれる」「静止時のドリフトが少ない」「両実機で成立」「腕が辛くない」。
実機で調整した物理の基準値は `src/config/gameConfig.js`、適用契約は `docs/physics.md` にあります。
