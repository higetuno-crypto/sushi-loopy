import type { FacilityDefinition } from '../game/types';
import { FACILITY_ART } from '../game/data/presentation';
import { useGameStore } from '../game/state/store';
import { selectFacilityCurrentPrice, selectFacilityProduction } from '../game/state/selectors';
import { calculateModifiers } from '../game/logic/effects';
import { formatNumber } from './format';
export function FacilityItem({ facility }: { facility: FacilityDefinition }) {
  const owned = useGameStore(state => state.facilityCounts[facility.id]);
  const price = useGameStore(state => selectFacilityCurrentPrice(state, facility.id));
  const canBuy = useGameStore(state => Number.isFinite(selectFacilityCurrentPrice(state, facility.id)) && state.sushi >= selectFacilityCurrentPrice(state, facility.id));
  const production = useGameStore(state => selectFacilityProduction(state, facility.id));
  const each = useGameStore(state => { const m = calculateModifiers(state); return facility.baseProduction * m.production * (m.facility[facility.id] ?? 1); });
  const buy = useGameStore(state => state.buyFacility);
  const art = FACILITY_ART[facility.id];
  return <article className={`facility-item ${canBuy ? 'facility-item--can-buy' : ''}`} data-facility={facility.id}>
    <span className="facility-icon" aria-hidden="true">{art.icon}</span>
    <div className="facility-info"><div className="facility-title-row"><h3>{facility.displayName}</h3><span className="facility-owned">× {owned}</span></div>
      <p>{art.note}</p><div className="facility-details"><span>1個あたり +{formatNumber(each)} / 秒</span>{owned > 0 && <span>合計 {formatNumber(production)} / 秒</span>}</div></div>
    <button className="facility-buy-button" type="button" disabled={!canBuy} onClick={() => buy(facility.id)} aria-label={`${facility.displayName}を購入`}>
      <strong>{formatNumber(price)}</strong><small>SUSHI <span>{canBuy ? '＋' : '◇'}</span></small>
    </button>
  </article>;
}
