import type { FacilityId } from "../types";

export const CURRENT_SCHEMA_VERSION = 5 as const;

/**
 * Save schema v1 で存在していた施設 ID。
 *
 * Runtime 側の FacilityId が将来増えても、
 * v1 の保存形式そのものは変化させない。
 */
export const SAVE_V1_FACILITY_IDS = [
  "craftsman",
  "conveyor_sushi",
  "auto_sushi_machine",
  "marine_food_plant",
  "sushi_ocean_mining",
  "fusion_sushi_converter",
  "luna_sea",
  "freshness_freezer",
  "global_freshness_sync",
] as const satisfies readonly FacilityId[];

export type SavedFacilityIdV1 =
  (typeof SAVE_V1_FACILITY_IDS)[number];

export type SavedFacilityCountsV1 = Record<
  SavedFacilityIdV1,
  number
>;

/**
 * GameState の Save v1 用スナップショット。
 *
 * Runtime の GameState 型を直接保存形式として使わない。
 * Save schema は一度公開したら固定する。
 */
export interface SavedGameStateV1 {
  sushi: number;
  facilityCounts: SavedFacilityCountsV1;
  runPlayTimeMs: number;
}

/**
 * Sushi Loopy Save Schema Version 1
 */
export interface SaveDataV1 {
  schemaVersion: 1;

  /**
   * Date.now() で取得する Unix Epoch milliseconds。
   *
   * runPlayTimeMs や performance.now() とは別物。
   * 将来の Offline Production 計算にも使用する。
   */
  savedAtMs: number;

  game: SavedGameStateV1;
}

/**
 * 現在アプリケーションが扱う最新 SaveData。
 *
 * v2 を作るときは SaveDataV2 を定義し、
 * ここを SaveDataV2 に変更する。
 */
export interface SavedGameStateV2 extends SavedGameStateV1 {
  totalClicks: number;
  totalSushiEarned: number;
  unlockedAchievementIds: string[];
  purchasedUpgradeIds: string[];
  seenNewsIds: string[];
}

export interface SaveDataV2 {
  schemaVersion: 2;
  savedAtMs: number;
  game: SavedGameStateV2;
}

export interface SavedGameStateV3 extends SavedGameStateV2 {
  endingPhase: import('../types').EndingPhase;
  collapseElapsedMs: number;
}
export interface SaveDataV3 {
  schemaVersion: 3;
  savedAtMs: number;
  game: SavedGameStateV3;
}
export interface SavedGameStateV4 extends SavedGameStateV3 {
  syncCount: number;
  syncElapsedMs: number;
}
export interface SaveDataV4 {
  schemaVersion: 4;
  savedAtMs: number;
  game: SavedGameStateV4;
}
export interface SavedGameStateV5 extends SavedGameStateV4 {
  previousRun: SavedGameStateV4 | null;
}
export interface SaveDataV5 {
  schemaVersion: 5;
  savedAtMs: number;
  game: SavedGameStateV5;
}
export type SaveData = SaveDataV5;
