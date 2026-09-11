import type {
  FacilityId,
} from "../types";
import {
  useGameStore,
} from "../state/store";
import {
  createFacilityCheckpointIfAbsent,
} from "../save/facilityCheckpoints";

let stopActiveTracking:
  (() => void) | null = null;

/**
 * buyFacility という「購入操作」そのものだけを監視する。
 *
 * Zustand subscribe で facilityCounts の差分を監視しないため、
 *
 * - 起動時 Hydration
 * - Save Code Import
 * - Checkpoint Restore
 *
 * による State の置換は購入イベントにならない。
 */
export function
startFacilityCheckpointTracking():
  () => void {
  /**
   * HMR や二重初期化で
   * buyFacility を多重ラップしない。
   */
  if (
    stopActiveTracking !== null
  ) {
    return stopActiveTracking;
  }

  const originalBuyFacility =
    useGameStore.getState()
      .buyFacility;

  const wrappedBuyFacility = (
    facilityId: FacilityId,
  ): void => {
    const beforeOwned =
      useGameStore.getState()
        .facilityCounts[
          facilityId
        ];

    /**
     * 価格計算・SUSHI消費・owned増加は
     * すべて既存 buyFacility に任せる。
     *
     * Checkpoint 層では価格ロジックを
     * 一切複製しない。
     */
    originalBuyFacility(
      facilityId,
    );

    const afterState =
      useGameStore.getState();

    const afterOwned =
      afterState.facilityCounts[
        facilityId
      ];

    /**
     * 本物の購入による
     * 0 -> 1 の時だけ発火。
     *
     * 資金不足:
     * 0 -> 0
     *
     * 2個目:
     * 1 -> 2
     *
     * Hydration / Import / Restore:
     * wrappedBuyFacility 自体を通らない
     */
    if (
      beforeOwned === 0 &&
      afterOwned === 1
    ) {
      const result =
        createFacilityCheckpointIfAbsent(
          facilityId,
          afterState,
        );

      if (!result.success) {
        console.warn(
          "Failed to create facility checkpoint:",
          result.error,
        );
      }
    }
  };

  /**
   * UI がこれ以降取得する buyFacility は
   * wrapper になる。
   *
   * Tracker は main.tsx で
   * React render より先に開始する。
   */
  useGameStore.setState({
    buyFacility:
      wrappedBuyFacility,
  });

  const stopTracking =
    (): void => {
      const currentBuyFacility =
        useGameStore.getState()
          .buyFacility;

      /**
       * 他の処理が後から buyFacility を
       * 置き換えていた場合は勝手に戻さない。
       */
      if (
        currentBuyFacility ===
        wrappedBuyFacility
      ) {
        useGameStore.setState({
          buyFacility:
            originalBuyFacility,
        });
      }

      stopActiveTracking =
        null;
    };

  stopActiveTracking =
    stopTracking;

  return stopTracking;
}
