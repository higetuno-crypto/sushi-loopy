import { useEffect, useState } from 'react';
import { playTap } from '../game/audio/engine';
import { selectTotalSushiPerSecond } from '../game/state/selectors';
import { selectTapGain, useGameStore } from '../game/state/store';
import { formatNumber } from './format';
import { useHoldTap } from './useHoldTap';

/** Keep the core action within thumb reach while browsing equipment on mobile. */
export function MobileTapDock() {
  const [visible, setVisible] = useState(false);
  const sushi = useGameStore(state => Math.floor(state.sushi));
  const sps = useGameStore(selectTotalSushiPerSecond);
  const perClick = useGameStore(selectTapGain);
  const tap = useGameStore(state => state.tapSushi);
  const hold = useHoldTap(() => { tap(); playTap(); }, visible);
  useEffect(() => {
    const target = document.querySelector('.sushi-button');
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  if (!visible) return null;
  return <aside className="mobile-tap-dock" aria-label="いつでも握る">
    <div><strong>{formatNumber(sushi)} <small>SUSHI</small></strong><span>{formatNumber(sps)} / 秒</span></div>
    <button {...hold} aria-label="さっと寿司を握る。長押しでも握れます">🍣 おして握る <span>+{formatNumber(perClick)}</span></button>
  </aside>;
}
