"""砂時計取得: 柔らかな上昇する3音。標準ライブラリだけで再生成。"""
from pathlib import Path
import math, struct, wave
rate=44100
samples=[]
for i in range(int(rate*.65)):
 t=i/rate; v=0
 for start,freq in [(0,659.255),(.1,830.609),(.2,987.767)]:
  u=t-start
  if u>=0:
   env=min(1,u/.008)*math.exp(-u*11)
   v+=.17*env*(math.sin(2*math.pi*freq*u)+.15*math.sin(2*math.pi*freq*2*u))
 samples.append(struct.pack('<h',round(max(-1,min(1,v))*32767)))
with wave.open(str(Path(__file__).resolve().parents[1]/'assets/audio/se-hourglass.wav'),'wb') as out:
 out.setparams((1,2,rate,0,'NONE','not compressed'));out.writeframes(b''.join(samples))
