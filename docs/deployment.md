# フェーズ2 デプロイ記録（2026-09-12）

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
