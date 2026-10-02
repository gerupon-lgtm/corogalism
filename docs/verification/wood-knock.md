# T-268 乾いた木の衝突音 / v0.6.10

2026-10-03。[仕様](../wood-knock.md)。木の壁音だけを短く乾いた「コン」に変更した。

- 変更前のテストは60ms以降の余韻が長く失敗。[変更前](wood-knock/red.txt)。変更後は素材10テスト成功。4壁とも60ms以降のエネルギー0.1%未満、主成分は低い響きから短い中域へ変更。[ログ](wood-knock/material-tests.txt)。
- `node --test`：159成功・失敗0。既存の物理・全240組合せ・HP・記録も成功。[ログ](wood-knock/unit-tests.txt)。
- 旧版v0.6.9（a913759）との比較では、99%の音響エネルギーが収まる時間が約75–77ms→19–28ms。木×4壁だけPCMが変わる。他素材の衝突16組、全素材×3床の転がり15状態、物理／設定5ファイルは一致。[比較](wood-knock/comparison.json)、[ログ](wood-knock/comparison.txt)。
- Chromeの320×568・390×844・576×1024で実pointerで木を標準壁へ当てて発音を確認。各幅で4壁×初速1.5／4の8条件、計24ケースの実際に開始した衝突音源から短い余韻を確認。ミュート、ポーズ、revision5共有、横はみ出しなし、未処理例外0。[ログ](wood-knock/browser.txt)、[状態](wood-knock/browser.json)、[390px画面](wood-knock/wood-390.png)。
- PWA100資材の完全オフラインで新しい木×石壁の衝突音を確認。金属・ビー玉の転がり、ゴム球の無音と衝突音、旧物理の更新案内も成功。[ログ](wood-knock/offline.txt)。
- OfflineAudioContextで比較WAVを生成。標準→ゴム→石→コルクの順、共通音量60%、衝突速度3相当、転がり音なし。ピーク旧0.195／新0.224、クリッピングなし。[変更前](wood-knock/samples/wood-before.wav)、[変更後](wood-knock/samples/wood-after.wav)。合成と発音の確認であり、人間による聴感評価とは区別する。

## 再実行

`node --test`、`node tools/verify-wood-knock.mjs`。HTTP配信先を`BASE_URL`、Playwright moduleを`PLAYWRIGHT_MODULE`へ設定すると比較WAVも生成する。`tools/browser-wood-knock.mjs`と`browser-ball-offline.mjs`を実行する。`WOOD_OUTPUT`で出力先を指定し、過去の証跡を上書きしない。実行資材変更時はprecacheを更新する。過去版の「全衝突PCM一致」の比較は、木の音を維持した当時の結果。
