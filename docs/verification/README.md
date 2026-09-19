# フェーズ2の検証

## v0.2.11 ヘッダ統一（2026-09-13）

`tools/browser-header.mjs` で全画面のヘッダ寸法・フォントサイズ・座標を比較。修正前CSSを使用したプレイ画面との盤面/HUD/操作ボタンの完全一致と、実際のポインター入力を検証する。対象は320/375/390/464/1280px、横長812x375、320pxのフォント読込失敗時。CSSのみの変更でゲームロジックは変更していない。公開確認は `../deployment.md`。

## v0.2.10 ラン結果とカウント前の間

- `node --test`: 83件成功。
- `browser-results.mjs`: 4幅で結果カードと新記録、0.6秒/1.5秒のREADY、入力・HP・時計停止、ポーズ復帰、キー操作による再挑戦を確認。
- start-flow/audio/toy/edgeの既存ブラウザ検証も成功。カウントとSE、トースト中の操作、スクロール不変、センサー許可と保存不可時を確認。未処理例外0。

## v0.2.9 BGMを毎回先頭から

- `node --test`: 83件成功。
- `browser-audio.mjs`: AudioBufferSourceNode.startの実呼出しを観測し、初回・ポーズ復帰・次面・コンティニュー・音ON復帰でoffset=0、loop=trueを確認。修正前は再開時offset=0.96秒で失敗、修正後成功。
- スタートSE後0.2秒の間、待機中中断、SE・音量保存・読込失敗時の動作も成功。

## v0.2.8 スタートSE後のBGM

- `node --test`: 83件成功。
- `browser-audio.mjs`: スタートSE0.8秒＋間0.2秒の待機後にBGM開始。初回・再開・次面・コンティニューで確認。
- 待機中のポーズ・設定・クリア・終了・ミュートで遅延BGMが鳴らないこと、操作開始・SE・保存・音源失敗時の動作も確認。未処理例外0。

## v0.2.7 BGM再生条件

- `node --test`: 83件成功。
- `browser-audio.mjs`: BGMは3/2/1中に停止し操作開始時だけ再生、ポーズ復帰・次面・コンティニューも同じ。クリア・ゲームオーバー・設定・タイトル・ラン結果の停止とSE継続を確認。

## v0.2.6 サウンドとヘッダ

- `node --test`: 83件成功、失敗0。
- `browser-audio.mjs`: 音源14件のデコード、各イベント発音、停止・保存・失敗時の継続、音ボタン配置・注記維持を確認。
- `browser-ui-polish.mjs`: 5幅で最終行とロゴのベースライン一致、設定・フォント遮断時を確認。
- `browser-start-flow.mjs` / `browser-toy-visuals.mjs`: 4幅でカウント・停止再開・トースト中操作・スクロール不変が成功。
- 未処理例外0。実機試聴は未実施。公開確認は `../deployment.md`。

## v0.2.1 序盤の調整

`node --test` は76件成功（従来73件＋序盤の時間・HP・段階的な復帰の3件）。
1面目の時間を2.5倍、通常ダメージを半分、単発上限を20%とし、10面目で従来値に戻す。
100ラン×3条件のバランス結果は下表と同じ。詳細は `../run-and-score.md` §10。
ローカルと公開URLの両方で、2本のブラウザ確認スクリプトが成功。更新した設定・HP・難易度の配信内容もローカルと一致。
以下のv0.2.0の結果は初回公開時の記録として残す。

対象: `v0.2.0`。ローカルに加え、公開サイト `https://gerupon-lgtm.github.io/corogalism/` でも両ブラウザスクリプトが成功。

## 結果

- `node --test`: **73件成功、失敗0件**。
  既存60件（バランス回帰を含む）、保存6件、面の進行7件。
- `tools/browser-smoke.mjs`: Chromeで成功。プラクティス、ポインター入力、停止・設定・非表示、
  チャレンジのクリア・時間切れ、2回のコンティニュー、記録分離とリロード、画面サイズ、デバッグフック非公開を確認。
- `tools/browser-edge-cases.mjs`: Chromeで成功。実際の物理衝突による被弾・HP0、全回復、
  後半の素材、許可取得のユーザー操作起点、許可／拒否／値が届かない場合、再調整と保存、保存不可環境でのプレイを確認。
- ブラウザの未処理例外: 両スクリプトとも0件。
- `node tools/balance.mjs`: Windowsの起動判定を修正して実測。100ランずつで従来値と一致。

| urgency | 中央値 | HP0 | 時間切れ | 上限到達 |
|---|---:|---:|---:|---:|
| 1.00 | 12面 | 0 | 100 | 0 |
| 1.15 | 14面 | 9 | 91 | 0 |
| 1.30 | 15面 | 45 | 55 | 0 |

- 静的レビューで「微速のまま進むと時計が始まらない」を検出。
  再現テストの失敗を確認後、チャレンジの開始位置から0.02マス移動でも時計を開始するよう修正。
  回帰テスト成功、限定再レビューの追加指摘なし。

センサー許可とイベントはChrome上のモック。iPhone Safariの実センサー確認を代替するものではない。
375×812で盤面・HP・時間・停止ボタンが同時に見えることを確認。
320×568、390×844、1280×900でも横方向のはみ出しがないことを確認。

## 再実行（PowerShell、プロジェクト直下）

通常のゲームには依存パッケージ・ビルド・外部APIは不要。ブラウザ確認時だけPlaywrightを使用する。

```powershell
node --test
# 別ターミナルでローカル配信
python -m http.server 8765 --bind 127.0.0.1
```

今回の環境では検証用Playwrightを親フォルダの `.codex-browser` に分離している。

```powershell
npm.cmd install --prefix ../.codex-browser --cache ../.codex-browser/cache --no-save --no-package-lock playwright
$env:PLAYWRIGHT_MODULE = ([System.Uri](Resolve-Path ../.codex-browser/node_modules/playwright/index.mjs).Path).AbsoluteUri
$env:CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node tools/browser-smoke.mjs
node tools/browser-edge-cases.mjs
```

公開版を確認する場合は実行前に `$env:BASE_URL = 'https://gerupon-lgtm.github.io/corogalism/'` を設定する。
ローカルへ戻す場合は `Remove-Item Env:BASE_URL -ErrorAction SilentlyContinue`。

ブラウザスクリプトはテスト専用の新規ブラウザコンテキストを使用し、ユーザーの普段の記録は変更しない。
時刻の制御と既存の `?debug=1` フックで終了条件を再現する。記録テストでは成功・失敗両方を確認する。

## 表示の記録

- [モード選択](mode-375.png)
- [チャレンジ1面目](challenge-375.png)
- [被弾](damage-375.png)
- [15面目の石・棘](materials-stage15-375.png)
- [クリア](clear-375.png)
- [時間切れ](over-375.png)
- [ラン結果](result-375.png)

ゴムは描画実装があるが、既存の配置では出現しない。標準・ゴム・石・棘・苔の5種類と縦横壁については
描画担当がモックCanvasでクリップ範囲を検証済み。素材を追加配置する場合はバランスの再測定が必要。

## 残る実機確認（T-209）

Pixel 6a（Chrome）とiPhone XR（Safari）で、HTTPSに公開した版を試遊する。
操作感・被弾の分かりやすさ・素材の識別・時間の厳しさ・腕の負担を確認する。
Git初期化・コミット・push・Pages公開は完了。デプロイ記録は `../deployment.md`。

## T-225 チャレンジ拡張

`node tools/browser-challenge.mjs`：4画面幅で難易度・記録開閉・キャンディ回復・ゴム壁。初回安定測定・ページ内の基準保持・明示測定と中断・タッチへの切替も検証。`PLAYWRIGHT_MODULE` / `BASE_URL` は他のスクリプトと共通。

`node tools/balance-challenge.mjs`：面テーマ・回復込みで通常/やさしい、各30シード・2通りの操縦を計測。従来曲線の比較用検証は `tools/balance.mjs` に維持。

新しい画面証跡は `challenge/`。他のディレクトリは過去版の記録として保持する。

## T-228 HP表示

`node tools/browser-hp-display.mjs`：320/390/1280pxで実際の壁衝突を発生させ、微小ダメージ・整数をまたぐダメージとHUDの一致を確認。公開先もBASE_URL指定で確認済み。証跡は `hp-display/`（v0.3.2）。

## T-229 v0.4.0

`features/approved-concept.png` が承認画像、`features/{leaf,rest,sticky}-{320,390,576,1280}.png` が実画面。
`node --test`:107件成功。`browser-features.mjs`:4幅の取得・休憩・脱出と盤面寸法。`browser-escape-input.mjs`:画面／本体タップ・二重計上防止。`browser-pwa.mjs`:初回制御・オフライン音源・タイトル更新・別タブ保護・保存失敗時フォールバック。既存browser-audio/first-sound成功。本体タップの実機感度は利用端末で確認が必要。

正式URL: アプリ141640d、Pages34734209091成功。変更資材23件の一致とbrowser-pwa-live（70件のキャッシュ・オフライン起動／音源）成功。
公開先のbrowser-featuresも4幅成功。最終描画調整として休憩の進捗リングをボール外側に広げ、390pxで再確認。

## T-230 v0.4.1

`node --test`:108件成功。新しいescape-timing.test.jsは修正前に1.5秒のままで失敗し、修正後に500ms脱出を確認。browser-escape-timing.mjsはhasTouch/isMobileのtouchscreen.tapを使用し、傾き・擬似操作の両方で成立。browser-escape-input.mjsも成功。仕様・規約の2軸レビューは指摘なし。

T-230公開検証: f896663／Pages34735555124成功、実行資材5件の一致、正式URLのtouchscreen.tapで2操作モードの0.5秒脱出成功。

## T-231 v0.4.2

109テスト。browser-escape-timingは10タップで最短0.5秒を2操作モードで確認。browser-sticky-feedbackは実際の上端とりもち、離れた位置のダブルタップ、成功表示、320/390/576pxの四隅の球との非重複、別トラップへの成功表示持ち越し防止を確認。証跡はsticky-feedback/。撮影前にCanvas単体も撮影して合成を同期。仕様・規約の2軸レビュー済み。

公開検証: 1f00540／Pages34736358514成功。正式URLの実行資材9件一致、browser-escape-timingとbrowser-sticky-feedback成功。

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

## T-238 v0.4.9

116テスト成功。実物理で初速3・無入力の1.02マス反発と、石への衝突ダメージを確認。browser-candy-fullで満タンの通知・温存・再接触案内、browser-guideで3幅の説明表示・床等高を確認。レビュー指摘なし。実装6bfe8d7。GitHub障害で公開が待機したため、復旧後に内容変更のないf5c5ac6で再実行。Pages34753758919で公開、正式URLの変更資材11件がローカルと一致。正式URLのbrowser-candy-full.mjsで満タン通知・温存・再接触案内とガイド説明を確認済み。

## T-239 v0.4.10

クリア直後とコンティニュー確定時の記録保存。116テスト成功。browser-run-recordsで両難易度の保存・2回目コンティニュー・途中終了・更新バッジ・再読み込みを確認。browser-resultsの4幅も成功。仕様レビュー1件（2回目続行時のバッジ保持）修正済み、規約レビュー指摘なし。公開2506bd9／Pages34754660659成功。正式URLの変更資材3件一致、browser-run-recordsで両難易度の確認成功。

## T-240 v0.5.0

固定面チュートリアル。120テスト成功。browser-tutorialで320/390/576幅、説明停止・自動終了・タップ・非表示復帰・記録非保存・基準再計測・拒否/無信号を確認。browser-tutorial-offlineで画像・起動・接触説明、既存ガイド3幅・記録両難易度も成功。レビュー2件（説明キュー・SE二重発音）修正済み。公開ce0b0c0／Pages35439929057成功。正式URLの変更資材14件一致、3幅・センサー模擬3経路・オフライン起動と説明も成功。オフライン検証の開始待ちをgameModeとscreen込みに修正して再確認。

## T-241 v0.5.1

121テスト成功。browser-tutorial-pacing:320/390/576幅で反発先行・0.7秒遅延・1秒停止・説明中操作・4秒終了・ポーズ中時計停止・休憩進捗保持・説明位置と盤面位置不変を確認。センサー3経路、オフライン確認成功。レビュー指摘2件（休憩進捗リセット・再接触なしでの後出し）修正済み。公開565e772／Pages35440853749成功。正式URLの変更資材8件一致。正式URLの3幅テンポ確認とオフライン動作も成功。

## T-242 v0.5.2

121テスト成功。browser-tutorialで320/390/576幅の無停止・説明保持・初回のみ差し替え・更新ハイライト・動きを減らす設定・自然脱出・再挑戦・センサー3経路を確認。オフライン確認成功。レビューの検証API呼び出し指摘を修正。公開d80d893／Pages35442412765成功。正式URLの変更資材7件一致、3幅の無停止・保持・更新通知とオフライン動作確認成功。

## T-243 v0.5.3

更新通知を金色の枠と「更新」表示へ強化。tutorial単体5件成功。browser-tutorial-pacingで320/390/576幅の表示・説明保持・無停止・ポーズ・自然脱出・再挑戦・動きを減らす設定を確認。公開0d9ec07／Pages35443005784成功。正式URLの変更資材5件一致、3幅のブラウザ確認成功。仕様・規約レビュー指摘なし。

## T-244 v0.5.4

説明カード全体を1.8秒で2回金色に光らせ、更新ラベルを撤去。tutorial単体5件成功。ブラウザ3幅で無停止・説明保持・ラベル削除・発光・動きを減らす設定を確認。レビューで影の補間を修正。公開確認待ち。
