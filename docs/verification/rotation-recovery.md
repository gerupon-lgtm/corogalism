# T-293 / v0.7.4 回転後に盤面だけ小さく残る問題

2026-10-17。iPhoneで横向きにして縦向きへ戻すと、本編21面目の外枠は戻るが、迷路が左上に約半分の大きさで残ったという報告への対応。

## 原因を確認した範囲

画面全体の `resize` 通知時には、`svh` を使う盤面の最終幅がまだ確定していない場合がある。従来の本編はこの通知でしか幅を更新せず、盤面自体の幅が後から変わっても、描画用のCanvasと座標変換を更新しなかった。

PC ChromeとPC WebKitで、実アプリの盤面を縮めてresizeを通知し、その後、盤面の幅だけ元へ戻す条件を作った。外枠内幅356pxに対してCanvas幅175pxのまま残り、報告と同じ左上の縮小を再現した。画素倍率は2のまま正常であり、今回の再現条件は前回の描画領域の初期化とは異なる。

通常の縦横切替直後にも一時的な不一致を観測したが、配置通知の待機不足を混同しないよう、最終ツールでは実際の配置完了を最大1秒待って判定している。持続する縮小の判定は、この待機を入れても失敗する「resize後の配置確定」条件を根拠とする。

これはiPhone実機内部の通知順を直接取得した結果ではない。ユーザーの実機報告と、PC上で確認できた同じ表示不整合を区別する。端末のメモリ不足やiOS固有障害を原因と断定しない。

参考：要素自体のサイズを監視する仕組みは、[WebKit公式のResizeObserver説明](https://webkit.org/blog/9997/resizeobserver-in-webkit/)を参照した。

## 修正

- `src/main.js`で盤面要素を`ResizeObserver`に登録し、確定した幅へCanvasとカメラを一緒に合わせる。
- 回転・画面のサイズ変更・表示領域の変化・全画面の出入り・ページ復帰時にも、次の描画タイミングで寸法を確認する。同時の通知はまとめる。
- 配置途中の幅0では縮小しない。表示後に盤面の監視から更新する。
- 球・迷路・動く壁・げんき・時間・成績を作り直さない。保存記録・操作・物理・音のルールは変更しない。
- v0.7.4、資材URLの版を更新。キャッシュ`6948c8799e2f182c`、122資材。

本編、練習、床の練習、基本の遊び方、動く壁の遊び方は同じ本編のサイズ更新を使う。別の床・球・ラケット検証ページは既に各盤面のサイズ監視を持っており、今回その物理や配置は変更しない。

## 再現・回帰確認

`tools/browser-rotation-recovery.mjs`で、実画面の縦横切替、配置が通知後に変わる条件、画素倍率1/3/2、盤面の非表示からの復帰、ページ復帰、状態保持、復帰後のpointer入力、Canvasの透明領域を確認する。

面送りにはdebug位置移動を使う。通常のボタンで次面を開き、復帰後の操作には画面のpointer入力を使う。21面までの移動を人間による迷路完走とは説明しない。仮想時計は待機・時間の条件を揃えるためのものであり、性能測定ではない。

変更前コミット`60eb78af94b55a8383a745e5d805370c31974976`の`main.js`だけを読み込む比較では、両エンジンとも356px対175pxの不一致で終了コード1。表示されるHTMLの版は作業中の0.7.4なので、旧版比較は版表示ではなく読み込んだmain.jsのコミットで区別する。[旧版比較](rotation-recovery/baseline/results.json)。

46ファイルの単体テストを最大5ファイルずつ直列実行し、292成功・失敗0・各終了コード0。[テスト記録](rotation-recovery/tests.json)。新たな表示不具合の検出は、上記の実ブラウザ検証が担当する。

最終ローカルはChrome／PC WebKitの28記録が成功。[回転・復帰](rotation-recovery/local/results.json)。本編21面目のPC WebKitも14記録が成功し、356pxへ回復、進行状態の保持と復帰後のpointer移動、Canvas全領域の不透明性を確認。[21面目](rotation-recovery/stage21/results.json)、[復帰後の画面](rotation-recovery/stage21/webkit-delayed-layout.png)。記録の件数には寸法計測も含む。

以前の描画復元検証は100条件で倍率・画像一致・残像なし、失敗0。通知なし・画素倍率1の5診断条件は成功件数に含めない。[既存対策の再確認](rotation-recovery/render-local/recovery.json)。122資材を保存した完全オフラインで、動く壁の遊び方の通常床・通常壁とpointer入力も成功。[オフライン](rotation-recovery/offline-local/results.json)。

公開アプリ`b30fe8d6c4bd7afcffbb2db03445461f9350d21e`、[Pages39027473725成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/39027473725)。正式URL https://corogalism.sikumilab.com/ 。公開Chrome／PC WebKitでも28記録が成功し、復帰後の幅一致・状態保持・実pointer移動・透明領域0・エラー0を確認。[公開結果](rotation-recovery/public/results.json)。公開122資材の完全オフラインで遊び方とpointer操作も成功。[公開オフライン](rotation-recovery/offline-public/results.json)。

公開125資材すべてHTTP200・SHA-256一致。[全資材](rotation-recovery/deploy-hashes.json)。正式URLの主要6資材は本文とContent-Typeも一致。[形式と本文](rotation-recovery/deploy-headers.json)。

iPhone実機で回転後も正常か、センサーや音を含めた実機での再発有無は追加確認の対象。

## 再実行

```powershell
$env:PLAYWRIGHT_MODULE='file:///C:/Users/user/Documents/AI連携ゲーム/.codex-browser/node_modules/playwright/index.mjs'
$env:WEBKIT_EXECUTABLE='C:/Users/user/AppData/Local/ms-playwright/webkit-2336/Playwright.exe'
$env:BASE_URL='http://127.0.0.1:8786/'
$env:ROTATION_OUTPUT='docs/verification/rotation-recovery/local'
$env:ROTATION_EXTENDED='1'
node tools/browser-rotation-recovery.mjs
```

旧版比較は`ROTATION_BASELINE`に上記コミットを指定する。`ROTATION_STAGE=21`で本編21面目、`ROTATION_ENGINES=webkit`でPC WebKitのみを検証できる。WebKit実行ファイルの指定はこの環境の既存インストールに対応するためで、iPhone Safariの実機検証ではない。
