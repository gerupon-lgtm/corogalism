# Corogalism オリジナル音源

現行BGMとSEはこのプロジェクト用に数式から合成。追加BGM4曲はユーザー提供MIDIを基にアレンジし、同じ方式で合成。外部サンプル音源は使わない。
生成コード: `tools/create-audio-prototype.py`、`tools/add-quarter-pulse.py`。
試聴原本: `docs/design/2026-09-12-audio-prototypes/`。

- `bgm.wav`: 承認済みv2の `01-bgm-toy-garden-quarter-pulse.wav` と同一。100 BPM・38.4秒。
- `se-*.wav`: 承認済みv1の各SEと同一。
- `rolling-loop.wav`: `se-rolling.wav` 原本の0.8〜2.3秒を抽出し、80msの境界クロスフェード後に冒頭80msを除いた1.42秒ループ。

音源はこのゲームへの同梱・改変・再配布を想定して作成。第三者の音源ライセンス表記は不要。

## v0.8.0 採用BGM

ユーザーが採用したbgm-levels-r6の5曲を使用。既存bgm.wavは維持し、bgm-slide.wav（鼻歌100 BPM）、bgm-force.wav（82〜97小節120 BPM）、bgm-puzzle.wav（冒頭135 BPM）、bgm-rest.wav（サビ110 BPM）を追加。全WAVは採用版とバイト一致。音源ハッシュ・長さ・測定値はdocs/verification/v0.8.0/music-assets.json、割り当てと再生制御はdocs/release-v0.8.0.mdを参照。
