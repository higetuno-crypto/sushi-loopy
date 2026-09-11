import { useState } from 'react';
import { FACILITIES } from '../game/data/facilities';
import { useGameStore } from '../game/state/store';
import { FacilityItem } from './FacilityItem';
export function FacilityList() {
  const [all, setAll] = useState(false);
  const counts = useGameStore(state => state.facilityCounts);
  const reached = Math.max(0, ...FACILITIES.map((f, i) => counts[f.id] > 0 ? i + 1 : 0));
  const visible = all ? FACILITIES : FACILITIES.slice(0, Math.max(2, reached + 1));
  const total = Object.values(counts).reduce((a,b) => a+b,0);
  return <section className="facility-section" aria-label="設備">
    <div className="section-heading"><div><span className="eyebrow">GROW YOUR LITTLE SHOP</span><h2>お店を育てる<span>設備</span></h2></div><span className="owned-total">{total} 個 稼働中</span></div>
    <div className="facility-list">{visible.map(f => <FacilityItem key={f.id} facility={f} />)}</div>
    {reached < FACILITIES.length - 1 && <button className="future-facilities" aria-expanded={all} onClick={() => setAll(!all)}>{all ? '近くの設備だけ表示 ↑' : `この先にも、まだ ${FACILITIES.length - visible.length} つの景色。 ↓`}</button>}
    <p className="section-note">最初の設備は10 SUSHIから。留守のあいだも、最大4時間ぶん生産します。</p>
  </section>;
}
