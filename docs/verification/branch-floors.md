# T-272 ルート外の床配置を確認 / v0.6.14（2026-10-04）

床の模様から正解ルートが分からないよう、既存のルート上の体験を残し、砂・力場・ひとやすみ・とりもちを脇道にも配置する。取得アイテムは最短ルート上。固定チュートリアルのキャンディと葉っぱも移動する。[仕様](../floor-placement.md)。

## ローカル確認

- 自動テスト176件成功。最大5ファイルずつ7バッチ、各終了コード0。脇道配置・取得物のルート・脇道の回復／脱出・床ごとの使用状態の引き継ぎを追加確認。[記録](branch-floors/tests.json)。
- 変更前と同じ30シード×20面×2難易度＝1,200条件で、迷路の形、ルート上の砂、従来の力場を維持。取得物はルート上、制限時間は短縮なし。追加力場がルートのマス中心へ届く14条件も除外せず記録。[配置比較](branch-floors/placement.json)、[変更前の条件](branch-floors/previous-placement.json)。
- 180ms程度の反応間隔と操作の乱れを加える自動操縦では1,200条件すべてクリア。[全条件](branch-floors/balance.json)。慎重なやさしい操縦は600条件中567クリア、33失敗。以前のv0.6.4検証と失敗の面・シード・理由がすべて同じ。[慎重な操縦](branch-floors/balance-careful.json)、[以前の条件](tutorial-floors/balance-careful.json)。人間の成功率ではない。
- Chromeの320／390／576幅で通常／やさしい各1〜16面、計96画面の配置を確認。ルート外の砂・力場・ひとやすみ・とりもち、取得物のルート、横にはみ出さないこと、ガイドとポーズを確認。[画面確認](branch-floors/browser/results.json)。この確認は面の移動にデバッグ位置移動を使用する。
- 上記6経路で脇道のとりもちを画面タップで脱出。通常の画面操作で壁へ当ててげんきを減らし、脇道のひとやすみで回復・進捗表示・ポーズ時リセットを確認。時間切れ後のコンティニューでも使用済み床が復活しない。げんきは書き換えていない。
- 別のChrome通し確認では位置・げんきを書き換えず、実際のpointer入力で通常／やさしい各1〜16面、計32面をクリア。砂・氷・両力場・とりもち、ポーズ／ガイド／結果画面を通した。[通しプレイ](branch-floors/main/browser-playthrough.json)。こちらも操縦プログラムによる操作であり、実機での人の体感とは区別する。

最初の画面確認で、やさしい面の既存力場と同じ広い間隔を追加分にも適用すると、脇道へ置けない面が見つかった。ルート上の既存力場同士の間隔を維持し、追加分は元の一般配置と同じ間隔で候補を探すよう修正後、全96画面を再確認した。

検証サーバーの読み込み待ちで確認が止まった回もあった。サーバーのログ出力先をファイルへ変更し、別ポートで再実行して完了した。ゲームの不具合と断定しない。

## オフラインとチュートリアル

- キャッシュ`a74ac540b0c6f99a`に102資材を保存し、完全オフラインの未訪問URLでボール・床・本編へ移動、素材音と画面操作を確認。新しい脇道の砂を本編3面で生成し、実pointerで移動できた。[オフライン](branch-floors/offline-local.txt)。
- チュートリアルをChrome3幅で確認。砂・氷・重力・反重力・コルクの接触説明とポーズ／再開、390幅の実pointer通しクリア、チャレンジ記録へ混ぜないことを確認。[チュートリアル](branch-floors/tutorial/tutorial-pointer.json)。キャンディ・葉っぱ・砂時計のルート上の配置は自動テストでも確認。

## 公開確認

公開反映と公開版での確認は、ローカル確認の完了後に記録する。実端末のセンサー操作、脇道の見た目、追加力場の手触りは試遊で追加評価する。

## 再実行

Playwrightは検証用環境のものを使い、ローカルHTTPサーバーのログはファイルへ出す。テストは最大5ファイルずつ、ブラウザ検証は逐次実行する。

```powershell
node tools/verify-branch-floors.mjs
$env:BALANCE_OUTPUT='docs/verification/branch-floors/balance.json'
node tools/balance-floor-challenge.mjs
$env:BALANCE_PROFILE='careful'
$env:BALANCE_LEVEL='easy'
$env:BALANCE_OUTPUT='docs/verification/branch-floors/balance-careful.json'
node tools/balance-floor-challenge.mjs
Remove-Item Env:BALANCE_PROFILE, Env:BALANCE_LEVEL

$env:BASE_URL='http://127.0.0.1:8768/'
$env:PLAYWRIGHT_MODULE='file:///C:/Users/user/Documents/AI連携ゲーム/.codex-browser/node_modules/playwright/index.mjs'
node tools/browser-branch-floors.mjs
$env:PLAY_OUTPUT='docs/verification/branch-floors/main'
$env:PLAY_STAGES='16'
node tools/browser-floor-playthrough.mjs
$env:PRECACHE_COUNT='102'
node tools/browser-ball-offline.mjs
```
