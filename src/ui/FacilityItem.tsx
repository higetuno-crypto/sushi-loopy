import type { FacilityDefinition } from '../game/types';
import { FACILITY_ART } from '../game/data/presentation';
import { useGameStore } from '../game/state/store';
import { selectFacilityCurrentPrice, selectFacilityProduction } from '../game/state/selectors';
import { calculateModifiers } from '../game/logic/effects';
import { formatNumber } from './format';
import { useState } from 'react';
import { playPurchase } from '../game/audio/engine';
export function FacilityItem({ facility }: { facility: FacilityDefinition }) {
  const owned = useGameStore(state => state.facilityCounts[facility.id]);
  const price = useGameStore(state => selectFacilityCurrentPrice(state, facility.id));
  const canBuy = useGameStore(state => Number.isFinite(selectFacilityCurrentPrice(state, facility.id)) && state.sushi >= selectFacilityCurrentPrice(state, facility.id));
  const production = useGameStore(state => selectFacilityProduction(state, facility.id));
  const each = useGameStore(state => { const m = calculateModifiers(state); return facility.baseProduction * m.production * (m.facility[facility.id] ?? 1); });
  const buy = useGameStore(state => state.buyFacility);
  const art = FACILITY_ART[facility.id];
  const [celebration, setCelebration] = useState(0);
  const purchase = () => {
    const before = useGameStore.getState().facilityCounts[facility.id];
    buy(facility.id);
    if (useGameStore.getState().facilityCounts[facility.id] > before) {
      playPurchase();
      setCelebration(value => value + 1);
    }
  };
  return <article className={`facility-item ${canBuy ? 'facility-item--can-buy' : ''}`} data-facility={facility.id}>
    <span className="facility-icon" aria-hidden="true">{art.icon}</span>
    <div className="facility-info"><div className="facility-title-row"><h3>{facility.displayName}</h3><span className="facility-owned">× {owned}</span></div>
      <p>{art.note}</p><div className="facility-details"><span>1個あたり +{formatNumber(each)} / 秒</span>{owned > 0 && <span>合計 {formatNumber(production)} / 秒</span>}</div></div>
    {celebration > 0 && <span key={celebration} className="purchase-pop" role="status" onAnimationEnd={() => setCelebration(0)}>✨ {art.icon} ふえた！</span>}
    <button className="facility-buy-button" type="button" disabled={!canBuy} onClick={purchase} aria-label={`${facility.displayName}を購入`}>
      <strong>{formatNumber(price)}</strong><small>SUSHI <span>{canBuy ? '＋' : '◇'}</span></small>
    </button>
  </article>;
}
