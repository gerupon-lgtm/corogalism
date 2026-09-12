import { AUDIO } from '../config/gameConfig.js';
import { normalizeAudioSettings } from './audioSettings.js';
import { createSelectBuffer } from './selectBuffer.js';

const files = {
  bgm: 'bgm.wav', rolling: 'rolling-loop.wav', countdown: 'se-countdown.wav',
  select: 'se-select.wav', wall: 'se-wall.wav', stone: 'se-stone.wav', spike: 'se-spike.wav',
  moss: 'se-moss.wav', rubber: 'se-rubber.wav', goal: 'se-goal.wav', clear: 'se-clear.wav',
  fail: 'se-fail.wav', continue: 'se-continue.wav', pause: 'se-pause.wav',
};

/** 操作音は同梱PCMで初回から鳴らす。他音源は音ON後に取得し、過去のSEを再生しない。 */
export function createSoundManager(initial, onStatus = () => {}) {
  let prefs = normalizeAudioSettings(initial);
  let context = null, bgmGain, seGain, loading = null, loaded = false;
  let music = null, rolling = null, lastImpact = -Infinity;
  let musicStart = null;
  let instantSelect = null, pendingSelect = null;
  let scene = { music: false, speed: 0, hidden: false };
  const buffers = new Map(), voices = new Set(), events = [];
  const log = name => { events.push(name); if (events.length > 32) events.shift(); };
  const available = () => prefs.soundEnabled && context?.state === 'running' && !scene.hidden;

  function musicDelaySec() {
    if (!musicStart) return 0;
    const wallElapsed = performance.now() / 1000 - musicStart.time;
    // 音声時計でもSEの終了を待つ。音OFFでContextがない場合は実時間だけで待つ。
    const audioElapsed = musicStart.audioTime === undefined ? wallElapsed : context.currentTime - musicStart.audioTime;
    return Math.max(0, AUDIO.startCueSec + AUDIO.bgmAfterStartGapSec - Math.min(wallElapsed, audioElapsed));
  }

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
    const buffer = buffers.get(name) || (name === 'select' ? instantSelect : null);
    if (!available() || !buffer) return null;
    try {
      const source = context.createBufferSource(), node = context.createGain();
      source.buffer = buffer; source.loop = loop;
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
    ramp(bgmGain.gain, prefs.bgmVolume);
    ramp(seGain.gain, prefs.seVolume);
    if (pendingSelect && available()) {
      const pending = pendingSelect; pendingSelect = null;
      if (performance.now() <= pending.expires) effect('select', pending.options);
    }
    const wantsMusic = available() && scene.music && prefs.bgmVolume > 0 && musicDelaySec() === 0;
    if (!wantsMusic && music) {
      stopVoice(music, true); music = null;
    } else if (wantsMusic && !music) {
      music = startVoice('bgm', { loop: true, offset: 0, gain: 0 });
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
    pendingSelect = null;
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
        instantSelect = createSelectBuffer(context);
        context.addEventListener('statechange', () => { if (context.state !== 'running') stopEffects(); sync(); });
      }
      if (context.state !== 'running') context.resume().then(sync).catch(() => onStatus('音ボタンを押して再開してください。'));
      if (retry) loaded = false;
      load(); sync();
    } catch { onStatus('音を再生できませんでした。無音で遊べます。'); }
  }

  function effect(name, options = {}) {
    if (!prefs.soundEnabled || scene.hidden || prefs.seVolume === 0) return;
    if (!available()) {
      // 初回resumeの短い待ちだけ許容。連打を蓄積せず、最後の操作音1件に限定する。
      if (name === 'select' && context) pendingSelect = { options, expires: performance.now() + AUDIO.uiSoundMaxWaitMs };
      return;
    }
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
      if (!scene.music || scene.hidden) musicStart = null;
      if (scene.hidden) stopEffects();
      sync();
    },
    effect,
    stopEffects,
    tick(number) {
      if (number === 0) musicStart = { time: performance.now() / 1000, audioTime: context?.currentTime };
      effect('countdown', number === 0 ? { offset: 3, duration: AUDIO.startCueSec } : { offset: 0, duration: 0.55 });
    },
    clear() { effect('goal'); effect('clear', { delay: 0.18 }); },
    impact(speed, wall) {
      if (!available() || speed < AUDIO.impactMinSpeed || context.currentTime - lastImpact < AUDIO.impactIntervalSec) return;
      lastImpact = context.currentTime;
      const name = wall.materialId === 'default' ? 'wall' : wall.materialId;
      effect(name, { gain: 0.25 + 0.75 * Math.min(1, speed / AUDIO.impactFullSpeed) });
    },
    get state() { return { enabled: prefs.soundEnabled, context: context?.state || 'none', loaded,
      buffers: buffers.size, music: Boolean(music), rolling: Boolean(rolling), voices: voices.size,
      musicDelaySec: musicDelaySec(),
      bgmVolume: prefs.bgmVolume, seVolume: prefs.seVolume, events: [...events] }; },
  };
}
