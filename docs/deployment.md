# フェーズ2 デプロイ記録（2026-09-12）

## v0.2.4 UI・素材調整

- タイトル・ロゴ右の2段コピー・記録・操作ボタン・迷路なし設定・M PLUS 1p・壁厚を調整。`ui-polish.md`。
- 79テスト成功、序盤3面×100シード全クリア。4画面幅のブラウザ確認・フォント取得失敗時の操作も成功。
- Standards / Specレビューはいずれも指摘0件。アプリコミット `30fe923` / `ee20447`。
- 公開先の確認はデプロイ後に追記。

## v0.2.3 タイトルと開始・再開フロー

- タイトルは迷路なしのモード選択に統合し、プラクティスを先頭に配置。
- 開始・次面・リトライ・コンティニュー・ポーズ解除前に3カウント。準備中は入力・物理・HP・時計を進めない。
- ポーズボタンを盤面直上へ移動し、中央の再開ボタンを追加。
- クリア／失敗トースト表示中も設定・凡例・終了操作を使える。設定から元の終了状態に戻る。
- 78テスト成功。ローカルでsmoke/edge/toy/start-flowの4ブラウザ検証成功。新フローは4画面幅で確認。
- 実装コミット `bfc25d7`。動作仕様・検証内容は `start-flow.md`。
- [Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34680980329)（公開コミット `b308902`）。正式URLでv0.2.3を確認。
- HTML・CSS・main・gameConfig・gameScreenの5ファイルがHTTP200、ローカルとのSHA-256一致。
- 正式URLへの `browser-start-flow.mjs` も4画面幅ですべて成功。タイトル／3カウント／停止と再開／結果トースト中の設定と退出／タブ非表示からの復帰を確認、未処理例外0件。

## v0.2.2 C案のビジュアル

正式URL: https://corogalism.sikumilab.com/ 。ユーザー作成のCNAMEコミット `fda35a1` を保持。

- C案の中央トースト、光沢球の転がり、カップ型ゴール、紙吹雪、素材壁を実装。
- 比較画像の葉＋Corogalismロゴを見出し・フッターへ採用。TIME・HP・下部HUDもトイ調に統一。
- 壁はC案由来の同梱テクスチャを使用。ゲーム実行時の外部APIは追加しない。
- 78テスト成功。ブラウザのsmoke・edge・toy検証が成功。
- 4画面幅でクリア／次面／失敗／コンティニュー前後の盤面座標・文書高さ・スクロール位置が一致。クリア・コンティニューのトーストは縦横とも盤面中央。
- アプリ実装コミット: `257a1c3e4e4d9adc7a98930e905d15541a48242a`。
- [Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34679679703)。正式URLでv0.2.2を確認。
- エントリーポイント・描画モジュール・素材PNG・ロゴSVGを含む10ファイルがHTTP200、ローカルとのSHA-256一致。
- 正式URLへの `browser-toy-visuals.mjs` も成功。中央トースト・スクロール不変・実クリック・再開・動きを減らす設定を確認、未処理例外0件。
- 公開画面: `verification/toy/release-375.png`。素材画像を遮断したローカル検証でもCanvas描画へ切り替わり、クリアまで進行可能。
- 実機の質感・転がりの体感は追加試遊で確認する。

## v0.2.1 序盤の難易度調整

- 実装コミット: [`eaab0ec`](https://github.com/gerupon-lgtm/corogalism/commit/eaab0ec77f9d50a5eb12eb551e5f66cebc2d5e84)
- [Pagesデプロイ成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34677165731)
- 1面目の時間2.5倍、通常ダメージ半減、単発上限20%。10面目で従来値へ接続。
- 全76テスト成功。ローカルの両ブラウザ検証成功。100ラン×3条件の後半のバランスは従来値を維持。
- 公開先の `index.html`、`gameConfig.js`、`progression.js`、`hp.js` がHTTP 200かつローカルと一致。
- 公開URLで両ブラウザ検証スクリプトも成功。未処理例外0件。
- 操作感・迷路・素材配置・既存記録は維持。T-209は調整後の再試遊待ち。

以下はv0.2.0の初回公開記録。

## 公開状態

- バージョン: `v0.2.0`
- 公開先: [GitHub Pages](https://gerupon-lgtm.github.io/corogalism/)
- リポジトリ: [gerupon-lgtm/corogalism](https://github.com/gerupon-lgtm/corogalism)
- Pagesの設定: `main` ブランチの `/`、ビルド方式 `legacy`
- アプリ実装コミット: [`ad92c00`](https://github.com/gerupon-lgtm/corogalism/commit/ad92c002266b5dce2663886258f8c1d6de50e73f)
- 公開ジョブ: [pages build and deployment — 成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34676539530)

## Gitの初期化

元の配布フォルダに `git init -b main` を実行し、既存リポジトリを `origin` として登録。
`origin/main` の `3dee28a` を取得し、作業ファイルを保持したままローカルmainをその履歴へ接続した。
フェーズ2の変更を続きのコミットとして追加し、通常のpushで公開。履歴の上書き・force pushは行っていない。
フェーズ0プロトタイプと既存の入力モジュールには差分がないことも確認した。

WindowsのGit HTTPS接続でSchannelエラーが出たため、このリポジトリのローカル設定を
`http.sslBackend=openssl` とした。証明書検証は有効のまま。
作成した `.git` の所有者は通常ユーザーに揃え、通常のGit操作ができる状態にしている。

## 検証

- 公開前: `node --test` **73件成功、失敗0件**。
- Pagesのジョブがアプリ実装コミットで成功したことを確認。
- 公開先の `index.html`、`src/main.js`、`src/game/stagePlay.js`、`style.css`、`package.json`:
  **HTTP 200、SHA-256がローカルと一致**。
- 公開ページの `noindex`、`v0.2.0`、開発中表示を確認。
- 公開URLに対して `browser-smoke.mjs` と `browser-edge-cases.mjs` が成功。未処理例外0件。
  モード選択・停止・クリア・HP0・時間切れ・2回までの再開・記録分離・保存不可・許可のモック分岐を確認。
- 許可モックは実際のiOSセンサー試遊の代替ではない。T-209は引き続き未実施。

## 以後の更新

```powershell
git status
node --test
git add <変更したファイル>
git commit -m "fix(T-xxx): 変更内容"
git push origin main
```

公開確認スクリプトは `BASE_URL` で配信先を切り替えられる。未指定ならローカルの8765番ポート。
Playwrightの準備は [検証手順](verification/README.md) を参照。

```powershell
$env:BASE_URL = 'https://gerupon-lgtm.github.io/corogalism/'
node tools/browser-smoke.mjs
node tools/browser-edge-cases.mjs
```

実機試遊では公開先をHTTPSで開き、Pixel 6aとiPhone XRでT-209を評価する。
