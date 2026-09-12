import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../game/state/store';
import { createSaveSnapshot } from '../game/save/snapshot';
import { FACILITIES } from '../game/data/facilities';
import { formatNumber, formatTime } from './format';

export function EndingScreen() {
  const time = useGameStore(state => state.runPlayTimeMs);
  const earned = useGameStore(state => state.totalSushiEarned);
  const clicks = useGameStore(state => state.totalClicks);
  const counts = useGameStore(state => state.facilityCounts);
  const replay = useGameStore(state => state.replaySynchronization);
  const [showRecord, setShowRecord] = useState(false);
  const [error, setError] = useState('');
  const surface = useRef<HTMLElement>(null);
  useEffect(() => { surface.current?.scrollIntoView({ block: 'start' }); }, []);
  const replayEnding = () => {
    if (!window.confirm('クリア記録をバックアップし、同期装置の購入前へ戻ります。同期装置の購入費用を返却します。ほかの設備と実績は残ります。')) return;
    try {
      const backup = JSON.stringify({ ...createSaveSnapshot(useGameStore.getState()), savedAtMs: Date.now() });
      localStorage.setItem('sushi-loopy.before-sync-replay', backup);
      if (localStorage.getItem('sushi-loopy.before-sync-replay') !== backup) throw Error('backup failed');
      replay();
    } catch { setError('記録をバックアップできませんでした。Save Codeを書き出してからお試しください。'); }
  };
  return <section id="counter" ref={surface} className="ending-screen ending-cleared" aria-label="1周目の結末">
    <div className="ending-story"><h1>おあがりよ。</h1></div>
    <div className="clear-record">
      <strong className="clear-seal">1周目 CLEAR</strong>
      <dl><div><dt>営業した時間</dt><dd>{formatTime(time)}</dd></div><div><dt>届けたSUSHI</dt><dd>{formatNumber(earned)}</dd></div><div><dt>手で握った回数</dt><dd>{formatNumber(clicks)}</dd></div></dl>
      <p className="ending-thanks">遊んでくれて、ありがとうございました。</p>
      <button className="ending-secondary" onClick={() => setShowRecord(value => !value)} aria-expanded={showRecord}>育てたお店の記録{showRecord ? 'を閉じる' : 'を見る'}</button>
      {showRecord && <ul className="ending-facility-record">{FACILITIES.map(f => <li key={f.id}><span>{f.displayName}</span><strong>{formatNumber(counts[f.id])} 台</strong></li>)}</ul>}
      <small>到達記録は自動保存されます。画面下からSave Codeを書き出せます。</small>
      <button className="ending-secondary replay-sync" onClick={replayEnding}>同期装置の購入前から試す</button>
      {error && <p role="alert">{error}</p>}
    </div>
  </section>;
}
