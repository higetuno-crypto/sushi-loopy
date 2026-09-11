import { resolveAchievements } from "../logic/progression";
import { useGameStore } from "../state/store";
import { calculateOfflineProduction } from "./offlineProduction";

/**
 * 経過時間ぶんの Offline 生産を現在の Store へ加算する。
 *
 * 起動時の Hydration 後と、
 * hidden から visible へ復帰したときの
 * 2箇所から呼ばれる共通の唯一の窓口。
 *
 * - sushi だけを増やす
 * - runPlayTimeMs は一切変更しない
 * - 上限 clamp / 負数の扱いは
 *   calculateOfflineProduction() に一任する
 *
 * @returns 実際に加算した SUSHI 量
 */
export function applyOfflineProduction(
  fromMs: number,
  toMs: number,
): number {
  const { offlineGain } =
    calculateOfflineProduction(
      useGameStore.getState(),
      fromMs,
      toMs,
    );

  if (
    !Number.isFinite(offlineGain) ||
    offlineGain <= 0
  ) {
    return 0;
  }

  useGameStore.setState((state) => resolveAchievements({ ...state,
    sushi: Math.min(state.sushi + offlineGain, Number.MAX_VALUE),
    totalSushiEarned: Math.min(state.totalSushiEarned + offlineGain, Number.MAX_VALUE),
  }, ["totalSushiEarned", "sushi"]));

  return offlineGain;
}
