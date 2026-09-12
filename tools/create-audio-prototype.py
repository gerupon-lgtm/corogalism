"""T-221: 外部音源を使わず、試聴用の旋律と効果音をオフライン合成する。"""
from pathlib import Path
import json
import math
import sys
import wave

# 開発環境だけの依存。ゲーム本体にはPythonや音声ライブラリを追加しない。
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parent / '.codex-browser' / 'audio-build'))
import numpy as np
from scipy.signal import butter, sosfilt

RATE = 44100
BPM = 100
BEAT = 60 / BPM
OUT = ROOT / 'docs' / 'design' / '2026-09-12-audio-prototypes'
OUT.mkdir(parents=True, exist_ok=True)
RNG = np.random.default_rng(221)


def frequency(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def lowpass(sound, hz):
    return sosfilt(butter(2, hz, fs=RATE, output='sos'), sound, axis=0)


def mallet(midi, duration=1.4, piano=False):
    t = np.arange(round(duration * RATE)) / RATE
    f = frequency(midi)
    ratios = [1, 2.003, 3.99, 5.43] if piano else [1, 2.76, 5.4, 8.93]
    weights = [1, .25, .105, .025] if piano else [1, .18, .07, .013]
    decay = [.48, .21, .105, .065] if piano else [.25, .095, .042, .018]
    sound = sum(w * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d)
                for r, w, d in zip(ratios, weights, decay))
    attack = 1 - np.exp(-t / .0035)
    return lowpass(sound * attack * np.minimum(1, (duration-t)/.025), 4700)


def bass(midi, duration=.8):
    t = np.arange(round(duration * RATE)) / RATE
    f = frequency(midi)
    return (np.sin(2*np.pi*f*t) + .17*np.sin(4*np.pi*f*t)) * (1-np.exp(-t/.018)) * np.exp(-t/.23) * np.minimum(1,(duration-t)/.04)


def tap(f=850, duration=.18, softness=.3):
    t = np.arange(round(duration * RATE)) / RATE
    noise = lowpass(RNG.normal(0, 1, len(t)), 2200)
    sound = (np.sin(2*np.pi*f*t)*np.exp(-t/.022)
             + .22*np.sin(2*np.pi*f*2.71*t)*np.exp(-t/.011)
             + softness*noise*np.exp(-t/.014))
    return sound*(1-np.exp(-t/.001))*np.minimum(1,(duration-t)/.015)


def mix(buffer, sound, at, gain=1, pan=0, loop=False):
    if sound.ndim == 1:
        # 控えめな定位。スマートフォンのモノラル再生でも消えない。
        sound = sound[:, None] * np.array([math.sqrt((1-pan)/2), math.sqrt((1+pan)/2)])
    indices = round(at*RATE) + np.arange(len(sound))
    if loop:
        np.add.at(buffer, indices % len(buffer), sound*gain)
    else:
        valid = (indices >= 0) & (indices < len(buffer))
        buffer[indices[valid]] += sound[valid]*gain


def room(sound, loop=False):
    wet = sound.copy()
    for delay, gain in [(.043,.10),(.079,.075),(.127,.052),(.183,.032)]:
        n = round(delay*RATE)
        reflection = np.roll(sound[:, ::-1], n, axis=0)
        if not loop: reflection[:n] = 0
        wet += reflection * gain
    return wet


def write(name, sound, peak=.63, target_rms=None):
    sound = np.nan_to_num(sound)
    scale = peak / max(1e-9, np.max(np.abs(sound)))
    if target_rms is not None:
        scale = min(scale, target_rms/max(1e-9, np.sqrt(np.mean(sound**2))))
    sound = sound * scale
    pcm = np.rint(sound * 32767).astype('<i2')
    with wave.open(str(OUT/name), 'wb') as out:
        out.setnchannels(2); out.setsampwidth(2); out.setframerate(RATE)
        out.writeframes(pcm.tobytes())
    return sound


# 16小節。Cメジャーの短いモチーフに、後半は小さな変化と着地をつける。
length = 16 * 4 * BEAT
bgm = np.zeros((round(length*RATE), 2))
progression = [([60,64,67,71],48),([59,62,67,69],47),([57,60,64,67],45),([55,59,62,64],40),
               ([57,60,64,65],41),([55,60,64,67],40),([57,60,62,65],38),([55,59,62,64],43)]
melodies = [
    [(0,76),(.75,79),(1.5,81),(2.5,79),(3.25,76)],
    [(.5,74),(1.25,79),(2.5,76),(3.25,74)],
    [(0,72),(1,76),(1.75,79),(3,76)],
    [(.5,74),(1.5,71),(2.75,67)],
    [(0,69),(.75,72),(1.5,76),(2.75,77),(3.5,76)],
    [(.25,74),(1,76),(2,72),(3,67)],
    [(0,69),(1,72),(2.25,74),(3.25,76)],
    [(0,74),(1,71),(2.5,67)],
    [(0,76),(.75,79),(1.5,81),(2.25,79),(3,76),(3.5,74)],
    [(.5,74),(1.5,79),(2.5,76)],
    [(0,72),(.75,76),(1.5,79),(2.5,81),(3.25,79)],
    [(.5,76),(1.5,74),(2.5,71)],
    [(0,69),(.75,72),(1.5,77),(2.5,76)],
    [(.25,74),(1,72),(2.25,76),(3.25,79)],
    [(0,77),(1,76),(2,74),(3,71)],
    [(0,74),(1,71),(2,72)],
]
for bar in range(16):
    chord, root = progression[bar % 8]
    at = bar*4*BEAT
    for beat, pitch in melodies[bar]:
        velocity = .23 if beat % 1 == 0 else .195
        voice = .75*mallet(pitch) + .25*mallet(pitch, piano=True)
        mix(bgm, voice, at+beat*BEAT, velocity, -.12 if bar % 2 == 0 else .12, True)
    for beat, pitch in zip([.5,1.5,2.5,3.5], chord):
        mix(bgm, mallet(pitch, piano=True), at+beat*BEAT, .073, .26, True)
    for beat, pitch in [(0,root),(2,root+7)]:
        mix(bgm, bass(pitch), at+beat*BEAT, .16, 0, True)
    for beat in [1,3]:
        mix(bgm, tap(530, .12, .55), at+beat*BEAT, .024, -.24, True)
    for beat in [.5,1.5,2.5,3.5]:
        t=np.arange(round(.09*RATE))/RATE
        brush=lowpass(RNG.normal(0,1,len(t)),3100)*(1-np.exp(-t/.004))*np.exp(-t/.015)
        mix(bgm, brush, at+beat*BEAT, .012, .2, True)

# 余韻を先頭へ回して、冒頭にも同じ小さな部屋の響きを残す。
bgm = room(bgm, loop=True)
bgm = write('01-bgm-toy-garden.wav', bgm, .60, .095)

effects = []


def effect(slug, label, duration, events, peak=.43):
    sound = np.zeros((round(duration*RATE),2))
    for at, tone, gain, pan in events: mix(sound,tone,at,gain,pan)
    sound = room(sound)
    sound[-round(.02*RATE):] *= np.linspace(1,0,round(.02*RATE))[:,None]
    sound = write('se-'+slug+'.wav',sound,peak)
    effects.append((slug,label,sound))


effect('select','選択',.35,[(0,tap(1050),1,0)],.27)
effect('countdown','3・2・1 → スタート',3.8,
       [(i,mallet(72,.5),.45,0) for i in [0,1,2]]+
       [(3,mallet(79,.8,piano=True),.7,0),(3.08,mallet(84,.7),.25,.1)],.40)
# 低く滑らかな摩擦音と、ごく小さい粒状の接触を重ねる。
duration=3.2; t=np.arange(round(duration*RATE))/RATE
speed=np.sin(np.pi*np.minimum(1,t/duration))**.8
rolling=lowpass(RNG.normal(0,1,len(t)),480)*.095*speed
rolling+=np.sin(2*np.pi*125*t)*.006*speed*(.7+.3*np.sin(2*np.pi*11*t))
for at in np.arange(.10,3.05,.115):
    n=round(at*RATE); grain=tap(470+RNG.uniform(-60,60),.045,.08)*.012
    count=min(len(grain),len(rolling)-n);rolling[n:n+count]+=grain[:count]*speed[n]
effect('rolling','転がり（加速→減速）',3.5,[(0,rolling,1,0)],.10)
effect('wall','標準壁：コツ',.45,[(0,tap(1550,.2,.09),.7,0),(.022,tap(920,.18,.04),.23,0)],.37)
effect('stone','石：カッ',.45,[(0,tap(650,.2,.85),1,0)],.40)
effect('spike','棘：短い金属音',.65,[(0,mallet(85,.5,piano=True),.4,0),(0,tap(2100,.16,.48),.7,0)],.42)
effect('moss','苔：柔らかい接触',.40,[(0,lowpass(tap(290,.22,.6),800),1,0)],.24)
t=np.arange(round(.32*RATE))/RATE
rubber=np.sin(2*np.pi*(280*t+100*.055*(1-np.exp(-t/.055))))*(1-np.exp(-t/.003))*np.exp(-t/.065)
effect('rubber','ゴム：ポン',.50,[(0,rubber,1,0)],.34)
effect('goal','カップ：コトン',.70,[(0,tap(970,.18,.10),1,0),(.08,tap(690,.18,.1),.5,0),(.16,tap(530,.2,.04),.16,0)],.39)
effect('clear','クリア：明るい上昇フレーズ',2.05,
       [(at,mallet(pitch,1.3,piano=True),gain,pan) for at,pitch,gain,pan in
        [(0,72,.6,-.12),(.13,76,.6,0),(.26,79,.65,.12),(.43,84,.6,.08),(.43,76,.26,-.12),(.43,79,.23,0)]],.48)
effect('fail','失敗：短い下降音',1.3,[(0,mallet(69,1,piano=True),.7,0),(.17,mallet(65,1,piano=True),.58,0),(.35,mallet(60,.9,piano=True),.5,0)],.37)
effect('continue','コンティニュー：前向きな2音',1.3,[(0,mallet(72,1,piano=True),.65,-.08),(.17,mallet(79,1,piano=True),.75,.08)],.42)
effect('pause','ポーズ',.45,[(0,tap(740,.14,.16),.55,0),(.075,tap(580,.14,.1),.3,0)],.25)

timeline=[]; cursor=.65
se_demo=np.zeros((round((sum(len(s)/RATE for _,_,s in effects)+len(effects)*.65+1)*RATE),2))
for slug,label,sound in effects:
    timeline.append({'file':'se-'+slug+'.wav','label':label,'start':round(cursor,2),'duration':round(len(sound)/RATE,2)})
    mix(se_demo,sound,cursor);cursor+=len(sound)/RATE+.65
# 個々のSEの音量関係を保存する。全体を再正規化しない。
write('02-se-showcase.wav',se_demo, float(np.max(np.abs(se_demo))))

# BGMと効果音の距離感を確認できる、20秒の架空のプレイ例。
demo=bgm[:round(20*RATE)].copy()*.72
lookup={slug:s for slug,_,s in effects}
for at,slug,gain in [(0.3,'select',.7),(.9,'countdown',.8),(4.8,'rolling',.8),(6.3,'wall',.7),
                      (8.2,'moss',.7),(10,'stone',.7),(12,'goal',.85),(12.25,'clear',.85),(16,'continue',.8)]:
    if slug=='clear':demo[round(at*RATE):round((at+2)*RATE)]*=.48
    mix(demo,lookup[slug],at,gain)
demo[:round(.2*RATE)]*=np.linspace(0,1,round(.2*RATE))[:,None]
demo[-round(1.4*RATE):]*=np.linspace(1,0,round(1.4*RATE))[:,None]
write('03-gameplay-mix.wav',demo,float(np.max(np.abs(demo))))

manifest={'bpm':BPM,'bgmSeconds':length,'sampleRate':RATE,'channels':2,'effects':timeline}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8', newline='\n')
for file in sorted(OUT.glob('*.wav')):
    with wave.open(str(file),'rb') as source:
        pcm=np.frombuffer(source.readframes(source.getnframes()),dtype='<i2').astype(float)/32768
        assert np.max(np.abs(pcm))<.95
        assert np.sqrt(np.mean(pcm**2))>.001
        print(file.name,round(source.getnframes()/RATE,2),'sec',round(20*np.log10(np.max(np.abs(pcm))),1),'dBFS peak')
print('Loop seam jump:',float(np.max(np.abs(bgm[0]-bgm[-1]))))
