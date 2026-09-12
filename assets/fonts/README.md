# M PLUS 1p

ロゴ以外はM PLUS 1p。Kosugiは400のみのため、見出し・数値に必要な太字を持つM PLUS 1pを採用。
Google Fontsの公式配布版からRegular（400）・Bold（700）・Black（900）を取得し、FontToolsで全文字を保持したWOFF2に変換。
中間ウェイトはCSSのフォント選択により上記の近いウェイトを使う。

- 取得元: https://github.com/google/fonts/tree/main/ofl/mplus1p
- Kosugiのウェイト: https://github.com/google/fonts/blob/main/apache/kosugi/METADATA.pb
- 取得日: 2026-09-12
- ライセンス: 同梱の `OFL.txt`（SIL Open Font License 1.1）
- 変換: `TTFont(file)` → `font.flavor = 'woff2'` → `font.save(output)`（FontTools / Brotli）
- ファイル合計: 約2.14MB。外部フォントサーバーへの実行時通信なし。
- `font-display: swap`。取得失敗時はHiragino Kaku Gothic ProN / Yu Gothic / Meiryo / system-ui / sans-serif。
- Corogalismのロゴ文字は従来のTrebuchet MS / Segoe UI / sans-serifを維持。
