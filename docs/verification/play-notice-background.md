# 通知のクリーム色の背景（T-281 / v0.6.24）

ユーザー承認の「薄いクリーム色の小さな角丸背景」を実装。通知は従来の16px、短い画面は14pxに収め、縦の余白は増やさない。背景色に合わせ文字を茶色、脱出成功を濃い緑にする。表示の位置・優先順位・時間・通知処理はv0.6.23を維持。[仕様](../play-notices.md)。

## 確認方法

既存のブラウザ確認を使い、v0.6.23の記録を上書きせず版ごとに保存する。旧版f1652d5の寸法とも比較する。

```powershell
$env:PLAYWRIGHT_MODULE='file:///C:/Users/user/Documents/AI%E9%80%A3%E6%90%BA%E3%82%B2%E3%83%BC%E3%83%A0/.codex-browser/node_modules/playwright/index.mjs'
$env:NOTICE_VERSION='0.6.24'
$env:BASE_URL='http://127.0.0.1:8768/'
node tools/browser-play-notices.mjs
node tools/browser-notice-offline.mjs
```

ローカルの配信は別のターミナルで`python -m http.server 8768 --bind 127.0.0.1`。公開ではBASE_URLを`https://corogalism.sikumilab.com/`へ変更する。

## ローカルの結果

412×915（倍率2.625）、393×873、360×800、320×568、通常／実際の全画面の計8条件112表示が成功。盤面・キャンバス・数値・ボタン・ページの寸法は旧版と同じ。盤面や数値との重なり、長い脱出案内の横はみ出しなし。通知の終了・ポーズ・カウント時の非表示も確認。[記録](play-notices/v0624/local.json)。

[通常表示](play-notices/v0624/local-pixel6a-browser.png)、[全画面](play-notices/v0624/local-pixel6a-fullscreen.png)を目視確認。実機Pixel 6aの表示設定・体感は未確認。表示診断と位置合わせを含む接触確認であり、人間の通しプレイを示すものではない。

107資材を保存して完全オフラインに切り替え、床5種の実接触通知・BGM・ポーズ／ガイド・両おためしの画面操作・本編への復帰も成功。実行エラーなし。[オフライン](play-notices/v0624/local-offline.json)。

全34ファイルを最大5ファイルずつ7回に分け、192テスト成功・全回終了コード0。[各回の記録](play-notices/v0624/node-batches.json)。表示版v0.6.24、キャッシュbad71ce3a170dc98・107資材。

公開確認は進行中。
