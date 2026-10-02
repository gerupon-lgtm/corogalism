# T-263 ボール素材のおためし / v0.6.5

2026-10-02。[仕様](../ball-material-lab.md)。ブラウザはChrome、操作は実pointerイベント。実端末の傾きを代替したと主張しない。

- `node --test`：153成功・失敗0。[ログ](ball-lab/unit-tests.txt)。金属の遅い初動・惰性・遅い切り返し、素材別力場・反発、全240組合せ（5球×6床×4壁×2面）のBFS・有限値・盤内・速度上限を確認。
- 320×568・390×844・576×1024で、5素材の外観、全床切替、位置／速度保持、ポーズ／再開、音ON／OFF・音量、共有JSON、横はみ出しなし・記録非保存を確認。金属を押して離した後も速度と転がり音が残り、スーパーボール×ゴム壁は入力を離した後も反発する。衝突確認の一部は壁の近くへ位置移動を使用。[実操作と発音](ball-lab/browser.json)、`tools/browser-ball-lab.mjs`。
- 音源15転がり／20衝突のサンプルが有限・振幅範囲内で、金属の低域・スポンジの弱い音・石とコルクの衝突強弱を確認。実AudioContextで発音・ミュート・停止を検証。OfflineAudioContextで6秒の速度変化と壁3種類をレンダリング：[金属](ball-lab/metal-demo.wav)／[スーパーボール](ball-lab/superball-demo.wav)。ピーク0.736／0.600、クリッピングなし。実機スピーカーでの低音は追加試遊する。
- センサー許可／拒否／無信号／非対応の4経路、許可後の校正・移動・再校正タイムアウト・画面操作への移行を確認。音声APIなしでも操作できる。`tools/browser-ball-sensors.mjs`。
- 音声APIの生成、転がり音生成、衝突音生成の3種類の失敗を注入しても、例外なしで球が動き続け、無音の案内を表示する。[結果](ball-lab/audio-failure.txt)。
- PWA100資材を保存後、ネットワークを切って新ページを起動し、スーパーボール×氷＋力場×ゴムの移動・音を確認。旧共有物理の混在を検出して更新案内へ着地。[オフライン](ball-lab/offline.txt)。本編のオフライン音声・更新待機・他タブ保護・取得失敗も回帰成功。[PWA](ball-lab/pwa.txt)。
- 本編チュートリアルの説明・取得物・とりもち・ポーズ・センサー3経路は3幅で成功。`tools/browser-tutorial.mjs`。CPU6倍、DPR1／3で静止床／壁のキャッシュを確認。[単独再測定](ball-lab/steady.json)：各面の描画中央値0.6–2.6ms、p95最大10.8ms。ブラウザ検証を並行実行した[初回](ball-lab/current.json)ではp95に最大79.5msの揺れがあったため、他のブラウザ終了後に再測定した。

## Standards

設定値の配置について1件の指摘。素材反発・力場倍率のクランプと速度下限をgameConfigへ集約して修正。再レビューで解消・追加指摘なし。既存のresolveParams、BFS、固定カメラ、衝突サブステップ、HP保護、静止描画キャッシュを維持。

## Spec

指摘0。承認された5素材、同径・切替時の状態保持、時間／HP／記録なし、音と外観、入力の代替経路を確認。音声失敗の隔離と停止フェードも再レビューして指摘なし。実機の音量感・慣性の気持ちよさは追加試遊の評価対象。

## 再実行

ローカルでHTTP配信し、`PLAYWRIGHT_MODULE`にPlaywrightのES module、`BASE_URL`に配信URLを設定して上記browserツールを実行。実行資材変更時は`node tools/update-precache.mjs`。正式URLのハッシュ照合は`tools/verify-floor-deploy.py`。

## 公開確認

アプリ`8945fa2`、[Pages37000568875成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37000568875)。正式URLの[ボールのおためし](https://corogalism.sikumilab.com/ball-lab.html)。PWA100資材、`a03734f607a797b2`。

- 実行資材43個がHTTP200・SHA-256一致。[証跡](ball-lab/deploy-hashes.json)。
- 公開版でも3幅の実pointerで金属の惰性、スーパーボール×ゴム壁の反発、各音源・音量・ミュート・ポーズ・位置／速度保持・記録非保存を確認。未処理例外なし。[実操作](ball-lab/live/browser.json)、[結果](ball-lab/live-browser.txt)。
- ネットワークを切った後も100資材のキャッシュから起動し、スーパーボール×氷＋力場×ゴムで移動と音を確認。旧共有物理を模擬した更新案内も成功。[オフライン](ball-lab/live-offline.txt)。
