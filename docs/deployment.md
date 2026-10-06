# v0.6.19 描画復元時の縮小・残像（2026-10-06）

- 2D描画領域復元後に倍率と保存画像を作り直し、前の球を消す。音・物理・迷路・時間・次面待機は維持。[修正と検証](verification/render-recovery.md)。
- 176テスト、ローカル100条件の描画比較・本編12面5条件・CPU負荷6倍の処理時間・103資材オフライン成功。キャッシュ`d95966363629c26e`。
- アプリ`7791dd5`、[Pages37445414686成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37445414686)。公開106資材HTTP200・SHA-256一致。[配信結果](verification/render-recovery/deploy-hashes.json)。
- 公開100条件の描画比較、本編12面の通常pointer／やさしい模擬センサー2条件、状態保持・移動・BGM・画面寸法変更、103資材の完全オフラインも成功。[公開本編](verification/render-recovery/game-public/results.json)、[公開オフライン](verification/render-recovery/offline-public.txt)。実端末での初期化の契機は未確認。

# v0.6.18 次の面への待機1秒（2026-10-06）

- 通常・特殊面の「次へ」を1秒後に有効化し、0.3秒で彩度を戻す。コンティニューの1秒と終了確認の取消は維持。[仕様](results-and-timing.md)。
- ローカル18ケース・終了確認5経路・103資材の完全オフライン成功。キャッシュ`cb508eed4df56984`。[検証記録](verification/end-wait-one-second.md)。
- アプリ`6bee2df`、[Pages37381379984成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37381379984)。公開106資材のHTTP200・SHA-256一致。[配信確認](verification/end-wait-one-second/deploy-hashes.json)。
- 公開Chrome3幅・両難易度・音ON／OFFの12ケースと終了確認5経路が成功。公開103資材の完全オフラインでも本編3面、確認の取消、両おためしの操作・音を確認。[公開結果](verification/end-wait-one-second/public/results.json)、[公開オフライン](verification/end-wait-one-second/offline-public.txt)。

# v0.6.17 終了ボタンの明記と確認（2026-10-05）

- 「終了して結果を見る」と明記して確認を挟む。戻るを既定とし、取消で元の画面・成績・待機を保持。プレイ中は一時停止。回数切れと練習は従来どおり。[仕様](results-and-timing.md)。
- ローカル3幅の12ケース＋追加3経路、22テスト、103資材の完全オフライン成功。キャッシュ`d44def0c6dc1593f`。[検証記録](verification/run-end-confirm.md)。
- アプリ`751813f`、[Pages37303197697成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37303197697)。公開106資材のHTTP200・SHA-256一致。[配信確認](verification/run-end-confirm/deploy-hashes.json)。
- 公開Chrome15ケースを一括で成功。公開103資材の完全オフラインでも本編3面、終了確認と取消、両おためしの操作・音を確認。[公開結果](verification/run-end-confirm/public/results.json)、[公開オフライン](verification/run-end-confirm/offline-public.txt)。

# v0.6.16 無効ボタンの色を滑らかに戻す（2026-10-05）

- 無効なボタンを完全なグレースケールにし、有効化から300msで彩度を戻す。途中から操作可能。ジングルを聞く待機時間とボタン名・寸法は維持。[仕様](results-and-timing.md)。
- ローカルChrome3幅を含む18ケース、102資材の完全オフライン成功。キャッシュ`e214650bf9b68d63`。[検証記録](verification/end-grayscale.md)。
- アプリ`8403bb5`、[Pages37300298613成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37300298613)。公開105資材のHTTP200・SHA-256一致。[配信確認](verification/end-grayscale/deploy-hashes.json)。
- 公開Chrome18ケースでも彩度の途中値と操作成功。102資材の完全オフラインで両おためし・本編への初回移動、次面移動、操作・音を確認。[公開結果](verification/end-grayscale/public/results.json)、[公開オフライン](verification/end-grayscale/offline-public.txt)。

# v0.6.15 ジングルを聞く間（2026-10-05）

- 通常クリア2秒、光の滑走路0.65秒、コンティニュー1秒のボタン待機を追加。文字・寸法を保ち、控えめな色の変化だけを使う。待機中のコンティニュー非表示を防ぎ、回数切れと区別。[仕様](results-and-timing.md)。
- 22テスト・ローカル3幅を含む18ケース、実pointerで通常／やさしい各3面クリア、102資材の完全オフライン成功。キャッシュ`68d971c033ccf957`。[検証記録](verification/end-actions.md)。
- アプリ`2273c08`、[Pages37294857846成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37294857846)。公開105資材のHTTP200・SHA-256一致。[配信ファイル](verification/end-actions/deploy-hashes.json)。
- 公開Chromeでも3幅を含む18ケース成功。102資材の完全オフラインで両おためしと本編への初回移動、待機後の次面移動、操作・音を確認。[公開結果](verification/end-actions/public/results.json)、[公開オフライン](verification/end-actions/offline-public.txt)。

# v0.6.14 特殊床を脇道にも配置（2026-10-04）

- 既存のルート上の床を残し、砂・重力・反重力・ひとやすみ・とりもちを脇道にも配置。取得アイテムはルート上。複数ひとやすみの使用状態をコンティニューでも引き継ぐ。[配置仕様](floor-placement.md)。
- 176テスト・1,200配置比較・Chrome3幅96画面・通常／やさしい各16面の実pointer通しクリアを確認。キャッシュ`a74ac540b0c6f99a`、102資材。[検証記録](verification/branch-floors.md)。
- アプリ`287634c`、[Pages37169145724成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37169145724)。正式URLは https://corogalism.sikumilab.com/ 。公開105資材のHTTP200・SHA-256一致を確認。[配信ファイル](verification/branch-floors/deploy-hashes.json)。
- 公開Chrome3幅・通常／やさしい各16面の96画面、脇道での回復・脱出・コンティニューを確認。102資材の完全オフラインでも両おためし・本編への初回移動、操作、音、脇道の砂が動作。[公開画面](verification/branch-floors/public/results.json)、[公開オフライン](verification/branch-floors/offline-public.txt)。実端末での傾きと体感は試遊の対象。

# v0.6.13 氷の反応補正を検証だけで外す（2026-10-03）

- ボールおためし7／床おためし9で氷の傾き加速補正と補助コースの力55%を解除。以前の調整と本編の既定は維持。残る入力・計算・音の条件を明記。revision7／9、新検証記録はmotion-2。
- 171テスト・720条件（停止23件も保持）・Chrome3幅・101資材オフラインを確認。キャッシュ9726f9b871d7010a。[方針と条件](exploration-policy.md)、[検証](verification/ice-response.md)。アプリd1a76d3、[Pages37109271687成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37109271687)。公開104資材HTTP200・SHA-256一致、公開Chrome3幅、101資材の完全オフライン操作・発音・旧物理と旧氷処理の混在防止4経路も成功。

# v0.6.12 試遊の設定URLのオフライン対応（2026-10-03）

- 公開追加確認で見つけた、未訪問のquery付き床ページの読み込み失敗を修正。既知の静的HTMLだけ保存先を解決し、配置指定を維持。物理と音源は維持。
- ローカル101資材の完全オフラインで両試遊ページ・本編への初回移動、床配置・実pointer・発音・旧物理混在案内を確認。キャッシュb5fb0f80c96d1811。[検証](verification/exploration-offline.md)。アプリ0d3e633、[Pages37106451916成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37106451916)。公開104資材のHTTP200・SHA-256一致、公開101資材の完全オフラインで同じ操作も成功。[ファイル証跡](verification/exploration/deploy-v0612-hashes.json)、[オフライン証跡](verification/exploration/offline-public.json)。

# v0.6.11 検証の制限見直し（2026-10-03）

- ボールおためし6／床おためし8は合成値を丸めない検証を初期設定へ。以前の調整・弱い反発の収束は任意比較。数値編集・既存6壁・続行不能の条件共有を追加。本編の既定・音源は維持。
- 169テスト・720条件（停止18件も保持）・Chrome実pointer3幅、センサー4経路・音声失敗3経路・木の壁音24ケースを確認。[方針](exploration-policy.md)、[検証](verification/exploration.md)。アプリa9860b0、Pages37106021206成功。公開104資材のHTTP200・SHA-256一致、公開3幅成功。未訪問の設定URLでのオフライン失敗を追加確認で検出し、v0.6.12で修正済み。

# v0.6.10 木の乾いた壁音（2026-10-03）

- 木の衝突音を短く乾いたコンへ変更。立ち上がりを速くし、低い長めの余韻をなくす。他衝突16組、全転がり15状態、物理は維持。「おためし5」・revision5。
- アプリ`31b9224`。[Pages37064593466成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37064593466)。PWA100資材、`29b0af0e93e8eefd`。
- 159テスト、実pointer3幅・4壁×2速度の24ケース・ミュート／ポーズ・共有・100資材オフライン成功。公開44資材＋比較WAV2件のHTTP200・SHA-256一致、公開3幅24ケースと新しい木の衝突音のオフラインも成功。[検証と比較WAV](verification/wood-knock.md)。

# v0.6.9 金属の連続する転がり音（2026-10-03）

- 金属の転がりだけ、短い打音の連打から低く連続する成分へ変更。平均音量はほぼ維持。衝突音20組PCM・他素材12音源状態・物理5ファイルは前版と一致。「おためし4」・revision4。
- アプリ`a913759`。[Pages37033800668成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37033800668)。PWA100資材、`8a3e04ed2a9f099b`。
- 158テスト、波形9条件比較、3幅実pointer・停止／切替・音声故障3経路・100資材オフライン成功。公開44資材のHTTP200・SHA-256一致、公開3幅の発音／停止、オフラインの金属音も成功。音の自然さは実機で追加評価。[検証と比較WAV](verification/metal-roll.md)。

# v0.6.8 素材ごとの転がり音（2026-10-03）

- ゴム球／スポンジは転がり音源を作らず、木／ガラス／金属は接触の帯域・長さ・密度を分ける。木／ガラスの隙間は無音。壁の衝突音20組PCM・発音条件と5素材の物理属性を維持。「おためし3」・revision3。
- アプリ`e474c1a`。[Pages37029479828成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37029479828)。PWA100資材、`ad7e785ced29dac7`。
- 157テスト、3幅36ケースの柔らかい球の音源開始0、硬い球の実pointer、壁での発音、ミュート／停止、音声故障3経路、100資材オフラインを確認。公開44資材のHTTP200・SHA-256一致、公開版3幅36ケースと100資材オフラインも成功。音色の自然さは実機で追加評価。[検証](verification/ball-contact-audio.md)。

# v0.6.7 ボールの音と反発を再考（2026-10-03）

- 転がり音を固定音程から不規則な擦れ・接触へ作り直し、弱い接触は反発を収束させる。木・スポンジの初動／急な減速を緩和。「おためし2」・revision2。壁の衝突音20組のPCMと、本編ビー玉の挙動は維持。
- アプリ`102bb53`。[Pages37025355041成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37025355041)。PWA100資材、`35598379742c0068`。
- 156テスト・240組合せ・旧版比較・実pointer・3幅・本編回帰を確認。公開44資材のHTTP200・SHA-256一致、公開版の余韻と壁での収束、低速時の音停止、100資材オフラインの移動と音も成功。音と反発の自然さは実機で追加評価。[検証](verification/ball-feel.md)。

# v0.6.6 転がり音を控えめに（2026-10-02）

- 実機試遊でうるさいとの報告を受け、ボールのおためしの転がり音の出力だけ25%へ抑制。壁の衝突音は維持。
- アプリ`81627e8`。[Pages37002245944成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37002245944)。PWA100資材、`5d4eb421403d0756`。
- 153テスト・3幅実操作・Chromeの旧版比較を確認。公開43資材のHTTP200・SHA-256一致、公開版の転がり出力25%／同じ衝突の出力一致、100資材オフラインの移動と音を確認。[検証](verification/ball-audio-mix.md)。

# v0.6.5 ボール素材のおためし（2026-10-02）

- 別ページ[ボールのおためし](https://corogalism.sikumilab.com/ball-lab.html)に5素材・2面×6床×4壁、金属の長い惰性と低い転がり音、スーパーボールの反発を追加。本編・床の練習・既存の音源と記録は維持。
- アプリ`8945fa2`。[Pages37000568875成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37000568875)。PWA100資材、`a03734f607a797b2`。
- 153テスト・240組合せ・3幅実pointer・センサー4経路・音声失敗3経路・オフライン／本編チュートリアル／描画回帰を確認。Standards指摘1件は修正し再レビューで解消、Spec指摘0。
- 公開43資材のHTTP200・SHA-256一致、3幅の実操作と発音、100資材の完全オフライン起動・移動・発音を確認。実端末の低音と操作の体感は試遊で追加評価。[検証](verification/ball-lab.md)。

# v0.6.4 はじめての床体験とやさしいの時間（2026-10-02）

- チュートリアルに砂・氷・重力・反重力・コルクを追加し、全15要素を体験可能。力場と取得物／休憩を分離。やさしいは最低40秒・初登場床45秒＋面の負担に応じた時間へ見直し。床の練習は維持。
- アプリ `285dca0`。[Pages36954383041成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/36954383041)。正式URL https://corogalism.sikumilab.com/ 。PWA93資材、`fba575a209d57426`。
- 149テスト、標準操縦1200ケース全クリア。慎重なやさしい操縦モデルは567／600クリアで、失敗も保持。実pointerのチュートリアルとやさしい1–8面、3幅、既存説明／センサー3経路、床練習回帰・オフライン確認。Standards／Spec指摘0。
- 公開33資材のHTTP200・SHA-256一致、3幅の新床・コルク説明、実pointerでチュートリアルとやさしい1–3面を確認。完全オフラインで新チュートリアルと床練習5素材も動作。傾きの体感は実機試遊で追加調整。[検証](verification/tutorial-floors.md)。

# v0.6.3 床の体験と練習（2026-10-02）

- やさしい初登場床面を90秒・反復配置にし、無停止の接触説明を追加。タイトルに時間／HP／記録なしの「床の練習」。同じ広い面で5素材を切り替え、今の位置と速度で比較できる。
- アプリ `4a0f8ef`。[Pages36940101594成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/36940101594)。正式URL https://corogalism.sikumilab.com/ 。PWA93資材、`8a6dc97c0553fb85`。
- 149テスト、配置8000ケース、操縦1200ケース、やさしい1–8面実pointer、5素材とガイドの3幅、PWA、開始18経路、CPU6倍の描画回帰成功。Standards／Spec指摘0。
- 公開版31実行資材のHTTP200・SHA-256一致、3幅で床切替・説明・再試行・記録非保存を確認。実pointerで重力／反重力の違いとやさしい1–3面、完全オフラインで5素材切替も確認。[検証](verification/floor-learning.md)。傾きの体感は実機試遊で追加調整。

# v0.6.2 ダメージ表示の重なり改善（2026-10-02）

- ダメージ量をげんき枠内・既存2段目の左へ独立表示。枠の上辺・HP数値・まもり・ゲージと分離し、HUDと盤面の高さは維持。
- アプリ `6af200b`。[Pages成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/36932605725)。正式URL https://corogalism.sikumilab.com/ 。PWA91資材、`ae9d04e2acfc73fc`。
- ローカルと正式URLの320・390・576・1280幅で実壁衝突を使い、微小／整数ダメージの表示値、枠内4px以上、他表示との非重複、横はみ出しなしを確認。正式URLの実行資材28個がHTTP200・SHA-256一致。[検証](verification/damage-layout.md)。

# v0.6.1 処理落ちと隣接面重複の修正（2026-10-02）

- ユーザー報告のやさしい3面の処理落ちを再現し、静止床・全壁の毎フレーム描画を廃止。面候補の増分共有による同じ迷路の選択も解消。砂・氷の物理、ダメージ・記録枠は維持。
- アプリ `3320947`。[Pages成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/36905578032)。正式URL https://corogalism.sikumilab.com/ 。PWA91資材、`1786a152c88aff61`。
- 145テスト、1200操縦モデル、やさしい1–8面pointer通しプレイ、既存challenge/tutorial/lab/PWA回帰成功。読み取りレビューCritical/Importantなし。
- 正式URLの実行ファイル28個がHTTP200・SHA-256一致。公開版でもCPU6x・倍率1/3の砂／氷／力場の性能回帰と、やさしい1–3面の実pointer操作を確認。[検証](verification/floor-performance.md)。実端末の再試遊はユーザーに依頼する。

# v0.6.0 床素材チャレンジ（2026-10-02）

- 氷・砂・重力・反重力・コルクを本編へ追加。両難易度を緩和し、通常10面ごとに「光の滑走路」を導入。ガイド改修、初登場ジングルと控えめな結果プレビューを追加。
- アプリコミット `d01733d`。[Pages公開成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/36893943336)。正式URL https://corogalism.sikumilab.com/ 。
- 144テスト成功。1200操縦モデルケース、実pointerの通しプレイと既存ブラウザ回帰成功。レビューの配置・時間・初登場力場欠落を修正し、最終Critical/Important指摘なし。
- 正式URLの実行ファイル28個はHTTP200・SHA-256一致。[ファイル証跡](verification/floor-challenge/deploy-hashes.json)。PWA実行資材91個、バージョン `fe5affd928a9afb3`。
- 正式URLで3幅のガイド、通常限定10面の紹介とやさしい結果プレビュー、実pointer入力・両難易度の開始を確認。紹介UIの検証では面進行用位置移動を使い、難易度の通しプレイとは区別する。
- 人間の実端末による傾きの体感は未確認。公開版の試遊で追加調整する。[詳細検証](verification/floor-challenge.md)。

以下は過去の公開履歴。

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

説明カード全体を1.8秒で2回金色に光らせ、更新ラベルを撤去。tutorial単体5件成功。ブラウザ3幅で無停止・説明保持・ラベル削除・発光・動きを減らす設定を確認。レビューで影の補間を修正。公開8beb841／Pages35443504277成功。正式URLの変更資材5件一致、ブラウザ3幅で発光・文字撤去・継続操作を確認済み。

## T-245 v0.5.5

チュートリアルの助走先へゴムとトゲを追加。122テスト成功。全セル到達性・静止からの助走で速度1.2超のゴム反発とトゲ被弾を確認。ローカルブラウザ320/390/576幅で説明・無停止・配置表示を確認。仕様・規約レビュー指摘なし。公開f394c0d／Pages35444326029成功。正式URLの変更資材3件一致。

## T-246 v0.5.6

ゴム・トゲを助走先の各2区間に限定。ひとやすみを標準壁の内角へ移動し、弱い斜め入力での回復を検証。123テスト成功。ローカルと正式URLの320/390/576幅で継続操作・反発先行・説明更新・ひとやすみ説明を確認。2026-09-20公開bb07eac／Pages35490993305成功。正式URLの変更資材3件一致。

## T-247 床のおためし（公開準備）

本編v0.5.6を維持し、独立URL `/floor-lab.html` を追加。127テスト成功。browser-floor-labで320/390/576幅、床切替・画面操作・停止・調整・コピー失敗時の代替、センサー許可/拒否/無信号、既存PWA保存後のオフライン起動成功。browser-tutorialで3幅とセンサー3経路の回帰確認成功。precache82資材。実機の手触り評価と正式採用判断は公開後に行う。

T-247公開完了: アプリe61583b、[Pages35706033174](https://github.com/gerupon-lgtm/corogalism/actions/runs/35706033174)成功。正式URL https://corogalism.sikumilab.com/floor-lab.html 。実行資材8件のSHA256一致。正式URLのbrowser-floor-labで3幅、操作・調整・コピー代替、センサー3経路、旧PWA更新案内、保存後オフライン起動が成功。最終precacheは83資材。端末実機の手触りはユーザー試遊待ち。


## T-248 床の質感・力の可視化

おためし2を公開。アプリd0c28cd、[Pages35707709692](https://github.com/gerupon-lgtm/corogalism/actions/runs/35707709692)成功。変更資材5件のSHA256一致、precache84資材。127テスト成功。正式URLのbrowser-floor-visualsで4種類の描画・停止・動きを減らす設定を確認。browser-floor-labで3幅・センサー3経路・設定コピー・旧PWA案内・オフライン起動成功。検証のセンサー開始前にページ初期化待ちを追加し、通信待ちによるテストの先走りを修正した。実機の見た目の評価はユーザー試遊待ち。


## T-249 氷の慣性・外周線の撤去

おためし3公開。アプリ8bb632f、[Pages35709185177](https://github.com/gerupon-lgtm/corogalism/actions/runs/35709185177)成功。変更資材7件SHA256一致。129テスト成功。公開URLのbrowser-floor-visualsとbrowser-floor-labで4床・停止・動きを減らす設定、3画面幅・センサー3経路・旧PWA案内・オフライン確認成功。氷0.08と速度に応じた加減速の実機の手触りはユーザー試遊待ち。


## T-250 全ゴム壁・全面床の迷路

おためし4公開。アプリb087c40、[Pages35710206900](https://github.com/gerupon-lgtm/corogalism/actions/runs/35710206900)成功。変更資材6件SHA256一致。130テスト成功。公開URLのbrowser-floor-visualsとbrowser-floor-labで4床・演出停止、3画面幅・センサー3経路・旧PWA案内・オフライン起動確認成功。実機の迷路での手触りはユーザー試遊待ち。


## T-251 床と力場の組み合わせ

おためし5公開。アプリ4cbf9aa、[Pages35711953170](https://github.com/gerupon-lgtm/corogalism/actions/runs/35711953170)成功。変更資材7件SHA256一致。131テスト成功。正式URLで6パターン×3幅、試験区間への移動・コピー・全面比較への復帰、センサー3経路・旧PWA案内・オフライン起動確認成功。全氷＋全ゴムの採用決定を記録済み、本編への配置は後続作業。


## T-252 氷＋砂タイムトライアル

おためし6公開。アプリ51435b9、[Pages35713658500](https://github.com/gerupon-lgtm/corogalism/actions/runs/35713658500)成功。変更資材5件SHA256一致、precache85資材。134テスト成功。正式URLのbrowser-floor-trialで3幅の計測・一時停止・完走保存・再読み込み・途中移動除外・設定変更を確認。browser-floor-labで3幅・センサー3経路・旧PWA案内・オフライン起動成功。本編のダメージ仕様は変更していない。


## T-253 広いカーブ＋重力・反重力

おためし7公開。アプリ0247325、[Pages35714689965](https://github.com/gerupon-lgtm/corogalism/actions/runs/35714689965)成功。変更資材5件SHA256一致。135テスト成功。正式URLで新面の3幅・時計・自己ベスト・再挑戦、7パターン比較、既存床比較・センサー3経路・オフライン起動を確認。実機の面白さはユーザー試遊待ち。本編変更なし。


## T-254 縦向き固定 v0.5.7

アプリbdb7e7d、[Pages35715972863](https://github.com/gerupon-lgtm/corogalism/actions/runs/35715972863)成功。変更資材7件SHA256一致。135テスト、既存チュートリアル3幅・センサー3経路成功。正式URLで本編と検証ページの固定8経路を模擬確認、床ページ3幅・センサー3経路・旧PWA・オフライン成功。実端末での固定成功は端末依存のため未確認。


## T-255 開始時の全画面・縦向き固定 v0.5.8

アプリ46012c8、[Pages35717580301](https://github.com/gerupon-lgtm/corogalism/actions/runs/35717580301)成功。実行資材5件SHA256一致、precache86資材。135テスト成功。正式URLで開始15経路（練習・チャレンジ・チュートリアル・検証ページの画面／傾き操作と成功・拒否・非対応）および既存固定8経路を模擬確認。ローカルのチュートリアル3幅・センサー3経路も成功。初回操作時だけ全画面を要求し、解除後は自動再要求しない。実端末での全画面・縦向き固定の成功可否は端末とブラウザに依存し、実機確認は未実施。


## T-256 全画面のカメラ回避余白 v0.5.9

アプリf13c8d5、[Pages35718578925](https://github.com/gerupon-lgtm/corogalism/actions/runs/35718578925)成功。正式URLで本編・床検証ページの320/390/576幅について実際のFullscreen APIで追加32px・解除時の復帰・横はみ出しなしを確認。本編の盤面収まりも確認。ローカルの既存チュートリアル3幅（最小320×568）・センサー3経路成功。端末固有のsafe-area通知・インカメラとの実際の位置関係は実機確認待ち。CSSと表示設定の変更のため、物理系単体テストは今回は再実行していない。


## T-257 上余白の縮小 v0.5.10

アプリe1fa81d、[Pages35719269382](https://github.com/gerupon-lgtm/corogalism/actions/runs/35719269382)成功。ローカルと正式URLで本編・検証ページ各320/390/576幅のFullscreen API切替を確認。全画面時は上余白合計32px、解除時は元の14px／16pxに戻り、横はみ出しなし。端末固有safe-areaおよびカメラ位置の実機確認はユーザー試遊待ち。
