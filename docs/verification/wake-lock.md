# v0.7.0 / T-289 自動消灯対策・表示変更の確認

## 状態

ローカル確認を完了。公開版の配信照合・ブラウザ確認はデプロイ後に実施する。

[仕様](../screen-wake-lock.md)。変更は画面起動ロック、タイトル入口「動く壁のあそび方」、フェーズ2注記の非表示、表示・読み込みURLの0.7.0への更新。物理・生成・時間・げんき・記録のルールは変更していない。

## 確認済み

- `node --test test/screen-wake-lock.test.js test/puzzle-integration.test.js test/onboarding.test.js test/audio-settings.test.js`：4ファイル23件、23成功・0失敗、exit 0。新しい取得／解除処理の12件には非表示、非対応、拒否、取得中の停止、解除待ち中の再開、OSによる解除、ページ退出・復帰を含む。[結果](wake-lock/unit.json)。
- ブラウザの4入口（本編・プラクティス・床の練習・動く壁の紹介）：READYから保持、ポーズ・設定・モード選択・非表示で解除、再開で取得。クリア・次面・時間切れ・コンティニューも確認。拒否・非対応でも画面の実pointer入力で球と壁の反応を確認。模擬APIと実際の画面遷移を組み合わせた確認。[通常22結果](wake-lock/local-r2/results.json)。
- 実ChromeのAPI：312×720、412×915、576×1024の3幅で` supported=true / held=true / lastError=null `を確認。ポーズ解除後も取得成功。PCのブラウザでAPIが受理されたことの確認であり、実端末の消灯時間の測定ではない。
- 同じ3幅で入口名・v0.7.0・フェーズ2非表示、横幅のはみ出しなし。狭幅タイトルとプレイ中の画像を目視確認。[312タイトル](wake-lock/local-r2/title-312.png)、[412プレイ](wake-lock/local-r2/playing-412.png)。
- オフライン：`corogalism-8adcb71b40886111`、120資材に新しいモジュールを保存。通信を切って再起動し、動く壁の紹介とプラクティスの実pointer操作・壁反応・API保持／終了時解除を確認。[結果](wake-lock/local-offline/results.json)。
- 最終ローカル確認のページ例外・通信失敗・console.error・HTTPエラーはすべて0。構文確認、差分の空白確認、独立コードレビューも完了。

最初の検証器では「壁に当たればwallHitsが増える」としたが、弱い接触はその数に含まれない既存ルールがある。速度反転と実接触も判定するよう検証器を修正し、初回の結果を[local](wake-lock/local/results.json)に保持した。アプリの不具合修正とは分ける。

## 未確認・使える条件

Pixel6a実機の画面が暗くなるまでの時間、端末の省電力・自動明るさ・発熱による減光は未確認。HTTPS上の対応ブラウザで自動消灯を防ぐ要求を出すが、端末側が拒否・解除する場合がある。明るさそのものを強制設定する機能ではない。[Chrome公式説明](https://developer.chrome.com/docs/capabilities/web-apis/wake-lock)。
