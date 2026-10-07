import type { FacilityId } from '../types';
import { FACILITIES } from '../data/facilities';

export const TOWN_COLORS = ['vermillion', 'indigo', 'leaf'] as const;
export type Town = {
  name: string;
  color: typeof TOWN_COLORS[number];
  truckColor: typeof TOWN_COLORS[number];
  weather: 'day' | 'evening' | 'rain';
  bench: boolean;
  plots: number[];
  ordersServed: number;
  orderReadyAt: number;
};
export const createTown = (): Town => ({ name: 'わたしの寿司屋', color: 'vermillion', truckColor: 'vermillion', weather: 'day', bench: true, plots: [0,1,2,3,4,5,6,7,8], ordersServed: 0, orderReadyAt: 0 });
export const copyTown = (town: Town): Town => ({ ...town, plots: [...town.plots] });
export function parseTown(value: unknown): Town | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const t = value as Record<string, unknown>;
  if (Object.keys(t).length !== 8 || typeof t.name !== 'string' || !t.name.trim() || [...t.name].length > 20 || [...t.name].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 || '<>'.includes(c))
    || !TOWN_COLORS.some(c => c === t.color) || !TOWN_COLORS.some(c => c === t.truckColor)
    || !['day','evening','rain'].includes(String(t.weather)) || typeof t.bench !== 'boolean'
    || !Array.isArray(t.plots) || t.plots.length !== 9 || new Set(t.plots).size !== 9 || !t.plots.every(n => Number.isInteger(n) && n >= 0 && n < 9)
    || !Number.isSafeInteger(t.ordersServed) || Number(t.ordersServed) < 0
    || typeof t.orderReadyAt !== 'number' || !Number.isFinite(t.orderReadyAt) || t.orderReadyAt < 0) return null;
  return copyTown(t as Town);
}
export function moveTownFacility(town: Town, id: FacilityId, slot: number): Town {
  const index = FACILITIES.findIndex(f => f.id === id);
  if (index < 0 || !Number.isInteger(slot) || slot < 0 || slot > 8) return town;
  const plots = [...town.plots], other = plots.indexOf(slot);
  [plots[index], plots[other]] = [plots[other], plots[index]];
  return { ...town, plots };
}
export const townTier = (count: number): number => count >= 25 ? 4 : count >= 10 ? 3 : count >= 5 ? 2 : count > 0 ? 1 : 0;
