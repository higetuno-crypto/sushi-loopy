/** Original score: 76 BPM, D major / B minor, 8-bar phrases, 4 phrase variations. */
export const BPM = 76;
export const CHORDS = [[50,57,61,66], [47,54,57,62], [43,50,54,59], [45,52,57,61]] as const;
export const MELODIES = [
  [78, -1, 76, 73, -1, 71, -1, 73, 74, -1, 73, -1, 69, -1, -1, -1],
  [73, -1, -1, 74, 78, -1, 76, -1, 71, -1, 69, -1, 66, -1, -1, -1],
  [66, -1, 69, -1, 73, -1, -1, 71, 69, -1, 66, -1, 64, -1, -1, -1],
  [-1, -1, 73, -1, 74, 73, -1, 69, -1, 66, -1, 69, 71, -1, -1, -1],
] as const;
export const midiFrequency = (note: number) => 440 * 2 ** ((note - 69) / 12);

export interface ScoreNote { note: number; duration: number; gain: number; wave: OscillatorType; }
/** Pure score, also usable by OfflineAudioContext and later stem rendering. */
export function notesAtStep(step: number, layers: number): ScoreNote[] {
  const beat = 60 / BPM;
  const bar = Math.floor(step / 8);
  const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length];
  const notes: ScoreNote[] = [];
  if (step % 16 === 0) for (const note of chord) notes.push({ note: note + 12, duration: beat * 7.7, gain: 0.065, wave: 'sine' });
  if (layers >= 2 && step % 4 === 0) notes.push({ note: chord[0] - 12, duration: beat * 1.4, gain: 0.18, wave: 'sine' });
  if (layers >= 3 && step % 4 === 2) notes.push({ note: 93, duration: 0.045, gain: 0.02, wave: 'triangle' });
  if (layers >= 4) {
    const melody = MELODIES[Math.floor(step / 64) % MELODIES.length];
    const note = melody[step % melody.length];
    // Breathing room: melody rests for every fourth bar.
    if (note >= 0 && bar % 4 !== 3) notes.push({ note, duration: beat * 1.25, gain: 0.075, wave: 'triangle' });
  }
  if (layers >= 5 && step % 8 === 6 && bar % 2 === 1) notes.push({ note: chord[2] + 24, duration: beat * 2.5, gain: 0.04, wave: 'sine' });
  return notes;
}
