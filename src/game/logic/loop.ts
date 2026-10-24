import type { GameState } from '../types';

export const COLLAPSE_DURATION_MS = 28_000;
export const SYNC_SETTLE_MS = 18_000;
export const ERROR_AT_MS = 6_000;
export const FRACTURE_AT_MS = 10_000;
export const ERROR_STORM_AT_MS = 3_000;
export const BROWSER_CRASH_AT_MS = 6_800;
export const BLUE_SCREEN_AT_MS = 7_850;
export const ERROR_HOLD_AT_MS = 8_080;
export const ERROR_DIALOG_TIMES = [800, 2_000, 2_350, 2_700];

export function pendingSynchronization(state: GameState): boolean {
  return state.endingPhase === 'playing' && state.syncCount < 2
    && state.facilityCounts.global_freshness_sync > state.syncCount;
}
export function canBuySyncDevice(state: GameState): boolean {
  if (state.endingPhase !== 'playing' || pendingSynchronization(state)) return false;
  return state.syncCount !== 2 || state.syncElapsedMs >= SYNC_SETTLE_MS;
}
/** Severity is presentation only. It never changes real prices, balances or save validity. */
export function anomalyLevel(state: GameState): number {
  if (state.endingPhase === 'cleared') return 0;
  if (state.endingPhase === 'collapse') return state.collapseElapsedMs >= ERROR_AT_MS ? 5 : 4;
  if (state.syncCount === 2) return state.syncElapsedMs >= SYNC_SETTLE_MS ? 3 : 2;
  return state.syncCount;
}
export function canFinishFirstRun(state: GameState): boolean {
  return state.endingPhase === 'collapse' && state.collapseElapsedMs >= COLLAPSE_DURATION_MS;
}
