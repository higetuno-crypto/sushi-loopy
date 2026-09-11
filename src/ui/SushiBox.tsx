import { FACILITIES } from '../game/data/facilities';
import { FACILITY_ART } from '../game/data/presentation';
import { useGameStore } from '../game/state/store';
import { formatNumber } from './format';

export function SushiBox() {
  const counts = useGameStore(state => state.facilityCounts);
  const owned = FACILITIES.filter(f => counts[f.id] > 0);
  const open = counts.conveyor_sushi > 0;
  return <section className="sushi-box" aria-label="わたしの寿司箱">
    <div className="sushi-box-heading"><strong>わたしの寿司箱</strong><small>{open ? 'お皿がまわりはじめた！' : '回転寿司オープンで、お皿がまわるよ'}</small></div>
    <div className="sushi-box-facilities">
      {owned.length === 0 ? <p>🍣 ここから、小さなお店を育てよう。</p> : owned.map(f => <div key={f.id} className="box-facility">
        <span key={counts[f.id]} className="box-facility-icons" aria-hidden="true">{Array.from({ length: Math.min(counts[f.id], 3) }, () => FACILITY_ART[f.id].icon).join('')}</span>
        <small>{f.displayName}</small><b>×{formatNumber(counts[f.id])}</b>
      </div>)}
    </div>
    <div className={`conveyor-strip ${open ? 'is-open' : ''}`} aria-label={open ? '回転寿司 営業中' : '回転寿司 準備中'}><div>{Array.from({ length: 12 }, (_, i) => <span aria-hidden="true" key={i}>{['🍣', '🍙', '🍥', '🍣', '🍙', '🍣'][i % 6]}</span>)}</div></div>
  </section>;
}
