# 盤面外の通知の確認（T-280 / v0.6.23）

公開前の作業記録。公開確認は完了後に追記する。

## 元の問題と比較

変更前は葉っぱの通知が盤面内にあり、`tools/browser-play-notices.mjs`が`guard: notice covers board`で失敗することを確認した。旧版f1652d5から、4画面サイズ×通常／実際の全画面の8条件について盤面・キャンバス・下部の数値・ボタン・ページ全体の寸法を保存した。

全画面後のresizeを両版で完了させて比較する。最初の測定では320×568の全画面だけキャンバスの古いサイズが残ったため、旧版と新版を同条件で測り直した。比較項目や重なり判定は緩めていない。

## 確認コマンド

```powershell
$env:PLAYWRIGHT_MODULE='file:///C:/Users/user/Documents/AI%E9%80%A3%E6%90%BA%E3%82%B2%E3%83%BC%E3%83%A0/.codex-browser/node_modules/playwright/index.mjs'
$env:BASE_URL='http://127.0.0.1:8768/'
node tools/browser-play-notices.mjs
node tools/browser-notice-flow.mjs
node tools/browser-notice-offline.mjs
```

レイアウト確認は実際の画面とUI処理を使う表示診断。プレイの確認とは分ける。接触確認では生成された取得物・床・壁と本編の通知処理を使い、位置合わせと面送りにはデバッグの移動機能を使う。人間の通しプレイや難易度の検証を示すものではない。

[旧版の寸法](play-notices/v0623/baseline.json)。実端末Pixel 6aでの見え方と文字サイズ設定は未確認。

## ローカルの結果

- 全34テストファイルを最大5ファイルずつ7回に分け、192件成功・終了コード0。[各回の記録](play-notices/v0623/node-batches.json)。
- 412×915（倍率2.625）、393×873、360×800、320×568の通常／実際の全画面、計8条件112通知が成功。盤面・キャンバス・数値・ボタン・ページの寸法は旧版と同じ。盤面／数値との重なり、文字の横はみ出しなし。通知の終了で操作案内が戻り、ポーズ・カウント中は非表示。[寸法と表示](play-notices/v0623/local.json)。
- 本編で葉っぱの取得とまもりによる衝突吸収、キャンディ回復、ひとやすみ、砂時計、とりもちの拘束／短縮／脱出を通した14通知が成功。7/8/9/11/13の面を使い、ポーズ・ガイド・終了取消・コンティニュー・床5種の練習を確認。BGM／音の読み込み正常、ブラウザの実行エラーなし。[接触と画面遷移](play-notices/v0623/local-flow.json)。
- 107資材を保存して完全オフラインへ切り替え、床5種の接触通知・BGM・ポーズ／ガイド・両おためしの画面操作・本編への復帰が成功。[オフライン](play-notices/v0623/local-offline.json)。

[Pixel 6a想定の通常表示](play-notices/v0623/local-pixel6a-browser.png)、[全画面](play-notices/v0623/local-pixel6a-fullscreen.png)、[実際のまもり通知](play-notices/v0623/local-actual-guard.png)、[13×13の表示診断](play-notices/v0623/local-large-maze.png)を保存。実機の傾きや人間の読みやすさを確認済みという意味ではない。
