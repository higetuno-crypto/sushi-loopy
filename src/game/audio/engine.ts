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
const active = new Set<OscillatorNode>();

export function getMusicLayers(): number {
  const counts = useGameStore.getState().facilityCounts;
  return 1 + Number(counts.craftsman > 0) + Number(counts.conveyor_sushi > 0) + Number(counts.auto_sushi_machine > 0) + Number(counts.marine_food_plant > 0);
}

function playNote(note: ScoreNote, at: number) {
  if (!context || !master || active.size >= 40) return;
  const oscillator = createVoice(context, master, note, at);
  active.add(oscillator);
  oscillator.addEventListener('ended', () => active.delete(oscillator), { once: true });
}

function schedule() {
  if (!enabled || !context || context.state !== 'running' || document.hidden) return;
  // No burst of catch-up notes after a stalled/background tab.
  if (nextTime < context.currentTime) nextTime = context.currentTime + 0.03;
  while (nextTime < context.currentTime + 0.2) {
    for (const note of notesAtStep(step, getMusicLayers())) playNote(note, nextTime);
    step += 1; nextTime += 60 / BPM / 2;
  }
}

function clearNotes() {
  for (const node of active) { try { node.stop(); } catch { /* already ended */ } }
  active.clear();
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
