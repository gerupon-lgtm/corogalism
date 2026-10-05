# T-273 結果ボタンの短い待機 / v0.6.15（2026-10-05）

ジングルを聞き、次へ進む前の間を作るため、結果画面から進むボタンへ短い待機を入れる。[仕様と音の長さ](../results-and-timing.md)。追加文言とバーは使わず、既存のボタン名・大きさを保つ。

## 確認範囲

- 音声・表示用ジングル・ゲーム状態・記録の既存自動テスト22件成功。5ファイルの1バッチで終了コード0。[テスト記録](end-actions/node-tests.txt)。全176件の再実行ではない。
- `tools/browser-end-actions.mjs`で18ケース成功。3画面幅・通常／やさしい・音ON／OFFの12経路、練習／床の練習／チュートリアル、光の滑走路の音ON／OFF、音声機能のない端末と動きを減らす設定。面の終了にはデバッグ位置移動を使い、待機中／有効化後は実際の画面タップとキー入力で確認した。[ローカル結果](end-actions/local/results.json)。人間の難易度評価と混同しない。
- 待機の直前までボタンが無効で、待機後に次の面へ進む／コンティニューで残り1回になることを確認。音OFFでも同じ時間、連続失敗で回数を使い切った後は無効のまま。文字・寸法・プレイタイム・成績を待機前後で維持。待機中に終了して結果を見ても古い待機が画面を戻さない。
- 最初の確認で、待機中のコンティニューにも既存の「無効なら非表示」が適用される不具合を検出。待機中は表示を保ち、使用回数が残らないときだけ従来どおり非表示に修正した。
- 無効なボタンへのタップでフォーカスが本文へ移る場合も、有効化後に次の操作へ戻れるよう修正。待機中にほかの操作へ移った場合は、その操作からフォーカスを奪わない。
- 位置とげんきを書き換えず、実pointer操作で通常／やさしい各1〜3面、計6面を通しクリア。次の面の待機後、従来のREADYとカウントを経て操作できる。[通しプレイ](end-actions/main/browser-playthrough.json)。操縦プログラムによる確認であり、人間の難易度評価ではない。
- キャッシュ`68d971c033ccf957`に102資材を保存し、完全オフラインで未訪問URLのボール・床・本編へ移動。新しい待機を経て本編3面まで進め、実pointer移動、素材音、旧物理と旧氷処理の混在を止める4経路も成功。[オフライン](end-actions/offline-local.txt)。

## 公開とオフライン

ローカル確認完了後、公開ファイルの一致、公開ブラウザ、完全オフラインの確認結果を追記する。ジングルと次へ進む間の体感は、実端末の試遊で追加評価する。

## 再実行

Playwrightは既存の検証用環境を使用する。テストは最大5ファイル、重いブラウザ確認は逐次実行する。

```powershell
$env:PLAYWRIGHT_MODULE='file:///C:/Users/user/Documents/AI連携ゲーム/.codex-browser/node_modules/playwright/index.mjs'
$env:BASE_URL='http://127.0.0.1:8768/'
node tools/browser-end-actions.mjs
$env:PLAY_STAGES='3'
$env:PLAY_OUTPUT='docs/verification/end-actions/main'
node tools/browser-floor-playthrough.mjs
$env:PRECACHE_COUNT='102'
node tools/browser-ball-offline.mjs > docs/verification/end-actions/offline-local.txt

$env:DEPLOY_HASH_OUTPUT='docs/verification/end-actions/deploy-hashes.json'
python tools/verify-floor-deploy.py
$env:BASE_URL='https://corogalism.sikumilab.com/'
$env:END_ACTION_OUTPUT='docs/verification/end-actions/public'
node tools/browser-end-actions.mjs
node tools/browser-ball-offline.mjs > docs/verification/end-actions/offline-public.txt
```
