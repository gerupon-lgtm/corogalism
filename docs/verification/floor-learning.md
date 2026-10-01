# T-261 床の体験と練習 / v0.6.3

2026-10-02。仕様は[床の体験と練習](../floor-learning.md)。

- `node --test`：149成功、失敗0。[ログ](floor-learning-unit-tests.txt)。難易度引数が渡っても床の練習にはHP／時間制限を設定しない。
- やさしいの初登場3・4・5・6・7・8・13・15面を各1000シードで確認。全マス到達可能、最低90秒。砂は経路上に2マス×3区間、普通の床を最低2マス挟む。単独力場と混合力場は2–3箇所で影響範囲を重ねない。[配置結果](floor-learning/placement.json)。本編は生成迷路のまま。
- 通常／やさしい各1–20面×30シード、1200操縦ケースが全てクリア。180ms程度の反応遅れ、時々の斜め入力、遅いブレーキを含むモデル。これは人間の実機評価の代わりではない。[結果](floor-learning/balance.json)、[集計](floor-learning/balance-summary.txt)。
- Chromeで実pointerイベントを送り、位置・HPを書き換えず、やさしい1–8面を通してクリア。[結果](floor-learning/browser-playthrough-v063-easy.json)。新床初登場面は90秒。ポーズ中のガイドと再開も確認。
- 床の練習でも位置移動を使わず力場へ近づき、指を離した後の方向を比較。600msの変化は普通+0.013、重力+0.586、反重力−0.331マス。後二者は中心へ／中心から外へという違いを確認。[実操作](floor-learning/practice-pointer.json)。本編と同じ係数。
- 320×568、390×844、576×1024でタイトル・5素材切替・位置と速度の保持・接触説明・ポーズ／ガイド／再開・初期位置へ戻す・ゴール後の同素材再試行・記録非保存・横はみ出しなしを確認。接触説明の個別確認と面進行の機能確認だけ位置移動を使用。`tools/browser-floor-learning.mjs`。
- ガイド15カードを維持し、床の練習への案内を1文追加。3幅で開閉、全カード、ポーズ維持を確認。`tools/browser-floor-guide.mjs`。
- 開始時の全画面・センサー拒否とpointer移行・縦向き固定を、本編各モードと床検証ページの成功／拒否／非対応18経路で確認。新しい床の練習も含む。`tools/browser-start-fullscreen.mjs`。
- PWA93資材。完全オフラインで床の練習の砂／氷／重力／反重力の切替と音源を確認。更新待機、別タブ保護、precache失敗時の継続も確認。[ログ](floor-learning/pwa.txt)。更新テストには初期登録完了待ちを追加して、reload直後の更新競合を排除。
- CPU6倍・描画倍率1/3で砂・氷・複合力場を確認。静止床／壁の毎フレーム再描画は復活していない。描画時間は同時ブラウザ実行の影響を含む測定値で、端末実測ではない。[性能](floor-learning/performance.json)。

## Standards

指摘0。AGENTS.mdのBFS・7×7・固定カメラ・resolveParams・衝突の閾値／上限を維持。静止描画キャッシュ、センサー／全画面経路と説明タイマーの停止を確認。修正が必要なコードスメルなし。

## Spec

指摘0。制限／記録なし、位置と速度の保持、同素材のリセット／再試行、無停止の接触説明、通常の配置／係数の維持を確認。追加で14000配置ケースも検証。

## 公開確認

アプリ `4a0f8ef`、[Pages36940101594成功](https://github.com/gerupon-lgtm/corogalism/actions/runs/36940101594)。正式URL https://corogalism.sikumilab.com/ 。

- 実行資材31個がHTTP200・SHA-256一致。[証跡](floor-learning/deploy-hashes.json)。
- 320／390／576幅で5素材切替・接触説明・位置と速度保持・リセット／再試行・記録非保存・ポーズ／ガイド・やさしい3面90秒を確認。スクリーンショットは `floor-learning/live/`。
- 公開版でも位置移動なしの実pointerで重力／反重力の手離し後の向きを確認。[比較](floor-learning/live/practice-pointer.json)。やさしい1–3面も実pointer通しで全てクリア。[通し結果](floor-learning/live/browser-playthrough-v063-live-easy.json)。
- v0.6.3・PWA93資材、`8a6dc97c0553fb85` を保存後、ネットワークを切って床の練習を起動し、5素材の切替を確認。[オフライン](floor-learning/live-offline.txt)。未処理例外なし。

端末の傾きで床の違いを理解しやすくなったかは、公開版の実機試遊で追加調整する。
