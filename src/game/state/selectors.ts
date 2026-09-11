// Derived values only; never persisted in GameState.
import { calculateModifiers } from '../logic/effects';
import { FACILITIES } from '../data/facilities';
import {
  calculateCurrentPrice,
  calculateFacilityProduction,
} from '../logic/economy';
import type {
  FacilityDefinition,
  FacilityId,
  GameState,
} from '../types';

/**
 * FacilityId から施設定義を取得する。
 */
function getFacilityDefinition(
  facilityId: FacilityId,
): FacilityDefinition {
  const facility = FACILITIES.find(
    (candidate) => candidate.id === facilityId,
  );

  if (!facility) {
    throw new Error(
      `Facility definition not found: ${facilityId}`,
    );
  }

  return facility;
}

/**
 * 指定施設の所有数を取得する。
 */
export function selectFacilityCount(
  state: GameState,
  facilityId: FacilityId,
): number {
  return state.facilityCounts[facilityId];
}

/**
 * 指定施設の現在価格を取得する。
 */
export function selectFacilityCurrentPrice(
  state: GameState,
  facilityId: FacilityId,
): number {
  const facility = getFacilityDefinition(facilityId);
  const ownedCount = selectFacilityCount(
    state,
    facilityId,
  );

  return calculateCurrentPrice(
    facility,
    ownedCount,
  );
}

/**
 * 指定施設の現在の SUSHI/sec を取得する。
 */
export function selectFacilityProduction(
  state: GameState,
  facilityId: FacilityId,
): number {
  const facility = getFacilityDefinition(facilityId);
  const ownedCount = selectFacilityCount(
    state,
    facilityId,
  );

  const modifiers = calculateModifiers(state);
  return calculateFacilityProduction(
    facility,
    ownedCount,
  ) * modifiers.production * (modifiers.facility[facilityId] ?? 1);
}

/**
 * 現在の全施設を合計した SUSHI/sec を取得する。
 */
export function selectTotalSushiPerSecond(
  state: GameState,
): number {
  return FACILITIES.reduce((total, facility) => total + selectFacilityProduction(state, facility.id), 0);
}

export function selectSushiPerClick(state: GameState): number {
  return calculateModifiers(state).click;
}

export function selectProductionBonus(state: GameState): number {
  return calculateModifiers(state).production - 1;
}
