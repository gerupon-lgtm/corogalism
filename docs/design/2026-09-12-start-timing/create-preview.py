"""承認済み音源で開始タイミングだけを試聴する。本体は変更しない。"""
from pathlib import Path
import sys
import wave

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT.parent / '.codex-browser/audio-build'))
import numpy as np

RATE = 44100

def read(name):
    with wave.open(str(ROOT / 'assets/audio' / name), 'rb') as stream:
        assert (stream.getframerate(), stream.getnchannels(), stream.getsampwidth()) == (RATE, 2, 2)
        return np.frombuffer(stream.readframes(stream.getnframes()), '<i2').reshape(-1, 2).astype(float) / 32768

cue = read('se-countdown.wav')
bgm = read('bgm.wav')
gap = float(sys.argv[1]) if len(sys.argv) > 1 else .2
assert 0 <= gap <= 2
cue_end = round(3.8 * RATE)
start = cue_end + round(gap * RATE)
length = start + 8 * RATE
mix = np.zeros((length, 2))
# 現行のSE切り出しと同じ。3・2・1のあと、0.8秒の開始SEを最後まで鳴らす。
tick = cue[:round(.55 * RATE)] * .8
for second in [0, 1, 2]:
    offset = second * RATE
    mix[offset:offset + len(tick)] += tick
chime = cue[3 * RATE:cue_end] * .8
mix[3 * RATE:3 * RATE + len(chime)] += chime
# 開始SEの完了後に短い間を空ける。現行の60%音量・短いフェードを再現。
music = bgm[:length - start].copy() * .6
music *= (1 - np.exp(-np.arange(len(music)) / RATE / .02))[:, None]
# 試聴ファイルの末尾だけ滑らかに閉じる。
tail = round(.6 * RATE)
music[-tail:] *= np.linspace(1, 0, tail)[:, None]
mix[start:] += music
assert len(chime) == round(.8 * RATE)
assert not np.any(mix[cue_end:start])
assert np.max(np.abs(mix)) < 1
out = Path(__file__).with_name(f'countdown-start-gap-{round(gap * 1000)}ms-bgm.wav')
with wave.open(str(out), 'wb') as stream:
    stream.setnchannels(2)
    stream.setsampwidth(2)
    stream.setframerate(RATE)
    stream.writeframes(np.rint(mix * 32767).astype('<i2').tobytes())
print(f'{out}\n{len(mix)/RATE:.1f}s; BGM starts at {start/RATE:.1f}s; gap {gap:.1f}s; peak {20*np.log10(np.max(np.abs(mix))):.1f} dBFS')
