# T-275 終了ボタンの明記と確認 / v0.6.17（2026-10-05）

結果の閲覧と思って挑戦を終えないよう、「終了して結果を見る」と明記して確認を挟む。戻る操作を既定にし、元の待機と成績を保つ。[仕様](../results-and-timing.md)。

## 確認範囲

`tools/browser-run-end-confirm.mjs`で320／390／576px、通常／やさしい、音ON／OFF、クリア・失敗・プレイ中・練習・続行回数切れを確認。クリア・失敗の準備にはデバッグ位置移動と時計進行を使い、終了確認・取消・次面・コンティニューは画面タップとEnter／Escapeで操作する。人間の難易度評価ではない。

確認画面が小画面でも収まり、戻るに最初のフォーカスがあり、背景タップで終了しないことを確認する。取消時は成績・げんき・面数・残り回数を維持。元のボタン待機を再開始せず、確認中の有効化も確認からフォーカスを奪わない。確定時のみ結果へ移る。チャレンジの「1面目」→「2面目」の表示も確認する。

## 検証・公開状態

- ローカルの3幅×両難易度×音ON／OFFの12ケース成功。[結果と画像](run-end-confirm/local/results.json)。一括実行は12ケース後の新規ページ起動待ちで停止したため、未確認の3ケースを別実行で成功した。[プレイ中・練習・回数切れ](run-end-confirm/local-extra/results.json)。実装を変更せず、検証側の初期化待ちを描画待ちから一定間隔の確認へ変更。
- 確認のEnterは既定の「戻る」、Escapeでも取消。背景タップと閉じた確認の連打では終了しない。待機の有効化、フォーカス、面数・回数・成績の維持を確認。プレイ中の確認は時間・げんきを停止し、取消後もポーズを維持。
- 音声・表示用ジングル・ゲーム状態・記録の22テスト成功。5ファイルを1バッチで実行し終了コード0。[テスト記録](run-end-confirm/node-tests.txt)。全176件の再実行ではない。
- キャッシュ`d44def0c6dc1593f`に103資材を保存後、完全オフラインで両おためしと本編へ初回移動。本編の待機後に3面へ進み、実pointer操作・終了確認と取消・発音、旧物理混在防止4経路も成功。[オフライン](run-end-confirm/offline-local.txt)。
- 公開準備中。公開中の版はv0.6.16。

彩度の300msの遷移と物理・音源・制限時間はv0.6.16のまま。色の遷移の直接測定は[前版の確認](end-grayscale.md)を参照。今回の確認では終了操作とそれに関わる状態・音声・保存を対象にする。

## 再実行

```powershell
$env:PLAYWRIGHT_MODULE='file:///C:/Users/user/Documents/AI連携ゲーム/.codex-browser/node_modules/playwright/index.mjs'
$env:BASE_URL='http://127.0.0.1:8768/'
$env:END_CONFIRM_OUTPUT='docs/verification/run-end-confirm/local'
node tools/browser-run-end-confirm.mjs
$env:PRECACHE_COUNT='103'
node tools/browser-ball-offline.mjs > docs/verification/run-end-confirm/offline-local.txt
$env:DEPLOY_HASH_OUTPUT='docs/verification/run-end-confirm/deploy-hashes.json'
python tools/verify-floor-deploy.py
$env:BASE_URL='https://corogalism.sikumilab.com/'
$env:END_CONFIRM_OUTPUT='docs/verification/run-end-confirm/public'
node tools/browser-run-end-confirm.mjs
node tools/browser-ball-offline.mjs > docs/verification/run-end-confirm/offline-public.txt
```
