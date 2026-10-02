# T-264 転がり音を控えめに / v0.6.6

2026-10-02。ユーザー実機評価：「転がる音がうるさい。壁に当たる音は良い」。5球素材共通で転がり音の出力ゲインを初版の25%（約−12dB）へ下げ、速度連動・音色・衝突音を維持。体感の大きさが25%になるという意味ではない。設定は`BALL_LAB_AUDIO.rollingGain`。

- Chromeの実AudioContextで旧版`8945fa2`と同じ速度／位置の金属・スーパーボールを比較。転がり音の目標ゲインは0.472821→0.118205／0.472374→0.118094。衝突音は0.568989／0.572505で前後同じ。[比較データ](ball-audio-mix/mix.json)。`tools/browser-ball-audio-mix.mjs`。衝突音の波形・発音処理は変更なし。
- 320×568・390×844・576×1024で実pointerの惰性・反発・各音源・音量・ミュート・ポーズ・非表示・共有・記録非保存を確認。未処理例外なし。[結果](ball-audio-mix/local-browser.txt)。
- `node --test`：153成功・失敗0。[ログ](ball-audio-mix/unit-tests.txt)。物理や音源波形の変更なし。

v0.6.5の試聴WAVは初版の音量を記録したもの。

## 公開確認

アプリ`81627e8`、[Pages37002245944成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37002245944)。正式URLの[ボールのおためし](https://corogalism.sikumilab.com/ball-lab.html)。PWA100資材、`5d4eb421403d0756`。

- 実行資材43個がHTTP200・SHA-256一致。[証跡](ball-audio-mix/deploy-hashes.json)。
- 公開版の実AudioContextでも金属・スーパーボールの転がり出力25%、同じ衝突の出力は完全一致。[比較](ball-audio-mix/live/mix.json)、[結果](ball-audio-mix/live-mix.txt)。
- ネットワークを切った後も100資材から起動し、スーパーボール×氷＋力場×ゴムの移動・音を確認。[オフライン](ball-audio-mix/live-offline.txt)。

既存PWAでは本編の「更新チェック」でv0.6.6へ更新してからおためしページを開き直す。
