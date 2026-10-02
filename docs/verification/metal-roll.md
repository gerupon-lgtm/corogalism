# T-267 金属の連続する転がり音 / v0.6.9

2026-10-03。[仕様と合意](../metal-roll.md)。短い打音の連打を廃止し、平均音量を保って細かな強弱を抑える。音色の自然さは自動検証だけでは保証しない。

- 変更前は20ms単位のRMSの変動係数が普通0.540／氷0.916／砂0.704。新しいテストで失敗を確認。[変更前](metal-roll/red.txt)。変更後は素材9テスト成功。[ログ](metal-roll/material-tests.txt)。
- `node --test`：158成功・失敗0。[ログ](metal-roll/unit-tests.txt)。全240組合せの有限値・到達性・速度上限、既存の反発・慣性・HP・記録も成功。
- 旧版v0.6.8（e474c1a）と比較。普通の床では平均RMS0.04390→0.04406、20msの音量変動係数0.540→0.154。氷／砂、再生速度0.7／1／1.3の9条件すべて、平均RMS差10%未満、変動係数は旧版の半分未満かつ0.3未満。音量を下げるだけの修正と区別するための波形確認。[データ](metal-roll/comparison.json)、[ログ](metal-roll/comparison.txt)。
- 物理／設定の5ファイルは旧版と一致。衝突音20組のPCM SHA-256、木／ビー玉／ゴム球／スポンジ×3床の12音源状態も一致。[比較](metal-roll/comparison.json)。
- Chromeの320×568・390×844・576×1024で、金属・木・ビー玉を実pointerで動かし発音を確認。金属からスポンジへの切替、柔らかい球2素材×6床の音源開始0、壁での発音、ミュート・ポーズ停止、未処理例外0を確認。[ログ](metal-roll/browser.txt)、[状態](metal-roll/browser-contact.json)。既存ラボの慣性・反発・床／壁／面切替・音量・非表示・revision4の共有JSON・記録非保存も3幅成功。[ログ](metal-roll/lab-browser.txt)。
- 音声API／転がり合成／衝突合成の3故障を注入しても球は動き続ける。[ログ](metal-roll/audio-failure.txt)。
- PWA100資材の完全オフラインで、ゴム球は転がり無音・壁で発音、ビー玉と新しい金属は氷の転がり音が鳴る。旧共有物理は更新案内へ着地。[ログ](metal-roll/offline.txt)。
- OfflineAudioContextで、同じ速度3・音量60%・8秒の金属だけの比較を3床×旧／新の6本生成。ループ継ぎ目を含み、衝突音は重ねない。クリッピングなし。[ログ](metal-roll/render.txt)、[ピーク](metal-roll/render.json)。普通の床：[変更前](metal-roll/samples/metal-normal-before.wav)／[変更後](metal-roll/samples/metal-normal-after.wav)。氷：[前](metal-roll/samples/metal-ice-before.wav)／[後](metal-roll/samples/metal-ice-after.wav)。砂：[前](metal-roll/samples/metal-sand-before.wav)／[後](metal-roll/samples/metal-sand-after.wav)。合成と再生の検証であり、人間による聴感評価とは区別する。

初回の並列ブラウザ確認は、ローカルでモジュール取得失敗と起動待ちtimeoutが発生した。[合成の初回ログ](metal-roll/render-first-attempt.txt)、[操作の初回ログ](metal-roll/browser-first-attempt.txt)。単独の実ページでは全モジュールHTTP200、起動・import成功、未処理例外0を確認。原因を断定せず、起動完了後に時計／合成を開始する手順へ修正し、ローカル配信の接続待ち枠を広げて、ブラウザを逐次実行した。上記の最新検証では成功。

## 再実行

`node --test`、`node tools/verify-metal-roll.mjs`。HTTP配信先を`BASE_URL`、Playwright moduleを`PLAYWRIGHT_MODULE`へ設定し、`tools/render-metal-roll.mjs`・`browser-ball-contact-audio.mjs`・`browser-ball-lab.mjs`・`browser-ball-offline.mjs`・`browser-ball-audio-failure.mjs`を実行。`METAL_OUTPUT`／`CONTACT_OUTPUT`／`BALL_OUTPUT`で出力先を指定し、過去の証跡を上書きしない。実行資材変更時はprecacheを更新する。
