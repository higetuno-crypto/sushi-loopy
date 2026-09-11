import { ACHIEVEMENT_BY_ID } from '../data/achievements';
import { UPGRADE_BY_ID } from '../data/upgrades';
import type { GameState, FacilityId } from '../types';

interface Modifiers { production: number; click: number; facility: Partial<Record<FacilityId, number>> }
const cache = new WeakMap<string[], WeakMap<string[], Modifiers>>();

/** Immutable ID arrays are cache keys; balances/ticks do not re-scan content. */
export function calculateModifiers(state: GameState): Modifiers {
  let upgrades = cache.get(state.unlockedAchievementIds);
  const cached = upgrades?.get(state.purchasedUpgradeIds);
  if (cached) return cached;
  const result: Modifiers = { production: 1, click: 1, facility: {} };
  const effects = [
    ...state.unlockedAchievementIds.flatMap(id => ACHIEVEMENT_BY_ID.get(id)?.effects ?? []),
    ...state.purchasedUpgradeIds.flatMap(id => UPGRADE_BY_ID.get(id)?.effects ?? []),
  ];
  for (const effect of effects) {
    switch (effect.kind) {
      case 'productionBonus': result.production += effect.amount; break;
      case 'clickBonus': result.click += effect.amount; break;
      case 'facilityBonus': result.facility[effect.id] = (result.facility[effect.id] ?? 1) + effect.amount; break;
    }
  }
  if (!upgrades) { upgrades = new WeakMap(); cache.set(state.unlockedAchievementIds, upgrades); }
  upgrades.set(state.purchasedUpgradeIds, result);
  return result;
}
