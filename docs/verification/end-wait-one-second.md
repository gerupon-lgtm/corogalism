# T-276 次の面への待機1秒＋彩度復帰0.3秒 / v0.6.18（2026-10-06）

ユーザーの指定に合わせ、通常と特殊面の「次へ」を1秒後に有効化する。有効化から0.3秒で彩度を戻し、途中から操作できる。[仕様](../results-and-timing.md)。

## 確認範囲

`tools/browser-end-actions.mjs`で3画面幅・両難易度・音ON／OFF、練習・床の練習・チュートリアル・特殊面、音声機能なしと動きを減らす設定を確認する。面の終了にはデバッグ移動を使い、ボタンは画面タップとキー入力で操作する。

`tools/browser-run-end-confirm.mjs`は390px・通常・音ON／OFFに絞り、追加のプレイ中・練習・回数切れと合わせて5経路を確認する。1秒より前に終了確認を取り消し、待機を再開始せず元の期限で有効になることを確かめる。

ゲームの物理・音源・制限時間を変更しないため、難易度・物理の全テストは再実行しない。人間の試遊や実端末のセンサー確認とは区別する。

## 検証・公開状態

- ローカル18ケース成功。3幅×両難易度×音ON／OFFの12経路に加え、練習3種類、特殊面の音ON／OFF、音声機能なし・動きを減らす設定を確認。[結果と画像](end-wait-one-second/local/results.json)。1秒前は無効、有効化後の彩度復帰は300msで、色の途中から操作可能。
- 終了確認の取消5経路も成功。1秒より前に戻っても待機を再開始せず、元の期限で有効化。成績・回数の維持とプレイ中の停止、練習・回数切れも確認。[終了確認](end-wait-one-second/confirm-local/results.json)。
- キャッシュ`cb508eed4df56984`に103資材を保存後、完全オフラインで両おためしと本編へ初回移動。本編3面、操作・終了確認の取消・発音・旧物理混在防止4経路も成功。[オフライン](end-wait-one-second/offline-local.txt)。
- アプリ`6bee2df`を通常pushし、[Pages37381379984成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37381379984)。[正式URL](https://corogalism.sikumilab.com/)はv0.6.18。公開106資材がHTTP200・SHA-256一致。[配信確認](end-wait-one-second/deploy-hashes.json)。
- 公開Chromeは3幅×両難易度×音ON／OFFの12ケース成功。1秒の有効化、300msの彩度復帰、次面移動・コンティニューを確認。[公開結果と画像](end-wait-one-second/public/results.json)。特殊面などを含む18ケース全体はローカルで確認し、公開は同一資材の主要12経路に絞った。
- 公開の終了確認5経路も成功し、取消で元の待機を維持。[公開の終了確認](end-wait-one-second/confirm-public/results.json)。103資材保存後の完全オフラインでも本編3面・操作・終了確認・音・旧物理混在防止4経路を確認。[公開オフライン](end-wait-one-second/offline-public.txt)。

## 再実行

```powershell
$env:PLAYWRIGHT_MODULE='file:///C:/Users/user/Documents/AI連携ゲーム/.codex-browser/node_modules/playwright/index.mjs'
$env:BASE_URL='http://127.0.0.1:8768/'
$env:END_ACTION_OUTPUT='docs/verification/end-wait-one-second/local'
node tools/browser-end-actions.mjs
$env:END_CONFIRM_WIDTHS='390'
$env:END_CONFIRM_LEVELS='normal'
$env:END_CONFIRM_OUTPUT='docs/verification/end-wait-one-second/confirm-local'
node tools/browser-run-end-confirm.mjs
$env:PRECACHE_COUNT='103'
node tools/browser-ball-offline.mjs > docs/verification/end-wait-one-second/offline-local.txt
$env:DEPLOY_HASH_OUTPUT='docs/verification/end-wait-one-second/deploy-hashes.json'
python tools/verify-floor-deploy.py
$env:BASE_URL='https://corogalism.sikumilab.com/'
$env:END_ACTION_CORE_ONLY='1'
$env:END_ACTION_OUTPUT='docs/verification/end-wait-one-second/public'
node tools/browser-end-actions.mjs
$env:END_CONFIRM_OUTPUT='docs/verification/end-wait-one-second/confirm-public'
node tools/browser-run-end-confirm.mjs
node tools/browser-ball-offline.mjs > docs/verification/end-wait-one-second/offline-public.txt
```
