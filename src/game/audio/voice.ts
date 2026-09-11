import { midiFrequency, type ScoreNote } from './score';

/** Identical synthesis for live playback and offline preview rendering. */
export function createVoice(context: BaseAudioContext, destination: AudioNode, note: ScoreNote, at: number): OscillatorNode {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = note.wave;
  oscillator.frequency.value = midiFrequency(note.note);
  const attack = Math.min(0.045, note.duration / 5);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(note.gain, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + note.duration);
  oscillator.connect(gain); gain.connect(destination);
  oscillator.addEventListener('ended', () => { oscillator.disconnect(); gain.disconnect(); }, { once: true });
  oscillator.start(at); oscillator.stop(at + note.duration + 0.03);
  return oscillator;
}
