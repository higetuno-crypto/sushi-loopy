import { anomalyLevel, BROWSER_CRASH_AT_MS, ERROR_DIALOG_TIMES, ERROR_HOLD_AT_MS, ERROR_STORM_AT_MS } from '../logic/loop';
import { useGameStore } from '../state/store';
import { BPM, notesAtStep, type ScoreNote } from './score';
import { createVoice } from './voice';

let context: AudioContext | null = null;
let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let enabled = false;
let volume = 0.35;
let nextTime = 0;
let step = 0;
let lastTapTime = 0;
let generation = 0;
const active = new Set<AudioScheduledSourceNode>();
let errorBuffer: AudioBuffer | null = null;
let errorLoading: Promise<void> | null = null;
let errorLoop: AudioBufferSourceNode | null = null;
let lastErrorMs = -1;
let errorSnapshot = -1;
let errorSnapshotAt = 0;
const errorCues = [...ERROR_DIALOG_TIMES, ...Array.from({ length: 18 }, (_, i) => BROWSER_CRASH_AT_MS + i * 60)];

function loadErrorAudio() {
  if (!context || errorLoading) return;
  const audio = context;
  errorLoading = fetch(new URL('./windows-error-reference.wav', import.meta.url))
    .then(response => { if (!response.ok) throw new Error('Error audio unavailable'); return response.arrayBuffer(); })
    .then(data => audio.decodeAudioData(data))
    .then(buffer => { errorBuffer = buffer; })
    .catch(() => { /* The visual ending must still complete if the optional audio cannot load. */ });
}

function scheduleErrors() {
  if (!context || !master) return;
  const state = useGameStore.getState();
  if (state.syncCount >= 2) loadErrorAudio();
  if (state.endingPhase !== 'collapse') { lastErrorMs = -1; errorSnapshot = -1; return; }
  if (errorSnapshot !== state.collapseElapsedMs) {
    errorSnapshot = state.collapseElapsedMs; errorSnapshotAt = context.currentTime;
  }
  const ms = errorSnapshot + Math.min(250, (context.currentTime - errorSnapshotAt) * 1000);
  const previous = lastErrorMs < 0 ? ms - 1 : lastErrorMs;
  lastErrorMs = ms;
  if (ms >= ERROR_HOLD_AT_MS) { clearNotes(); return; }
  if (!errorBuffer) return;
  if (ms >= ERROR_STORM_AT_MS && ms < BROWSER_CRASH_AT_MS && !errorLoop) {
    const node = context.createBufferSource(); node.buffer = errorBuffer;
    node.loop = true; node.loopStart = .43; node.loopEnd = 2.85;
    const gain = context.createGain(); gain.gain.value = .8; node.connect(gain); gain.connect(master);
    node.start(context.currentTime, .43 + ((ms - ERROR_STORM_AT_MS) / 1000) % 2.42);
    node.stop(context.currentTime + (BROWSER_CRASH_AT_MS - ms) / 1000);
    errorLoop = node; active.add(node);
    node.onended = () => { active.delete(node); gain.disconnect(); if (errorLoop === node) errorLoop = null; };
  }
  for (const cue of errorCues) {
    if (cue <= previous || cue > ms || ms - cue > 300) continue;
    const node = context.createBufferSource(); node.buffer = errorBuffer;
    const gain = context.createGain(), duration = cue < ERROR_STORM_AT_MS ? .22 : .055;
    const end = Math.min(context.currentTime + duration, context.currentTime + (ERROR_HOLD_AT_MS - ms) / 1000);
    if (end - context.currentTime < .006) continue;
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(cue < ERROR_STORM_AT_MS ? 2 : .65, context.currentTime + .002);
    gain.gain.setValueAtTime(cue < ERROR_STORM_AT_MS ? 2 : .65, Math.max(context.currentTime + .002, end - .006));
    gain.gain.linearRampToValueAtTime(0, end);
    node.connect(gain); gain.connect(master);
    node.start(context.currentTime, cue < ERROR_STORM_AT_MS ? .205 : .65, end - context.currentTime);
    active.add(node); node.onended = () => { active.delete(node); gain.disconnect(); };
  }
}

export function getMusicLayers(): number {
  const counts = useGameStore.getState().facilityCounts;
  return 1 + Number(counts.craftsman > 0) + Number(counts.conveyor_sushi > 0) + Number(counts.auto_sushi_machine > 0) + Number(counts.marine_food_plant > 0);
}

/** The score's clock, including its scheduling lead; visual work follows the same beat. */
export function getMusicTimeMs(): number | null {
  return enabled && context?.state === 'running'
    ? Math.max(0, (context.currentTime - nextTime + step * 60 / BPM / 2) * 1000) : null;
}

function playNote(note: ScoreNote, at: number) {
  if (!context || !master || active.size >= 40) return;
  const oscillator = createVoice(context, master, note, at);
  active.add(oscillator);
  oscillator.addEventListener('ended', () => active.delete(oscillator), { once: true });
}

function schedule() {
  if (!enabled || !context || context.state !== 'running' || document.hidden) return;
  scheduleErrors();
  // No burst of catch-up notes after a stalled/background tab.
  if (nextTime < context.currentTime) nextTime = context.currentTime + 0.03;
  while (nextTime < context.currentTime + 0.2) {
    const state = useGameStore.getState();
    const level = anomalyLevel(state);
    if (state.endingPhase !== 'cleared' && state.collapseElapsedMs < BROWSER_CRASH_AT_MS) {
      const stuck = level >= 3 && step % 16 >= 10;
      const scoreStep = stuck ? Math.floor(step / 16) * 16 + 10 : step;
      for (const note of notesAtStep(scoreStep, getMusicLayers())) {
        const detune = level >= 2 ? Math.sin(step * 0.7) * level * 0.12 : level === 1 && step % 47 === 0 ? -0.3 : 0;
        playNote({ ...note, note: note.note + detune, gain: note.gain * (level >= 4 ? 0.55 : 1) }, nextTime);
      }
    }
    step += 1; nextTime += 60 / BPM / 2;
  }
}

function clearNotes() {
  for (const node of active) { try { node.stop(); } catch { /* already ended */ } }
  active.clear();
  errorLoop = null;
  lastErrorMs = -1;
  errorSnapshot = -1;
}

export async function setAudioEnabled(value: boolean): Promise<void> {
  const request = ++generation;
  enabled = value;
  if (timer !== null) { clearInterval(timer); timer = null; }
  if (!value) {
    clearNotes();
    if (context && context.state !== 'closed') await context.suspend();
    return;
  }
  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -16; limiter.ratio.value = 8;
    master.gain.value = volume * 0.4;
    master.connect(limiter); limiter.connect(context.destination);
  }
  await context.resume();
  if (request !== generation || !enabled) return;
  nextTime = context.currentTime + 0.05;
  timer = setInterval(schedule, 100); schedule();
}

export function setAudioVolume(value: number) {
  volume = Math.max(0, Math.min(1, value));
  if (master && context) master.gain.setTargetAtTime(volume * 0.4, context.currentTime, 0.05);
}

export function playTap() {
  if (!enabled || !context || context.state !== 'running' || context.currentTime - lastTapTime < 0.06) return;
  lastTapTime = context.currentTime;
  const pitches = [74, 78, 81, 85];
  playNote({ note: pitches[useGameStore.getState().totalClicks % pitches.length], duration: 0.12, gain: 0.12, wave: 'sine' }, context.currentTime);
}

export function playPurchase() {
  if (!enabled || !context || context.state !== 'running') return;
  [72, 76, 79, 84].forEach((note, index) => playNote({ note, duration: 0.24, gain: 0.2, wave: 'sine' }, context!.currentTime + index * 0.075));
}

let lastTownSound = 0;
export function playTownSound(kind: 'truck' | 'cat' | 'chef' | 'bubble' | 'boat' | 'guest') {
  if (!enabled || !context || context.state !== 'running' || context.currentTime-lastTownSound<0.5) return;
  lastTownSound=context.currentTime;
  const pitches=kind==='truck'||kind==='boat'?[62,66]:kind==='bubble'?[86,93]:[78,74];
  pitches.forEach((note,i)=>playNote({note,duration:kind==='bubble'?.5:.15,gain:.14,wave:kind==='truck'?'triangle':'sine'},context!.currentTime+i*.12));
}

export function bindAudioVisibility(): () => void {
  const handler = () => {
    if (!context || !enabled) return;
    if (document.hidden) {
      clearNotes();
      void context.suspend().catch(() => undefined);
    } else {
      nextTime = context.currentTime + 0.05;
      void context.resume().catch(() => undefined);
    }
  };
  document.addEventListener('visibilitychange', handler);
  return () => { document.removeEventListener('visibilitychange', handler); void setAudioEnabled(false).catch(() => undefined); };
}
