"""T-221: 試聴版v1に、控えめな4分音符のパーカッションを重ねる。"""
from pathlib import Path
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parent / '.codex-browser' / 'audio-build'))
import numpy as np
from scipy.signal import butter, sosfilt

SOURCE = ROOT / 'docs/design/2026-09-12-audio-prototypes'
OUT = SOURCE / 'v2'
OUT.mkdir(exist_ok=True)
RATE = 44100
BEAT = .6  # 既存BGMと同じ100 BPM。


def read(name):
    with wave.open(str(SOURCE / name), 'rb') as stream:
        assert (stream.getframerate(), stream.getnchannels(), stream.getsampwidth()) == (RATE, 2, 2)
        return np.frombuffer(stream.readframes(stream.getnframes()), '<i2').reshape(-1, 2).astype(float) / 32768


def write(name, sound):
    peak = float(np.max(np.abs(sound)))
    assert peak < .9, '音割れを避けるための余裕を確保する'
    with wave.open(str(OUT / name), 'wb') as stream:
        stream.setnchannels(2); stream.setsampwidth(2); stream.setframerate(RATE)
        stream.writeframes(np.rint(sound * 32767).astype('<i2').tobytes())
    print(name, len(sound)/RATE, 'sec, peak', round(20*np.log10(peak), 2), 'dBFS')


original = read('01-bgm-toy-garden.wav')
pulse = np.zeros_like(original)
rng = np.random.default_rng(22102)
t = np.arange(round(.15*RATE))/RATE
noise_filter = butter(2, 2800, fs=RATE, output='sos')
for beat in range(64):
    # 小さい木製シェーカー風。低い胴鳴りに丸いアタックを足す。
    noise = sosfilt(noise_filter, rng.normal(0, 1, len(t)))
    hit = (.50*noise*np.exp(-t/.017)
           + .44*np.sin(2*np.pi*780*t)*np.exp(-t/.014)
           + .28*np.sin(2*np.pi*185*t)*np.exp(-t/.030))
    hit *= (1-np.exp(-t/.0015))*np.minimum(1,(.15-t)/.015)
    hit *= .095 / np.max(np.abs(hit))
    if beat % 4 == 0: hit *= 1.08
    start = round(beat*BEAT*RATE)
    pulse[start:start+len(hit)] += hit[:, None]

# メロディーの音量・音色をそのまま保ち、短い同系統の部屋鳴りだけを足す。
for delay, gain in [(.043, .055), (.079, .035)]:
    n = round(delay*RATE)
    pulse += np.roll(pulse, n, axis=0)*gain
write('01-bgm-toy-garden-quarter-pulse.wav', original+pulse)

game = read('03-gameplay-mix.wav')
game_pulse = pulse[:len(game)].copy()*.72
game_pulse[round(12.25*RATE):round(14.25*RATE)] *= .48
game_pulse[:round(.2*RATE)] *= np.linspace(0,1,round(.2*RATE))[:,None]
game_pulse[-round(1.4*RATE):] *= np.linspace(1,0,round(1.4*RATE))[:,None]
write('03-gameplay-mix-quarter-pulse.wav', game+game_pulse)
print('64 quarter-note hits at 0.6-second intervals; original melody and SE preserved.')
