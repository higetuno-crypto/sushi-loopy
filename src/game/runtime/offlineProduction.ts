import type { GameState } from "../types";
import { selectTotalSushiPerSecond } from "../state/selectors";

export const MAX_OFFLINE_SECONDS = 4 * 60 * 60;

export type OfflineProductionResult = {
  offlineSeconds: number;
  offlineGain: number;
};

/**
 * Offline 生産量を計算する純粋関数。
 *
 * Store / localStorage / Date.now() を内部から直接触らない。
 * 同じ入力なら必ず同じ結果を返す。
 */
export function calculateOfflineProduction(
  state: GameState,
  savedAtMs: number,
  nowMs: number,
): OfflineProductionResult {
  if (
    !Number.isFinite(savedAtMs) ||
    !Number.isFinite(nowMs)
  ) {
    return {
      offlineSeconds: 0,
      offlineGain: 0,
    };
  }

  const elapsedSeconds =
    (nowMs - savedAtMs) / 1000;

  const offlineSeconds = Math.min(
    Math.max(elapsedSeconds, 0),
    MAX_OFFLINE_SECONDS,
  );

  if (offlineSeconds <= 0) {
    return {
      offlineSeconds: 0,
      offlineGain: 0,
    };
  }

  const sushiPerSecond =
    selectTotalSushiPerSecond(state);

  const offlineGain =
    sushiPerSecond * offlineSeconds;

  return {
    offlineSeconds,
    offlineGain,
  };
}
