# T-265 ボールの音と反発を再考 / v0.6.7

2026-10-03。[仕様とユーザーの指摘](../ball-feel.md)。音量だけの調整から、音色と衝突後の減衰へ見直した。「自然さ」の体感を自動検証で保証したと主張しない。

- 改修前に3つの失敗を確認：微小接触でゴム球が反発する、木・スポンジの急な減速、固定音程が転がり音の主成分になる。[変更前テスト](ball-feel/red.txt)。変更後は同じ検証が成功。[素材7テスト](ball-feel/material-tests.txt)。
- `node --test`：156成功・失敗0。[ログ](ball-feel/unit-tests.txt)。全240組合せのBFS・有限値・盤内・速度上限、既存物理・HP・記録も回帰成功。
- 旧版v0.6.6と反発・音色を比較。ゴム球を無入力・初速6で転がすと、初回の接触後に5.053、2回目3.578、3回目1.432セル/sを維持。旧版は移動中の減衰が強く、2回目の衝突まで1.667秒、3回目はさらに3.883秒。新版は1.417／2.142秒。移動中の減衰を緩め、低速時は衝突で失う勢いを大きくした。回数に基づく制御はない。[比較](ball-feel/comparison.json)、[集計](ball-feel/comparison.txt)。
- 転がり音の固定音程の突出を計測：金属／木／ゴム球の単一周波数成分÷RMSは旧版1.11／0.98／1.05→新版0.074／0.065／0.069。音が自然と感じられるかの代理保証ではなく、持続する音程を取り除けた確認。金属の低域と素材の音色差は残した。
- 壁の衝突音は5球×4壁の20組すべて、v0.6.6とPCMのSHA-256一致。[比較データ](ball-feel/comparison.json)。発音の間隔・音量・同時数も維持。新しい反発のため衝突する時刻と速度は変わる。
- Chromeの実pointerで木・スポンジ・ゴム球を転がし、入力を離して200ms後も移動することを確認。押し続けて右壁x6.605へ到達した後は600ms位置変化0、速度0で、微小反発を繰り返さない。弱い移動で転がり音が消え、速度を上げると鳴り、ポーズで停止。[結果](ball-feel/feel.txt)、[状態](ball-feel/browser-feel.json)。
- 320×568・390×844・576×1024で素材／床／壁切替・金属の惰性・ゴム球の反発・音量・ミュート・ポーズ・非表示・共有・記録非保存を実操作。未処理例外なし。[結果](ball-feel/local-browser.txt)。
- 音声生成・転がり音・衝突音の3つの故障を注入しても、無音案内の表示後に球が動き続ける。[結果](ball-feel/audio-failure.txt)。ブラウザ試験の仮想時計は起動完了後に停止し、読み込み中のRAFポーリングを凍らせない。
- 本編チュートリアル3幅とセンサー許可／拒否／無信号も成功。[結果](ball-feel/main-regression.txt)。本編の球は`bounce`属性を持たず、従来の反発・減衰。
- PWA100資材の保存後、オフラインで氷＋力場×ゴム×スーパーボールの移動と音を確認。新反発に非対応の旧共有物理は更新案内へ着地。[結果](ball-feel/offline.txt)。
- OfflineAudioContextで4素材の転がりと壁3種類をレンダリング：[金属](ball-feel/samples/metal-demo.wav)、[ゴム球](ball-feel/samples/superball-demo.wav)、[木](ball-feel/samples/wood-demo.wav)、[スポンジ](ball-feel/samples/sponge-demo.wav)。6秒のデモは徐々に速度・音量を上げて下げる比較用。ピーク0.601／0.491／0.442／0.144、クリッピングなし。[ログ](ball-feel/audio-render.txt)。

実機のスピーカーと傾き操作の体感は、新しい試遊版で追加評価する。

## 再実行

`node --test`、`node tools/verify-ball-feel.mjs`。HTTP配信先を`BASE_URL`、Playwright moduleを`PLAYWRIGHT_MODULE`へ設定し、`tools/browser-ball-feel.mjs`・`browser-ball-lab.mjs`・`browser-ball-audio-failure.mjs`・`browser-ball-offline.mjs`・`browser-tutorial.mjs`を実行。`AUDIO_OUTPUT`で音色デモの出力先を指定できる。実行資材変更時はprecacheを更新する。

## 公開確認

アプリ`102bb53`、[Pages37025355041成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37025355041)。[おためし2](https://corogalism.sikumilab.com/ball-lab.html)。PWA100資材、`35598379742c0068`。

- 実行資材44個がHTTP200・SHA-256一致。共有の衝突コードも照合。[証跡](ball-feel/deploy-hashes.json)。
- 公開版の実pointerでも木・スポンジ・ゴム球の余韻と、右壁に到達後の反発収束、音の速度しきい値・ポーズ停止を確認。未処理例外なし。[結果](ball-feel/live-feel.txt)、[状態](ball-feel/live/browser-feel.json)。
- 100資材の完全オフラインで氷＋力場×ゴム×ゴム球の移動と音を確認。初版／v0.6.6の共有物理は更新案内へ着地。[結果](ball-feel/live-offline.txt)。

既存PWAでは本編の「更新チェック」でv0.6.7へ更新し、おためし2を開き直す。
