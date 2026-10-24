import { AUDIO } from '../config/gameConfig.js';
import { normalizeAudioSettings } from './audioSettings.js';
import { createFloorJingle } from './floorJingle.js';
import { createSelectBuffer } from './selectBuffer.js';
import { createImpactBuffer } from './ballMaterialAudio.js';
import { MUSIC_TRACKS, normalizeMusicTrack } from './musicTracks.js';

const files = {
  hourglass: 'se-hourglass.wav', bgm: 'bgm.wav', rolling: 'rolling-loop.wav', countdown: 'se-countdown.wav',
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
  const musicLoads = new Map(), failedMusic = new Set();
  const log = name => { events.push(name); if (events.length > 32) events.shift(); };
  const available = () => prefs.soundEnabled && context?.state === 'running' && !scene.hidden;

  function musicDelaySec() {
    if (!musicStart) return 0;
    const wallElapsed = performance.now() / 1000 - musicStart.time;
    // 音声時計でもSEの終了を待つ。音OFFでContextがない場合は実時間だけで待つ。
    const audioElapsed = musicStart.audioTime === undefined ? wallElapsed : context.currentTime - musicStart.audioTime;
    return Math.max(0, AUDIO.startCueSec + AUDIO.bgmAfterStartGapSec - Math.min(wallElapsed, audioElapsed));
  }

  function ramp(param, value, fadeSec = AUDIO.fadeSec) {
    const now = context.currentTime;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(value, now, fadeSec / 3);
  }

  function stopVoice(voice, fade = false, fadeSec = AUDIO.fadeSec) {
    if (!voice) return;
    try {
      if (fade) ramp(voice.gain.gain, 0, fadeSec);
      voice.source.stop(context.currentTime + (fade ? fadeSec : 0));
    } catch { /* 既に終了した短い音も停止対象にできる。 */ }
  }

  function startVoice(name, { loop = false, offset = 0, duration, gain = 1, delay = 0, rate = 1, attackSec = 0 } = {}) {
    const buffer = buffers.get(name) || (name === 'select' ? instantSelect : null);
    if (!available() || !buffer) return null;
    try {
      const source = context.createBufferSource(), node = context.createGain();
      source.buffer = buffer; source.loop = loop; source.playbackRate.value=rate;
      const at = context.currentTime + delay;
      node.gain.value = attackSec > 0 ? 0 : gain;
      if (attackSec > 0) {
        node.gain.setValueAtTime(0, at);
        node.gain.linearRampToValueAtTime(gain, at + attackSec);
      }
      source.connect(node); node.connect(name === 'bgm' || name.startsWith('bgm:') ? bgmGain : seGain);
      const voice = { source, gain: node, at, offset };
      source.onended = () => { source.disconnect(); node.disconnect(); voices.delete(voice); };
      if (duration === undefined) source.start(voice.at, offset);
      else source.start(voice.at, offset, duration);
      log(name);
      return voice;
    } catch { return null; }
  }

  function ensureMusic(track) {
    const name = track === 'default' ? 'bgm' : `bgm:${track}`;
    // 既定曲は従来のloadが担当。追加曲は必要な面で1回だけ取得する。
    if (track === 'default' || buffers.has(name) || musicLoads.has(name) || failedMusic.has(name)) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AUDIO.loadTimeoutMs);
    musicLoads.set(name, controller);
    void (async () => {
      try {
        const response = await fetch(new URL(`../../assets/audio/${MUSIC_TRACKS[track]}`, import.meta.url), { signal: controller.signal });
        if (!response.ok) throw new Error('music load');
        buffers.set(name, await context.decodeAudioData(await response.arrayBuffer()));
      } catch {
        failedMusic.add(name);
        onStatus('BGMを読み込めませんでした。音をOFF→ONにすると再試行できます。');
      } finally {
        clearTimeout(timeout); musicLoads.delete(name);
        // 遅れて届いた曲も、今の面・停止・音OFFを確認してから使う。
        sync();
      }
    })();
  }

  function sync() {
    if (!context) return;
    ramp(bgmGain.gain, prefs.bgmVolume);
    ramp(seGain.gain, prefs.seVolume);
    if (pendingSelect && available()) {
      const pending = pendingSelect; pendingSelect = null;
      if (performance.now() <= pending.expires) effect('select', pending.options);
    }
    const track = normalizeMusicTrack(scene.track);
    const musicName = track === 'default' ? 'bgm' : `bgm:${track}`;
    if (available() && scene.music && prefs.bgmVolume > 0) ensureMusic(track);
    const wantsMusic = available() && scene.music && prefs.bgmVolume > 0 && musicDelaySec() === 0;
    if (music && (!wantsMusic || music.track !== track)) {
      stopVoice(music, true, AUDIO.musicFadeSec); music = null;
    }
    if (wantsMusic && !music) {
      // 冒頭の打音を長いフェードで消さない。開始ノイズだけ5msで抑える。
      music = startVoice(musicName, { loop: true, offset: 0, attackSec: AUDIO.musicAttackSec });
      if (music) music.track = track;
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
      onStatus(Object.keys(files).every(name=>buffers.has(name)) ? '' : '一部の音を読み込めませんでした。音をOFF→ONにすると再試行できます。');
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
        buffers.set('floorStart',createFloorJingle(context));buffers.set('flowStart',createFloorJingle(context,true));buffers.set('flowGoal',createFloorJingle(context,true));
        context.addEventListener('statechange', () => { if (context.state !== 'running') stopEffects(); sync(); });
      }
      if (context.state !== 'running') context.resume().then(sync).catch(() => onStatus('音ボタンを押して再開してください。'));
      if (retry) { loaded = false; failedMusic.clear(); }
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
    tick(number,cue=null) {
      if (number === 0) musicStart = { time: performance.now() / 1000, audioTime: context?.currentTime };
      if(number===0&&cue){effect(cue);return;}
      effect('countdown', number === 0 ? { offset: 3, duration: AUDIO.startCueSec } : { offset: 0, duration: 0.55 });
    },
    clear(special=false) { effect('goal'); effect(special?'flowGoal':'clear', { delay: 0.18 }); },
    impact(speed, wall) {
      if (!available() || speed < AUDIO.impactMinSpeed || context.currentTime - lastImpact < AUDIO.impactIntervalSec) return;
      lastImpact = context.currentTime;
      if(wall.materialId==='cotton'&&!buffers.has('cotton'))buffers.set('cotton',createImpactBuffer(context,'default','cotton'));
      const name = wall.materialId==='racket'?'rubber':['default','cork'].includes(wall.materialId) ? 'wall' : wall.materialId;
      effect(name, { rate:wall.materialId==='cork'?.7:1, gain: 0.25 + 0.75 * Math.min(1, speed / AUDIO.impactFullSpeed) });
    },
    get state() { return { enabled: prefs.soundEnabled, context: context?.state || 'none', loaded,
      buffers: buffers.size, music: Boolean(music), rolling: Boolean(rolling), voices: voices.size,
      musicDelaySec: musicDelaySec(),
      requestedTrack: normalizeMusicTrack(scene.track), musicTrack: music?.track || null,
      musicLoading: musicLoads.size,
      bgmVolume: prefs.bgmVolume, seVolume: prefs.seVolume, events: [...events] }; },
  };
}
