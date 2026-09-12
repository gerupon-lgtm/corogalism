import { AUDIO } from '../config/gameConfig.js';
import { normalizeAudioSettings } from './audioSettings.js';

const files = {
  bgm: 'bgm.wav', rolling: 'rolling-loop.wav', countdown: 'se-countdown.wav',
  select: 'se-select.wav', wall: 'se-wall.wav', stone: 'se-stone.wav', spike: 'se-spike.wav',
  moss: 'se-moss.wav', rubber: 'se-rubber.wav', goal: 'se-goal.wav', clear: 'se-clear.wav',
  fail: 'se-fail.wav', continue: 'se-continue.wav', pause: 'se-pause.wav',
};

/** 音声の失敗をゲームへ伝播させない。音源は音ON後だけ取得し、遅れて届いたSEは再生しない。 */
export function createSoundManager(initial, onStatus = () => {}) {
  let prefs = normalizeAudioSettings(initial);
  let context = null, bgmGain, seGain, loading = null, loaded = false;
  let music = null, rolling = null, musicOffset = 0, lastImpact = -Infinity;
  let scene = { music: false, duck: 1, speed: 0, hidden: false };
  const buffers = new Map(), voices = new Set(), events = [];
  const log = name => { events.push(name); if (events.length > 32) events.shift(); };
  const available = () => prefs.soundEnabled && context?.state === 'running' && !scene.hidden;

  function ramp(param, value) {
    const now = context.currentTime;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(value, now, AUDIO.fadeSec / 3);
  }

  function stopVoice(voice, fade = false) {
    if (!voice) return;
    try {
      if (fade) ramp(voice.gain.gain, 0);
      voice.source.stop(context.currentTime + (fade ? AUDIO.fadeSec : 0));
    } catch { /* 既に終了した短い音も停止対象にできる。 */ }
  }

  function startVoice(name, { loop = false, offset = 0, duration, gain = 1, delay = 0 } = {}) {
    if (!available() || !buffers.has(name)) return null;
    try {
      const source = context.createBufferSource(), node = context.createGain();
      source.buffer = buffers.get(name); source.loop = loop;
      node.gain.value = gain;
      source.connect(node); node.connect(name === 'bgm' ? bgmGain : seGain);
      const voice = { source, gain: node, at: context.currentTime + delay, offset };
      source.onended = () => { source.disconnect(); node.disconnect(); voices.delete(voice); };
      if (duration === undefined) source.start(voice.at, offset);
      else source.start(voice.at, offset, duration);
      log(name);
      return voice;
    } catch { return null; }
  }

  function sync() {
    if (!context) return;
    ramp(bgmGain.gain, prefs.bgmVolume * scene.duck);
    ramp(seGain.gain, prefs.seVolume);
    const wantsMusic = available() && scene.music && prefs.bgmVolume > 0;
    if (!wantsMusic && music) {
      musicOffset = (music.offset + Math.max(0, context.currentTime - music.at)) % buffers.get('bgm').duration;
      stopVoice(music, true); music = null;
    } else if (wantsMusic && !music) {
      music = startVoice('bgm', { loop: true, offset: musicOffset, gain: 0 });
      if (music) ramp(music.gain.gain, 1);
    }
    const speed = Math.min(1, Math.max(0, scene.speed / AUDIO.rollingFullSpeed));
    const wantsRolling = available() && prefs.seVolume > 0 && scene.speed > AUDIO.rollingMinSpeed;
    if (!wantsRolling && rolling) { stopVoice(rolling, true); rolling = null; }
    else if (wantsRolling && !rolling) rolling = startVoice('rolling', { loop: true, gain: 0 });
    if (rolling) {
      ramp(rolling.gain.gain, speed * 0.85);
      ramp(rolling.source.playbackRate, 0.8 + speed * 0.4);
    }
  }

  function stopEffects() {
    voices.forEach(voice => stopVoice(voice)); voices.clear();
  }

  function load() {
    if (loading || loaded) return;
    onStatus('音を準備しています…');
    loading = Promise.all(Object.entries(files).map(async ([name, file]) => {
      if (buffers.has(name)) return;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AUDIO.loadTimeoutMs);
      try {
        const response = await fetch(new URL(`../../assets/audio/${file}`, import.meta.url), { signal: controller.signal });
        if (!response.ok) throw new Error('audio load');
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        buffers.set(name, buffer);
      } catch { /* 音源ごとに失敗を隔離し、遊びを止めない。 */ }
      finally { clearTimeout(timeout); }
    })).then(() => {
      loaded = true; loading = null;
      onStatus(buffers.size === Object.keys(files).length ? '' : '一部の音を読み込めませんでした。音をOFF→ONにすると再試行できます。');
      sync();
    });
  }

  // 必ずユーザーのクリック内で呼ぶ。許可待ちなどのawaitより先にresumeする。
  function unlock(retry = false) {
    if (!prefs.soundEnabled) return;
    try {
      if (!context) {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio) { onStatus('この端末では音を再生できません。無音で遊べます。'); return; }
        const next = new Audio();
        const musicNode = next.createGain(), effectsNode = next.createGain();
        const limiter = next.createDynamicsCompressor();
        limiter.threshold.value = AUDIO.limiterThresholdDb;
        limiter.ratio.value = AUDIO.limiterRatio;
        musicNode.connect(limiter); effectsNode.connect(limiter); limiter.connect(next.destination);
        context = next; bgmGain = musicNode; seGain = effectsNode;
        context.addEventListener('statechange', () => { if (context.state !== 'running') stopEffects(); sync(); });
      }
      if (context.state !== 'running') context.resume().then(sync).catch(() => onStatus('音ボタンを押して再開してください。'));
      if (retry) loaded = false;
      load(); sync();
    } catch { onStatus('音を再生できませんでした。無音で遊べます。'); }
  }

  function effect(name, options = {}) {
    if (!available() || prefs.seVolume === 0) return;
    if (voices.size >= AUDIO.maxVoices) { const first = voices.values().next().value; stopVoice(first); voices.delete(first); }
    const voice = startVoice(name, options);
    if (voice) voices.add(voice);
  }

  return {
    unlock,
    setPreferences(value) {
      prefs = normalizeAudioSettings(value);
      if (!prefs.soundEnabled || prefs.seVolume === 0) stopEffects();
      sync();
    },
    setScene(value) {
      scene = value;
      if (scene.hidden) stopEffects();
      sync();
    },
    effect,
    stopEffects,
    tick(number) { effect('countdown', number === 0 ? { offset: 3, duration: 0.8 } : { offset: 0, duration: 0.55 }); },
    clear() { effect('goal'); effect('clear', { delay: 0.18 }); },
    impact(speed, wall) {
      if (!available() || speed < AUDIO.impactMinSpeed || context.currentTime - lastImpact < AUDIO.impactIntervalSec) return;
      lastImpact = context.currentTime;
      const name = wall.materialId === 'default' ? 'wall' : wall.materialId;
      effect(name, { gain: 0.25 + 0.75 * Math.min(1, speed / AUDIO.impactFullSpeed) });
    },
    get state() { return { enabled: prefs.soundEnabled, context: context?.state || 'none', loaded,
      buffers: buffers.size, music: Boolean(music), rolling: Boolean(rolling), voices: voices.size,
      bgmVolume: prefs.bgmVolume, seVolume: prefs.seVolume, events: [...events] }; },
  };
}
