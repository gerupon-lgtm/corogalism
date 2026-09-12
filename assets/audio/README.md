# Corogalism オリジナル音源

外部サンプル・既存楽曲は使用せず、このプロジェクト用に数式から合成。
生成コード: `tools/create-audio-prototype.py`、`tools/add-quarter-pulse.py`。
試聴原本: `docs/design/2026-09-12-audio-prototypes/`。

- `bgm.wav`: 承認済みv2の `01-bgm-toy-garden-quarter-pulse.wav` と同一。100 BPM・38.4秒。
- `se-*.wav`: 承認済みv1の各SEと同一。
- `rolling-loop.wav`: `se-rolling.wav` 原本の0.8〜2.3秒を抽出し、80msの境界クロスフェード後に冒頭80msを除いた1.42秒ループ。

音源はこのゲームへの同梱・改変・再配布を想定して作成。第三者の音源ライセンス表記は不要。
