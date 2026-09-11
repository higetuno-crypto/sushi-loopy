import { useEffect, useState } from 'react';
import { bindAudioVisibility, getMusicLayers, setAudioEnabled, setAudioVolume } from '../game/audio/engine';
import { useGameStore } from '../game/state/store';

export function SoundControl() {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [volume, setVolume] = useState(35);
  const layers = useGameStore(() => getMusicLayers());
  useEffect(() => bindAudioVisibility(), []);
  const toggle = async () => {
    setBusy(true); setError('');
    try { await setAudioEnabled(!on); setOn(!on); }
    catch { setError('音を再生できませんでした。もう一度お試しください。'); await setAudioEnabled(false).catch(() => undefined); setOn(false); }
    finally { setBusy(false); }
  };
  return <div className="sound-control">
    <button className={on ? 'sound-on' : ''} aria-pressed={on} disabled={busy} onClick={toggle} aria-label={on ? '音を消す' : '音をつける'}>
      <span aria-hidden="true">{on ? '♫' : '♪'}</span> {on ? '音楽 ON' : '音をつける'}
    </button>
    {on && <label className="volume-control">音量<input aria-label="音量" type="range" min="0" max="100" value={volume} onChange={e => { setVolume(Number(e.target.value)); setAudioVolume(Number(e.target.value)/100); }} /></label>}
    <small>お店と育つ音楽 <span>{'●'.repeat(layers)}{'○'.repeat(5-layers)}</span></small>
    {error && <small role="alert">{error}</small>}
  </div>;
}
