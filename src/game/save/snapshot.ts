import type { GameState } from "../types";
import {
  CURRENT_SCHEMA_VERSION,
  type SaveData,
} from "./types";

/**
 * localStorage へ書き込む直前の Save Snapshot。
 *
 * savedAtMs は storage.ts が
 * 実際の保存時に追加する。
 */
export type SaveSnapshot = Omit<
  SaveData,
  "savedAtMs"
>;

/**
 * Runtime GameState から
 * Save に必要な永続化対象だけを取り出す。
 *
 * currentPrice / SUSHI/sec / Store action
 * などは保存しない。
 */
export function createSaveSnapshot(
  state: GameState,
): SaveSnapshot {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,

    game: {
      sushi: state.sushi,

      facilityCounts: {
        ...state.facilityCounts,
      },

      runPlayTimeMs: state.runPlayTimeMs,
      totalClicks: state.totalClicks,
      totalSushiEarned: state.totalSushiEarned,
      unlockedAchievementIds: [...state.unlockedAchievementIds],
      purchasedUpgradeIds: [...state.purchasedUpgradeIds],
      seenNewsIds: [...state.seenNewsIds],
    },
  };
}

/** Shared by startup, Save Code and checkpoints. Clone all collections. */
export function createHydratedGameState(save: SaveData): GameState {
  return createSaveSnapshot(save.game).game;
}
