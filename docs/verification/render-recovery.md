# T-277 盤面の縮小とボールの残像 / v0.6.19（2026-10-06）

ブラウザが2D描画領域を復元すると、保存していた画像と描画の倍率も初期状態になる。従来は画面の寸法・端末の画素倍率が同じ場合、倍率の設定と盤面画像の再生成を省略していた。さらに、透明になった盤面画像の重ね描きでは前の球を消せなかった。

## 報告と原因の確認範囲

ユーザーのv0.6.18・やさしい12面の画像では、壁・床が消え、球・アイテム・ゴールが左上に縮小し、球の像が連なっている。BGM・SE・傾き検知は正常との報告。

Chromeで実際の2D描画領域を`reset()`し、復元通知を模擬して同じ表示を再現した。端末の画素倍率2.625で、描画倍率は2.625から1へ落ち、ゴールの位置も約38%に縮小した。壁と床の保存画像が透明になり、残像が残った。[変更前の画像](render-recovery/before/easy-12-restored.png)、[変更前の結果](render-recovery/before/recovery.json)。

これは復元後の状態の再現であり、実端末で描画領域が失われた契機は未確認。端末のメモリ不足や描画処理の障害を原因と断定しない。Canvasの標準的な復元動作は[MDNの仕様説明](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/isContextLost)と[復元通知](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/contextrestored_event)を参照した。

## 修正

- 本編の表示用領域、静止床、静止壁で喪失・復元通知を受け、保存した盤面画像を作り直す。
- 毎回の描画前に倍率を確認し、初期状態に戻っていれば元に戻す。画面寸法が変わらない場合も対象。
- 球の保存画像も復元後に描き直す。球の位置・速度・回転は保持する。
- 前フレームの球を消してから次の盤面を描く。
- 描画領域を利用できない間はそこへ描こうとせず、復元後に再生成する。通常の静止画像の再利用は維持する。

本編と、同じ描画処理を使うボール検証ページが対象。迷路生成・物理・ダメージ・時間設定・入力・音源・次面待機は変更していない。表示版v0.6.19、実行資材103件、キャッシュ`d95966363629c26e`。

## ローカル検証

`tools/browser-render-recovery.mjs`は砂・氷・重力・複合床・通常12面、端末の画素倍率1／2.625／3を比較する。表示用領域・床・壁・球の個別復元と一括復元75条件、通知なしでも倍率から分かる初期化10条件、通常描画15条件を確認した。100条件で倍率・画素・不透明な盤面・移動後の残像なしを確認。[結果](render-recovery/local/recovery.json)。変更前は90条件中79条件で失敗し、変更後は上記100条件が成功。

別に、画素倍率1で通知を送らず全領域を初期化する5条件も記録している。倍率1から1では変化を検知できないため、これは復元成功の件数に含めない。標準の復元通知を受ける条件では倍率1も復元する。この通知を省いた診断条件を、端末での復元動作そのものとは扱わない。

画素比較前には一度読み出してから描き直す。初回読み出しでChromeの描画方式が変わり、復元しない対照条件でも力場の境界に11〜23画素の差が出るため。[対照条件を含む調査](render-recovery/diagnostic/recovery.json)。比較条件を揃えた後は100条件すべて画素差0。

本編12面の画面操作、画面寸法の変更、模擬センサー入力、音声時計を含む確認は`tools/browser-render-game.mjs`。面送りだけデバッグ移動を使い、復元後は実pointer／センサーイベントで動かす。自動操縦を人間の試遊とは説明しない。

ローカル本編は320／390／576幅・両難易度・pointer／模擬センサーの計5条件。すべて12面で復元前後の画素差0、球・げんき・経過時間・成績の保持、復元後の移動・BGM・画面寸法変更が成功。[結果](render-recovery/game-local/results.json)、[傾き操作の12面](render-recovery/game-local/576-easy-tilt-12.png)。

CPU負荷6倍・画素倍率1／3の8条件で描画時間中央値0.6〜3.0ms。砂・氷の静止画像を毎フレーム再生成しないことも成功。[処理時間](render-recovery/performance/current.json)。Nodeの全176テスト・32ファイルは最大5ファイルずつ・並列実行1の7組に分け、すべて終了コード0。[結果](render-recovery/tests.json)。

最終の比較ツールで旧版モジュール`c542f38`を読み込み、12面・画素倍率2.625の7条件を再実行。5条件の失敗と縮小・残像を確認した。[旧版の再確認](render-recovery/before-final/recovery.json)。

ローカル103資材の完全オフラインで、本編3面・脇道の砂・終了確認の取消・両おためしの操作と音が成功。旧物理・旧氷処理の混在防止4経路も成功。[オフライン結果](render-recovery/offline-local.txt)。

公開結果は完了時に追記する。

## 再実行

```powershell
$env:PLAYWRIGHT_MODULE='file:///C:/Users/user/Documents/AI連携ゲーム/.codex-browser/node_modules/playwright/index.mjs'
$env:BASE_URL='http://127.0.0.1:8768/'
node tools/browser-render-recovery.mjs
node tools/browser-render-game.mjs
$env:PERF_OUTPUT='docs/verification/render-recovery/performance'
node tools/browser-floor-performance.mjs
```
