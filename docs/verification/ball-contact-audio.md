# T-266 素材ごとの転がり音 / v0.6.8

2026-10-03。[仕様と再評価の理由](../ball-contact-audio.md)。柔らかい球に共通の擦れを付ける設計から見直した。音色の自然さは測定値だけでは保証できず、実端末での試遊に残す。

- 変更前に、柔らかい球にも転がり音があり、ガラスと木の高域の差が小さいことをテストで確認。[失敗](ball-contact-audio/red.txt)。変更後は素材8テスト成功。[ログ](ball-contact-audio/material-tests.txt)。
- `node --test`：157成功・失敗0。全240組合せのBFS・有限値・盤内・速度上限、既存物理・HP・記録も成功。[ログ](ball-contact-audio/unit-tests.txt)。
- 旧版v0.6.7（102bb53）と比較して、5素材の物理属性が完全一致。衝突音20組のPCM SHA-256も完全一致。[比較](ball-contact-audio/comparison.json)、[ログ](ball-contact-audio/comparison.txt)。音の発音条件・ゲイン・同時数は変更していない。
- 硬い3素材の9音源は有限値。木／ガラスは接触粒の間を無音にし、共通の持続ノイズを重ねない。金属の低域、木の中低域、ガラスの高域を分けた。RMSや帯域は構成の確認であり、自然さの保証ではない。
- Chromeの320×568・390×844・576×1024で、柔らかい2素材×全6床の36ケースを実行。球が移動してもAudioBufferSourceNode.startの呼出し増分0。金属からスポンジへの切替で位置／速度を保持し転がり音を停止。柔らかい球もゴム壁で発音。硬い3球は実pointerで移動／発音。ミュート・ポーズ停止、横はみ出しなし、未処理例外0。[ログ](ball-contact-audio/contact-browser.txt)、[状態](ball-contact-audio/browser-contact.json)。
- 既存のラボ操作も3幅で成功。素材／床／壁／面切替、金属の慣性、ゴム球の反発、音量、非表示、revision3の共有JSON、記録非保存を確認。[ログ](ball-contact-audio/lab-browser.txt)、[状態と画面](ball-contact-audio/lab/browser.json)。[320pxスポンジ画面](ball-contact-audio/lab/sponge-320.png)も目視確認。
- 音声API・転がり合成・衝突合成の3故障でも無音案内を表示し、球と描画は動き続ける。[ログ](ball-contact-audio/audio-failure.txt)。
- PWA100資材保存後、完全オフラインで氷＋力場×ゴム壁のゴム球が動く。転がり音源は0、壁で発音。続いてビー玉に替えると氷の転がり音が鳴る。旧物理の更新案内も成功。[ログ](ball-contact-audio/offline.txt)。
- OfflineAudioContextで5素材の6秒WAVを生成。3.5秒以降は従来の壁音3種類。柔らかい球は壁へ当たる前のPCMが全て0。硬い3球は接触音あり。ピークは全素材で1未満、クリッピングなし。[数値](ball-contact-audio/render-check.json)、[ログ](ball-contact-audio/audio-render.txt)。[金属](ball-contact-audio/samples/metal-demo.wav)、[木](ball-contact-audio/samples/wood-demo.wav)、[ビー玉](ball-contact-audio/samples/default-demo.wav)、[ゴム球](ball-contact-audio/samples/superball-demo.wav)、[スポンジ](ball-contact-audio/samples/sponge-demo.wav)。ブラウザで合成・発音を確認し、実物の録音や人間による試聴評価とは区別する。

## 再実行

`node --test`、`node tools/verify-ball-contact-audio.mjs`。HTTP配信先を`BASE_URL`、Playwright moduleを`PLAYWRIGHT_MODULE`へ設定し、`browser-ball-contact-audio.mjs`・`browser-ball-lab.mjs`・`browser-ball-offline.mjs`・`browser-ball-audio-failure.mjs`・`render-ball-audio.mjs`を実行。`CONTACT_OUTPUT`／`BALL_OUTPUT`／`AUDIO_OUTPUT`で出力先を指定し、旧証跡を上書きしない。実行資材変更時は`node tools/update-precache.mjs`。

## 公開確認

アプリ`e474c1a`、[Pages37029479828成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/37029479828)。[おためし3](https://corogalism.sikumilab.com/ball-lab.html)。PWA100資材、`ad7e785ced29dac7`。

- 実行資材44個がHTTP200・SHA-256一致。[照合](ball-contact-audio/deploy-hashes.json)。
- 公開版でも3幅36ケースの柔らかい球の音源開始0、壁での発音、硬い3素材の実pointer移動／発音、素材切替・ミュート・ポーズ停止を確認。未処理例外0。[ログ](ball-contact-audio/live-browser.txt)、[状態](ball-contact-audio/live/browser-contact.json)。
- 100資材の完全オフラインで、ゴム球の移動中は音源0、壁で従来音、ビー玉に替えると氷の転がり音を確認。旧共有物理の更新案内も成功。[ログ](ball-contact-audio/live-offline.txt)。

既存PWAでは本編の「更新チェック」でv0.6.8へ更新し、おためし3を開き直す。実端末での音色の感じ方は追加試遊する。
