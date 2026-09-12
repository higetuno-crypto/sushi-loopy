import { useGameStore } from '../game/state/store';
import { useEffect, useState } from 'react';

type Motion = 'auto' | 'on' | 'off';
const key = 'sushi-loopy.motion';

export function MotionControl() {
  const ending = useGameStore(state => state.endingPhase !== 'playing');
  const [motion, setMotion] = useState<Motion>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === 'on' || saved === 'off') return saved;
    } catch { /* Storage may be unavailable in a private browser. */ }
    return 'auto';
  });
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = motion;
    try { localStorage.setItem(key, motion); } catch { /* Keep the session setting. */ }
    return () => { delete document.documentElement.dataset.motion; };
  }, [motion]);
  const playing = motion === 'on' || (motion === 'auto' && !reduced);
  return <div className="motion-control">
    <button aria-pressed={playing} onClick={() => setMotion(playing ? 'off' : 'on')}>
      {playing ? 'アニメーションを停止' : 'アニメーションを再生'}
    </button>
    <small>{motion === 'auto' && reduced ? '端末の設定により動きを抑えています' : playing ? (ending ? '演出 ON' : '演出 ON・レーンは回転寿司オープン後に動きます') : '演出 OFF'}</small>
    {motion !== 'auto' && <button onClick={() => setMotion('auto')}>端末設定に戻す</button>}
  </div>;
}
