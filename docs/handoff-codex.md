# Codexへの引き継ぎ（2026-09-22 更新）

## 現在地

- T-251: おためし5に6つの複合パターンを追加。全面氷＋全ゴムは採用決定、本編抽選への反映・時間調整は未実施。その他は試遊評価待ち。

- T-250: おためし4。固定迷路・全ゴム壁・全面床へ変更。力場は複数配置で比較、詳細docs/floor-lab.md。

- T-249: おためし3。氷の初期値を0.08へ訂正し、速度があるほど傾きの加減速が弱まる試遊仕様へ。重力・反重力の外周点線を削除。T-248の氷0.72は旧値。

- T-248: おためし2へ更新。床の質感と力の影響範囲・方向表示を追加。初期値はユーザー試遊値（氷0.72・砂3.2・力6・範囲1.6）。

- T-247: 別ページ `floor-lab.html` に床のおためしを追加。通常・氷・砂・重力・反重力の切替、強さ調整・設定コピー。仕様は[床のおためし](floor-lab.md)。本編への採用は実機試遊後に判断する。

- 公開版は **v0.5.6**。正式URL: https://corogalism.sikumilab.com/ 。公開アプリbb07eac、2026-09-20のPages35490993305成功。公開証跡は[deployment.md](deployment.md)。
- 直近の自動検証は123テスト成功、正式URLの320/390/576幅で動作確認済み。今回の資料整理ではテストを再実行していない。
- 2026-09-22、ユーザーから最新チュートリアルの実機試遊・とりもち本体タップ感度・端末別確認について「問題ない、完了」と報告。機種や個別測定値は推測して補わない。
- 依頼済みの実装・公開・上記実機確認は完了。残る評価はチャレンジの実機バランス（やさしい9面以降など）。追加機能の採用・優先順位は未確定。[remaining-work.md](remaining-work.md)を参照。

## 現行仕様の入口

| 対象 | 資料 |
|---|---|
| 残作業・完了報告 | [remaining-work.md](remaining-work.md)、[verification/device-checks.md](verification/device-checks.md) |
| チュートリアル | [tutorial-continuous.md](tutorial-continuous.md) |
| 葉っぱ・床・PWA | [leaf-floors-pwa.md](leaf-floors-pwa.md) |
| ゴム反発・満タンキャンディ | [rubber-and-candy.md](rubber-and-candy.md) |
| 制限時間・砂時計 | [time-and-hourglass.md](time-and-hourglass.md) |
| 記録の随時保存 | [run-record-checkpoints.md](run-record-checkpoints.md) |
| 音声・初回SE | [audio-implementation.md](audio-implementation.md) |
| 画面・ガイド・更新 | [screen-fit.md](screen-fit.md)、[play-guide.md](play-guide.md)、[manual-update.md](manual-update.md) |

## 引き継ぎで間違えやすい点

- チュートリアル説明はプレイを止めず、初回素材への接触後0.7秒で差し替え、次の更新まで保持。更新時はカード全体を1.8秒で2回金色に光らせる。「更新」文字・4秒自動終了はない。
- チュートリアルのゴム・トゲは助走先の縦壁各2区間のみ。ひとやすみは標準壁の内角(3.5,4.5)。本編のランダム配置とは別。
- とりもちは自然脱出3秒、画面ダブルタップ1組で0.5秒短縮、最短0.5秒。本体タップの入力も実装・実機確認済み。
- BGM/SE、PWA、葉っぱ、特殊床、面テーマのゴムは実装済み。BGMはプレイ中のみ、スタートSE後0.2秒待ち、再開時も曲の先頭から。
- 記録はやさしい／通常それぞれノーコン・コンティニュー使用の2枠。クリア直後にも保存する。
- 壁の説明はガイドへ集約。PAUSEからも開け、閉じてもポーズを維持。
- noindex・開発中注記は維持。正式公開方針の変更やフェーズ3移行を今回の確認完了から自動的に判断しない。

## 作業時の確認

AGENTS.mdの原則（resolveParams、BFS、物理の閾値・上限など）を維持する。テストはnode --test、PWA実行資材変更時はnode tools/update-precache.mjs。公開は既存GitHubリポジトリgerupon-lgtm/corogalismのmainからGitHub Pagesへ配信する。

[過去の引き継ぎ履歴](history/handoff-through-v0.5.6.md)は当時の記録。現行仕様と混ぜない。
