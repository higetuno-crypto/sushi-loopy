import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { FACILITIES } from '../game/data/facilities';
import { ASSETS, FACILITY_ART } from '../game/data/presentation';
import { getMusicTimeMs } from '../game/audio/engine';
import { BPM } from '../game/audio/score';
import { useGameStore } from '../game/state/store';
import { formatNumber } from './format';
import { SushiCounterArt } from './SushiCounterArt';

export function SushiBox() {
  const counts = useGameStore(state => state.facilityCounts);
  const owned = FACILITIES.filter(f => counts[f.id] > 0);
  const open = counts.conveyor_sushi > 0;
  // ponytail: one illustrated chef represents the staff; add actors if their jobs become distinct.
  const working = counts.craftsman > 0;
  const [arriving, setArriving] = useState(false);
  const scene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let frame = 0;
    const welcome = () => {
      setArriving(true);
      clearTimeout(timer);
      timer = setTimeout(() => setArriving(false), 4400);
      frame = requestAnimationFrame(() => {
        const rect = scene.current?.getBoundingClientRect();
        if (rect && (rect.top < 100 || rect.bottom > innerHeight - 80)) {
          const motion = document.documentElement.dataset.motion;
          const reduced = motion === 'off' || (motion !== 'on' && matchMedia('(prefers-reduced-motion: reduce)').matches);
          scene.current?.scrollIntoView({ block: 'center', behavior: reduced ? 'instant' : 'smooth' });
        }
      });
    };
    window.addEventListener('sushi-loopy:craftsman-arrived', welcome);
    return () => { window.removeEventListener('sushi-loopy:craftsman-arrived', welcome); clearTimeout(timer); cancelAnimationFrame(frame); };
  }, []);
  useEffect(() => {
    const element = scene.current;
    if (!working || !element) return;
    let frame = 0;
    let visible = false;
    const followBeat = () => {
      const time = getMusicTimeMs();
      if (time !== null) for (const animation of element.getAnimations({ subtree: true })) {
        if (animation instanceof CSSAnimation && animation.animationName.startsWith('chef-')) animation.currentTime = time;
      }
      frame = requestAnimationFrame(followBeat);
    };
    const update = () => { cancelAnimationFrame(frame); if (visible && !document.hidden) frame = requestAnimationFrame(followBeat); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(element);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); cancelAnimationFrame(frame); };
  }, [working]);
  return <section className="sushi-box" aria-label="わたしの寿司箱" data-arriving={arriving} style={{ '--work-cycle': `${60 / BPM * 4}s` } as CSSProperties}>
    <div className="sushi-box-heading"><strong>わたしの寿司箱</strong><span className="shop-state">{working ? '仕込み中' : '開店準備'}</span></div>
    <div className={`shop-scene ${working ? 'is-working' : ''}`} ref={scene}>
      <SushiCounterArt working={working} />
    </div>
    <p className="shop-caption" role="status">{arriving ? '職人さんが、やってきた。' : working ? 'ひとつ握って、またひとつ。' : '10 SUSHIで、職人さんを迎えよう。'}</p>
    <div className="sushi-box-facilities">
      {owned.map(f => <div key={f.id} className="box-facility">
        <span className="box-facility-icons" aria-hidden="true">{FACILITY_ART[f.id].icon}</span>
        <small>{f.displayName}</small><b>×{formatNumber(counts[f.id])}</b>
      </div>)}
    </div>
    <div className="shop-lane-heading"><small>{open ? 'お皿がまわりはじめた！' : '回転寿司オープンで、お皿がまわるよ'}</small><span aria-hidden="true">{open ? '●' : '○'}</span></div>
    <div className={`conveyor-strip ${open ? 'is-open' : ''}`} aria-label={open ? '回転寿司 営業中' : '回転寿司 準備中'}><div>{Array.from({ length: 12 }, (_, i) => <span aria-hidden="true" key={i}><img src={ASSETS.sushiSmall} width="32" height="32" alt="" draggable="false" /></span>)}</div></div>
  </section>;
}
