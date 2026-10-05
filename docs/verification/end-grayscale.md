# T-274 ボタンのグレースケールと滑らかな彩度復帰 / v0.6.16（2026-10-05）

無効なボタンをグレースケールにし、押せる状態になってから300msかけて元の彩度へ戻す。[現行仕様](../results-and-timing.md)。待機時間やゲームの計算は変更しない。

## 確認方法

`tools/browser-end-actions.mjs`で320／390／576px、通常／やさしい、音ON／OFF、練習／床の練習／チュートリアル、光の滑走路、音声機能なし・動きを減らす設定を確認する。面の終了にはデバッグ位置移動を使う。待機中の実タップ・キー入力と、有効化後の次面移動・コンティニューは画面操作で確認する。

ブラウザが生成する色の遷移を150msの位置で止め、灰色と元の色の間に補間されることを確認する。通常設定の遷移は300ms、動きを減らす設定は即時。途中からボタンが有効であり、遷移の終了後は元の色へ戻る。待機中の色は`grayscale(1)`。

## 検証・公開状態

- ローカル18ケース成功。[結果と画像](end-grayscale/local/results.json)。150msの途中値は`grayscale(0.197597)`、300msの遷移と、その途中で操作が有効なことを確認。表示中の無効な全ボタンはグレースケール。有効化後は元の色・寸法へ戻り、次面移動とコンティニューも成功。
- 動きを減らす設定は即時切り替え。音声機能なしでも待機から復帰し、回数切れの非表示と画面移動時の待機取消も成功。
- キャッシュ`e214650bf9b68d63`に102資材を保存後、完全オフラインで未訪問の両おためしと本編へ移動。本編の待機後に3面へ進み、操作・発音、旧物理と旧氷処理の混在防止4経路も成功。[オフライン記録](end-grayscale/offline-local.txt)。
- 公開確認は実行中。公開中の版はv0.6.15。

物理・音源・制限時間は今回変更せず、それらの全自動テストは再実行しない。人間の体感・実端末の傾き確認とは区別する。

## 再実行

```powershell
$env:PLAYWRIGHT_MODULE='file:///C:/Users/user/Documents/AI連携ゲーム/.codex-browser/node_modules/playwright/index.mjs'
$env:BASE_URL='http://127.0.0.1:8768/'
$env:END_ACTION_OUTPUT='docs/verification/end-grayscale/local'
node tools/browser-end-actions.mjs
$env:PRECACHE_COUNT='102'
node tools/browser-ball-offline.mjs > docs/verification/end-grayscale/offline-local.txt
$env:DEPLOY_HASH_OUTPUT='docs/verification/end-grayscale/deploy-hashes.json'
python tools/verify-floor-deploy.py
$env:BASE_URL='https://corogalism.sikumilab.com/'
$env:END_ACTION_OUTPUT='docs/verification/end-grayscale/public'
node tools/browser-end-actions.mjs
node tools/browser-ball-offline.mjs > docs/verification/end-grayscale/offline-public.txt
```
