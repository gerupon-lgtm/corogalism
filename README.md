# コロガリズム / Corogalism

端末の傾きでビー玉を転がし、迷路のゴールを目指すブラウザゲーム。シクミラボ / SIKUMI LAB。
センサーが使えない場合は、盤面のタッチ／クリックで同じゲームを遊べます。
Vanilla JavaScript・Canvas、ビルド不要。バックエンド・外部API・生成AIは使いません。

| フェーズ | 状態 |
|---|---|
| フェーズ0（操作感） | 合格。Pixel 6a / iPhone XRで過去に確認済み |
| フェーズ1（迷路生成・タイムアタック） | 完了・公開済み（従来の引き継ぎ記録） |
| フェーズ2（HP・素材・ラン・制限時間） | **v0.2.0 公開済み。公開URLで自動検証済み、T-209の実機試遊が残り** |

このフォルダをGit初期化し、既存のリモート履歴に接続してフェーズ2をmainへpushしました。
リポジトリは [gerupon-lgtm/corogalism](https://github.com/gerupon-lgtm/corogalism)、
公開先は [GitHub Pages](https://gerupon-lgtm.github.io/corogalism/)。公開版の更新とブラウザ動作を確認済みです（2026-09-12）。詳細は [デプロイ記録](docs/deployment.md)。

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

自動テスト73件成功。ブラウザ確認の再実行手順・結果・画面画像は [検証記録](docs/verification/README.md)。
スマートフォンの傾きセンサー確認はHTTPSの公開先で行います。LANのHTTP配信では利用できません。

## 遊び方

1. 端末を楽な姿勢で持ち、開始ボタンで許可と基準姿勢を取得します。
2. チャレンジまたはプラクティスを選びます。
3. 端末を傾けるか、盤面の中心から進みたい方向を押し続け、右下の輪を目指します。

チャレンジはHP・制限時間あり。各面でHP全回復、面が進むと時間が短くなり危険な壁が増えます。
HP0または時間切れで失敗。同じ面から2回までコンティニューできます。
記録はクリア面数を優先し、同じ面数なら合計クリアタイムで比較。ノーコンと使用後の記録を別々に保存します。

プラクティスはHP・制限時間なし。`?seed=123` で迷路を指定でき、同じ面のリトライとベストタイム更新を狙えます。
一時停止・設定画面・タブ非表示中は時計も停止します。戻ったら「再開」で続けます。

壁は色と模様で区別します。標準・石・棘・苔を配置済み。ゴムは定義・描画対応がありますが現在の配置には出現しません。
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
