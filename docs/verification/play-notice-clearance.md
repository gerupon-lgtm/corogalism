# 外周と通知の隙間（T-282 / v0.6.25）

前版v0.6.24は通知の上と盤面の表示枠との間が通常2px、高さ800px以下は0px。盤面の2pxの影もあり、通知の背景が接触して見えていた。ゲーム上の理由はなく、既存の案内の高さへ収める配置の問題。ユーザー指示により通知を4px下へ移す。[現行仕様](../play-notices.md)。

短い画面では14pxの通知の下に1pxしかなかったため、通知だけ下げると数値に重なる。下部パネルの上下の余白の合計16pxを維持して、上12px／下4pxへ振り替える。中身の位置は4px下へ移るが、盤面・パネル・ボタン・ページの高さは増えない。文字の大きさや背景の高さを縮めない。

## 再現と確認方法

修正前の実際のブラウザで最低4pxの隙間を求める確認を行い、`guard: notice clearance 2px is below 4px`で失敗することを確認。修正後は通常6px、短い画面4px、通知から下の数値まで通常13px／短い画面1pxを確保する。

```powershell
$env:PLAYWRIGHT_MODULE='file:///C:/Users/user/Documents/AI連携ゲーム/.codex-browser/node_modules/playwright/index.mjs'
$env:NOTICE_VERSION='0.6.25'
$env:NOTICE_MIN_GAP='4'
$env:NOTICE_PANEL_SHIFT='4'
$env:BASE_URL='http://127.0.0.1:8768/'
node tools/browser-play-notices.mjs
node tools/browser-notice-offline.mjs
```

別のターミナルで`python -m http.server 8768 --bind 127.0.0.1`。公開はBASE_URLを`https://corogalism.sikumilab.com/`へ変更する。

旧版の寸法を厳密に比較し、短い画面の数値・操作・終了リンクのy座標だけ+4pxを許可する。他の座標・寸法、ページの高さは一致が必要。通知を出しても配置が動かず、全通知に最低4pxの隙間があり、下の数値との重なり・横はみ出しがないことを確認する。

## ローカル

412×915（倍率2.625）、393×873、360×800、320×568の通常／実際の全画面、計8条件112表示が成功。[寸法と隙間](play-notices/v0625/local.json)。107資材の完全オフラインで床5種の実接触通知・BGM・ポーズ／ガイド・両おためしの画面操作・本編への復帰も成功。[オフライン](play-notices/v0625/local-offline.json)。

全34ファイルを最大5ファイルずつ7回に分け、192テスト成功・全回終了コード0。[各回の記録](play-notices/v0625/node-batches.json)。キャッシュ76b9e37c6f21663b・107資材。

[通常表示](play-notices/v0625/local-pixel6a-browser.png)、[全画面](play-notices/v0625/local-pixel6a-fullscreen.png)、[短い画面の通常表示](play-notices/v0625/local-pixel6a-large-ui-browser.png)、[短い画面の全画面](play-notices/v0625/local-pixel6a-large-ui-fullscreen.png)を確認。

表示診断と位置合わせを含む接触確認であり、人間の通しプレイではない。Pixel 6a実機の表示設定・見え方は未確認。

## 公開先

アプリa672ce3を[Pages37698998650](https://github.com/gerupon-lgtm/corogalism/actions/runs/37698998650)で公開。110ファイルすべてHTTP200・SHA-256一致。[配信の照合](play-notices/v0625/deploy-hashes.json)。main統合後は通知関連5ファイル17テストも成功してからpushした。

公開でも8条件112表示が成功。外周との隙間は通常6px／短い画面4px。盤面・キャンバス・各部の寸法・ページの高さは維持。短い画面の下部パネル内の座標だけ+4px。通知による配置の変化、下の数値との重なり、横はみ出し、実行エラーなし。[公開の寸法と隙間](play-notices/v0625/public.json)。

107資材の完全オフラインで床5種の実接触通知・BGM・ポーズ／ガイド・両おためし・本編への復帰も成功。[公開のオフライン](play-notices/v0625/public-offline.json)。

[公開の通常表示](play-notices/v0625/public-pixel6a-browser.png)、[全画面](play-notices/v0625/public-pixel6a-fullscreen.png)、[短い画面の通常表示](play-notices/v0625/public-pixel6a-large-ui-browser.png)、[短い画面の全画面](play-notices/v0625/public-pixel6a-large-ui-fullscreen.png)。実機の表示設定・体感は未確認として残す。
