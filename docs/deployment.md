# フェーズ2 デプロイ記録（2026-09-12）

## v0.3.2 HP表示の整合（2026-09-13）

- HUDの整数表示と被弾・回復の増減を同じ基準へ統一。整数表示が変わらない被弾は「微小」。内部HP計算は維持。
- 101テスト成功、実際の壁衝突を使った3幅のbrowser-hp-display成功。既存browser-challengeも回復・記録・基準設定を4幅で確認。Standards/Specレビュー指摘0。
- アプリ `61cc522`。[Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34725191106)。
- 実行ファイル7個が正式URLでHTTP200、SHA-256一致。正式URLでも3画面幅の実壁衝突から、HP整数と増減表示の一致を確認。未処理例外0。

## v0.3.1 初回操作SE（2026-09-13）

- 操作音を承認済みPCMとして同梱し、初回クリックの通信・デコード待ちを解消。初回モード選択時のdisabledによる発音漏れも修正。
- 97テスト成功。first-soundは通信を停止して4種類の初回操作を検証。既存audioのBGMタイミング・ミュート・失敗時継続も成功。Standards/Spec指摘0。
- アプリ `4bbef7a`。[Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34708135602)。
- 変更した実行ファイル6個が正式URLでHTTP200、SHA-256一致。正式URLでも他音源の通信を止めた初回4操作すべてで操作音が1回開始することを確認。

## v0.3.0 チャレンジの難易度配置（2026-09-13）

- ユーザー指定のバージョン。難易度をチャレンジカード内に配置、選択中の難易度を開始ボタンに明示。
- 4画面幅で難易度選択・両難易度での開始・プラクティス開始・記録初期閉・横はみ出しなしを確認。ゲームロジック変更なし。
- アプリ `1036ce1`。[Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34707596392)。
- 正式URLのHTML/CSS/package.jsonはHTTP200、SHA-256がローカルと一致。正式URLでも4画面幅で配置・両難易度/プラクティス開始・記録初期閉を確認。未処理例外0。

## v0.2.12 チャレンジ拡張（2026-09-13）

- やさしいモード、難易度別記録と折りたたみ表示、回復キャンディ、面テーマ・ゴム壁、基準角度の安定化。
- 95テスト成功。challenge/start-flow/edge-cases/audio/headerのブラウザ検証成功。
- Standards/Specレビュー各1件を修正しブラウザで確認。仕様・調整値・将来案は `challenge-expansion.md`。
- アプリコミット `0ff92a9`。[Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34706740758)。
- 正式URLの実行ファイル19個がHTTP200、ローカルとSHA-256一致。
- 正式URLでも `browser-challenge.mjs` 成功。4幅で記録の開閉・難易度別保存・回復・ゴム壁、センサーの基準保持と再設定を確認。未処理例外0。
- スマホ実機での新HPバランスと基準設定の体感確認は今後。

## v0.2.11 共通ヘッダ（2026-09-13）

- アプリ `3939cd6`、公開 `4e2c8c6`。全画面のヘッダを既存プレイ画面のサイズ・余白へ統一。
- `browser-header.mjs` 成功。6画面サイズと320pxフォント遮断時で全画面のヘッダが一致。修正前CSSと比較し、盤面/HUD/操作ボタン/操作パネルの座標・寸法が完全一致。ポインター操作も確認。
- Standards / Specレビューは指摘0件。ゲームロジック変更なし。
- [Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34703047608)。正式URLのHTML/CSS/package.jsonはHTTP200、SHA-256がローカルと一致。
- 公開先でも390pxのモード・設定・プレイ画面のヘッダ一致と実ポインター入力を確認。未処理例外0。

## v0.2.10 ラン結果とカウント前の間

- アプリ `80982e9` / `c740222`、公開 `645d321`。結果画面をトイ調へ統一し、通常0.6秒・コンティニュー1.5秒のREADYを追加。
- 83テスト成功。start-flow/audio/results/toy/edgeのブラウザ検証成功。Standards / Specレビューとも指摘0件。
- [Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34689212018)。正式URLの変更5ファイルはHTTP200、SHA-256がローカルと一致。

- 正式URLの `browser-results.mjs` / `browser-audio.mjs` も成功。4幅の結果表示、READY中の停止・再開、結果先頭へのスクロール、BGMとSEの既存タイミングを確認。未処理例外0。

## v0.2.9 BGMを毎回先頭から

- アプリ `4dc6b59`、公開 `2d5f8b0`。BGMの停止位置を保存せず、再開・次面・音ON復帰も先頭から再生。ループと開始待機は維持。
- 83テスト成功。Standards / Specレビューとも指摘0件。
- [Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34687955714)。正式URLの変更3ファイルはHTTP200、SHA-256がローカルと一致。

- 正式URLの `browser-audio.mjs` 成功。AudioBufferSourceNode.startのoffset=0・loop=true、承認済み開始間隔、中断・失敗時の処理を確認。未処理例外0。

## v0.2.8 スタートSE後0.2秒の間

- アプリ `de6e997`、公開対象 `03d420d`。スタートSE0.8秒の後に0.2秒待ち、プレイ中だけBGMを開始。
- 83テスト成功。Standards / Specレビューとも指摘0件。
- 正式URLの変更4ファイルはHTTP200、SHA-256がローカルと一致。v0.2.8の配信を確認。
- 正式URLで `browser-audio.mjs` 成功。承認済み待機時間、初回・再開・次面・コンティニューの発音、待機中ポーズ・設定・クリア・終了・ミュートによる停止を確認。未処理例外0。
- Actions一覧では公開対象SHAの実行記録が未取得だったため、配信内容のハッシュと公開ブラウザ検証を公開証跡とする。

## v0.2.7 プレイ中だけのBGM

- アプリ `2035eb4`、公開 `5096b65`。BGMはカウントダウン終了後の操作可能なプレイ中だけ。SEは維持。
- 83テスト・ローカル音声ブラウザ検証成功。Standards / Specレビューとも指摘0件。
- [Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34686541161)。正式URLの変更5ファイルはHTTP200、SHA-256がローカルと一致。

- 正式URLの `browser-audio.mjs` も成功。初回・再開・次面・コンティニューのカウント中停止、プレイ開始時再生、クリア・失敗・設定・タイトル・結果での停止とSE継続を確認。未処理例外0。

## v0.2.6 サウンド・操作配置・ヘッダ

- 承認済みv2 BGMとSE、ポーズ左の音切替、独立音量を実装。検証中注記を維持し、A BIG FEELINGの下端をロゴmに揃えた。
- アプリコミット `0896296`、公開コミット `f00bd52`。83テスト成功。Standards / Specレビューとも指摘0件。
- [Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34686147424)。
- 正式URLのHTML/CSS/JS・設定・音源計25ファイルがHTTP200、ローカルとSHA-256一致。
- 正式URLでも `browser-audio.mjs` と `browser-ui-polish.mjs` が成功。音イベント・停止保存・読込失敗時の継続、5画面幅のヘッダ整列と設定を確認。未処理例外0。
- 実機試聴は未実施。仕様と再確認手順は `audio-implementation.md`。

## v0.2.5 ヘッダ位置調整

- 2段コピーをロゴ末尾mの高さ内へ縮小・位置合わせ。バージョンをロゴ行、注記下の余白を8pxへ。
- アプリコミット `3d17f4f`。ブラウザで320/375/390/464/1280pxの5幅とフォント遮断時を確認、成功。
- Standards / Specレビューは両軸とも指摘0件。
- [Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34683504039)（`2967168`）。正式URLのHTML/CSSはHTTP200、ローカルとSHA-256一致。
- 正式URLで `browser-ui-polish.mjs` 成功。5画面幅、フォント遮断時の表示・設定・停止復帰を確認。

## v0.2.4 UI・素材調整

- タイトル・ロゴ右の2段コピー・記録・操作ボタン・迷路なし設定・M PLUS 1p・壁厚を調整。`ui-polish.md`。
- 79テスト成功、序盤3面×100シード全クリア。4画面幅のブラウザ確認・フォント取得失敗時の操作も成功。
- Standards / Specレビューはいずれも指摘0件。アプリコミット `30fe923` / `ee20447`。
- [Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34682864822)（公開コミット `8059402`）。正式URLでv0.2.4を確認。
- HTML・CSS・main・gameConfig・toyWorld・runScreens・3ウェイトのフォント、計9ファイルがHTTP200かつローカルとSHA-256一致。
- 正式URLへの `browser-ui-polish.mjs` は4画面幅すべて成功。ロゴ右2段コピー、句点での折り返し、記録カード、フォント実読込と遮断時フォールバック、迷路なし設定、停止・復帰を確認。未処理例外0件。

## v0.2.3 タイトルと開始・再開フロー

- タイトルは迷路なしのモード選択に統合し、プラクティスを先頭に配置。
- 開始・次面・リトライ・コンティニュー・ポーズ解除前に3カウント。準備中は入力・物理・HP・時計を進めない。
- ポーズボタンを盤面直上へ移動し、中央の再開ボタンを追加。
- クリア／失敗トースト表示中も設定・凡例・終了操作を使える。設定から元の終了状態に戻る。
- 78テスト成功。ローカルでsmoke/edge/toy/start-flowの4ブラウザ検証成功。新フローは4画面幅で確認。
- 実装コミット `bfc25d7`。動作仕様・検証内容は `start-flow.md`。
- [Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34680980329)（公開コミット `b308902`）。正式URLでv0.2.3を確認。
- HTML・CSS・main・gameConfig・gameScreenの5ファイルがHTTP200、ローカルとのSHA-256一致。
- 正式URLへの `browser-start-flow.mjs` も4画面幅ですべて成功。タイトル／3カウント／停止と再開／結果トースト中の設定と退出／タブ非表示からの復帰を確認、未処理例外0件。

## v0.2.2 C案のビジュアル

正式URL: https://corogalism.sikumilab.com/ 。ユーザー作成のCNAMEコミット `fda35a1` を保持。

- C案の中央トースト、光沢球の転がり、カップ型ゴール、紙吹雪、素材壁を実装。
- 比較画像の葉＋Corogalismロゴを見出し・フッターへ採用。TIME・HP・下部HUDもトイ調に統一。
- 壁はC案由来の同梱テクスチャを使用。ゲーム実行時の外部APIは追加しない。
- 78テスト成功。ブラウザのsmoke・edge・toy検証が成功。
- 4画面幅でクリア／次面／失敗／コンティニュー前後の盤面座標・文書高さ・スクロール位置が一致。クリア・コンティニューのトーストは縦横とも盤面中央。
- アプリ実装コミット: `257a1c3e4e4d9adc7a98930e905d15541a48242a`。
- [Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34679679703)。正式URLでv0.2.2を確認。
- エントリーポイント・描画モジュール・素材PNG・ロゴSVGを含む10ファイルがHTTP200、ローカルとのSHA-256一致。
- 正式URLへの `browser-toy-visuals.mjs` も成功。中央トースト・スクロール不変・実クリック・再開・動きを減らす設定を確認、未処理例外0件。
- 公開画面: `verification/toy/release-375.png`。素材画像を遮断したローカル検証でもCanvas描画へ切り替わり、クリアまで進行可能。
- 実機の質感・転がりの体感は追加試遊で確認する。

## v0.2.1 序盤の難易度調整

- 実装コミット: [`eaab0ec`](https://github.com/gerupon-lgtm/corogalism/commit/eaab0ec77f9d50a5eb12eb551e5f66cebc2d5e84)
- [Pagesデプロイ成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34677165731)
- 1面目の時間2.5倍、通常ダメージ半減、単発上限20%。10面目で従来値へ接続。
- 全76テスト成功。ローカルの両ブラウザ検証成功。100ラン×3条件の後半のバランスは従来値を維持。
- 公開先の `index.html`、`gameConfig.js`、`progression.js`、`hp.js` がHTTP 200かつローカルと一致。
- 公開URLで両ブラウザ検証スクリプトも成功。未処理例外0件。
- 操作感・迷路・素材配置・既存記録は維持。T-209は調整後の再試遊待ち。

以下はv0.2.0の初回公開記録。

## 公開状態

- バージョン: `v0.2.0`
- 公開先: [GitHub Pages](https://gerupon-lgtm.github.io/corogalism/)
- リポジトリ: [gerupon-lgtm/corogalism](https://github.com/gerupon-lgtm/corogalism)
- Pagesの設定: `main` ブランチの `/`、ビルド方式 `legacy`
- アプリ実装コミット: [`ad92c00`](https://github.com/gerupon-lgtm/corogalism/commit/ad92c002266b5dce2663886258f8c1d6de50e73f)
- 公開ジョブ: [pages build and deployment — 成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/34676539530)

## Gitの初期化

元の配布フォルダに `git init -b main` を実行し、既存リポジトリを `origin` として登録。
`origin/main` の `3dee28a` を取得し、作業ファイルを保持したままローカルmainをその履歴へ接続した。
フェーズ2の変更を続きのコミットとして追加し、通常のpushで公開。履歴の上書き・force pushは行っていない。
フェーズ0プロトタイプと既存の入力モジュールには差分がないことも確認した。

WindowsのGit HTTPS接続でSchannelエラーが出たため、このリポジトリのローカル設定を
`http.sslBackend=openssl` とした。証明書検証は有効のまま。
作成した `.git` の所有者は通常ユーザーに揃え、通常のGit操作ができる状態にしている。

## 検証

- 公開前: `node --test` **73件成功、失敗0件**。
- Pagesのジョブがアプリ実装コミットで成功したことを確認。
- 公開先の `index.html`、`src/main.js`、`src/game/stagePlay.js`、`style.css`、`package.json`:
  **HTTP 200、SHA-256がローカルと一致**。
- 公開ページの `noindex`、`v0.2.0`、開発中表示を確認。
- 公開URLに対して `browser-smoke.mjs` と `browser-edge-cases.mjs` が成功。未処理例外0件。
  モード選択・停止・クリア・HP0・時間切れ・2回までの再開・記録分離・保存不可・許可のモック分岐を確認。
- 許可モックは実際のiOSセンサー試遊の代替ではない。T-209は引き続き未実施。

## 以後の更新

```powershell
git status
node --test
git add <変更したファイル>
git commit -m "fix(T-xxx): 変更内容"
git push origin main
```

公開確認スクリプトは `BASE_URL` で配信先を切り替えられる。未指定ならローカルの8765番ポート。
Playwrightの準備は [検証手順](verification/README.md) を参照。

```powershell
$env:BASE_URL = 'https://gerupon-lgtm.github.io/corogalism/'
node tools/browser-smoke.mjs
node tools/browser-edge-cases.mjs
```

実機試遊では公開先をHTTPSで開き、Pixel 6aとiPhone XRでT-209を評価する。

## v0.4.0 / T-229（公開・確認済み）

葉っぱ・床素材・PWAを追加。`node tools/update-precache.mjs` 実行済み。107テスト、4幅、音声、モーション模擬、オフライン／更新を確認。PWA更新でキャッシュ名が変わるため、実行資材の変更後はprecache.jsを必ず再生成する。公開コミット `141640d`。Pages成功: https://github.com/gerupon-lgtm/corogalism/actions/runs/34734209091 。変更した実行資材23件がHTTP200・SHA256一致。正式URLで70資材の保存、オフライン遷移／プレイ／BGM音源読み込み成功（browser-pwa-live.mjs）。

公開後の微調整: 休憩進捗リングが球に隠れない半径へ拡大。390pxの実ブラウザを再確認し、precacheを更新。同じv0.4.0として反映する。

## v0.4.1 / T-230

画面タップでの脱出短縮にかかる受付制限を修正。108テスト、browser-escape-input（本体との二重計上防止）、browser-escape-timing（スマホ相当の6タップ、傾き／擬似操作の両方）が成功。precache更新済み。公開コミット `f896663`、[Pages34735555124](https://github.com/gerupon-lgtm/corogalism/actions/runs/34735555124) 成功。実行資材5件がHTTP200・SHA256一致。正式URLでもbrowser-escape-timing.mjsの傾き／擬似操作の両方が成功。

## v0.4.2 / T-231

自然脱出3秒・0.5秒ずつ短縮・最短0.5秒、盤面内の別位置ダブルタップ、48pxの移動許容、球を避けるヒントと成功表示。109テスト、実タッチの2モード、3幅のヒント配置を確認。precacheを71資材で再生成。公開コミット `1f00540`、[Pages34736358514](https://github.com/gerupon-lgtm/corogalism/actions/runs/34736358514) 成功。実行資材9件のSHA256一致、正式URLで脱出時間の2操作モードとヒント配置・成功表示の確認が成功。

## T-232 v0.4.3

113テスト成功。browser-hourglassで320/390/576pxの見た目・横溢れなし・取得5秒加算・専用SEを確認。証跡はdocs/verification/hourglass/。仕様・規約レビュー指摘なし。precacheは73資材で再生成済み。公開コミット9624df3、[Pages34740187854](https://github.com/gerupon-lgtm/corogalism/actions/runs/34740187854)成功。正式URLで実行資材14件のSHA256一致、砂時計取得・表示・SEを確認。

正式URLのPWA検証も成功。73資材保存・オフライン遷移／ゲーム／BGMを確認。スマホ証跡はviewport撮影とし、全ページ撮影による仮想時計停止中のCanvasリサイズを回避。

## T-233 v0.4.4

browser-pwa: 手動チェックの最新版・更新あり・オフライン・保存失敗、明示更新と別タブ保護成功。仕様・規約レビュー指摘なし。precache73資材を再生成。113テスト成功。公開78b4c39／[Pages34740639772](https://github.com/gerupon-lgtm/corogalism/actions/runs/34740639772)成功。正式URLで実行資材5件のSHA256一致、最新版チェック・オフライン表示・再試行ボタン確認成功。

## T-234 v0.4.5

browser-guide:320/390/576pxで1画面・床等高・本文一致、×／下ボタン／背景／Escapeの閉じる操作、元の位置とフォーカス復帰を確認。高さ480pxでも内部スクロールで閉じられる。証跡docs/verification/guide。113テスト、仕様・規約レビュー指摘なし。公開0de4e79／[Pages34741624671](https://github.com/gerupon-lgtm/corogalism/actions/runs/34741624671)成功。実行資材5件SHA256一致。正式URLの3幅のガイド確認、PWA74資材保存・オフラインのガイド10カード／ゲーム／BGM確認成功。

## T-235 v0.4.6

ガイド見出しのflex中央配置。公開f37ede1／Pages34741923790成功。正式URLの3資材SHA256一致、3幅のガイド確認成功。スクリーンショットguide/を更新。

## T-236 v0.4.7

browser-compact-layout:393×820、390×780、360×800、320×720でトップのコピーライトまで1画面。旧CSSとの比較で迷路・ポーズ位置寸法一致。フォント読み込み完了後に比較。設定は高さ約819px。公開fbaa3a8。正式URLでv0.4.7と実行資材3件のSHA256一致、4サイズの1画面表示・プレイ寸法比較を確認。browser-resultsも4幅のラン結果・コンティニュー・ポーズ／再開成功。仕様・規約レビュー指摘なし。

## T-237 v0.4.8

browser-screen-fit:393×820/390×780/360×800/320×568。トップ・両モード、PAUSEガイドの時間／ボール維持・再開、画面縮小時の座標維持成功。browser-pause-touch:320×480の3ボタン構成でネイティブスワイプ成功。規約・仕様レビュー済み。公開62b63be／Pages34744238335成功。正式URLの6資材SHA256一致、4サイズの両モード・停止維持・再開、ネイティブタッチスクロール成功。113テスト成功。
