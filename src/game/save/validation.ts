import { COLLAPSE_DURATION_MS, SYNC_SETTLE_MS } from '../logic/loop';
import {
    SAVE_V1_FACILITY_IDS,
    type SaveData,
    type SaveDataV1,
    type SavedFacilityCountsV1,
    type SavedGameStateV1,
    type SaveDataV2,
    type SaveDataV3,
    type SaveDataV4,
  } from "./types";
  
  type UnknownRecord = Record<string, unknown>;
  
  function isRecord(value: unknown): value is UnknownRecord {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    );
  }
  
  function isFiniteNonNegativeNumber(
    value: unknown,
  ): value is number {
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0
    );
  }
  
  function isFiniteNonNegativeInteger(
    value: unknown,
  ): value is number {
    return (
      isFiniteNonNegativeNumber(value) &&
      Number.isInteger(value)
    );
  }
  
  function isSavedFacilityCountsV1(
    value: unknown,
  ): value is SavedFacilityCountsV1 {
    if (!isRecord(value)) {
      return false;
    }
  
    const keys = Object.keys(value);
  
    if (keys.length !== SAVE_V1_FACILITY_IDS.length) {
      return false;
    }
  
    for (const facilityId of SAVE_V1_FACILITY_IDS) {
      if (
        !Object.prototype.hasOwnProperty.call(
          value,
          facilityId,
        )
      ) {
        return false;
      }
  
      if (
        !isFiniteNonNegativeInteger(
          value[facilityId],
        )
      ) {
        return false;
      }
    }
  
    for (const key of keys) {
      if (
        !SAVE_V1_FACILITY_IDS.some(
          (facilityId) => facilityId === key,
        )
      ) {
        return false;
      }
    }
  
    return true;
  }
  
  function isSavedGameStateV1(
    value: unknown,
  ): value is SavedGameStateV1 {
    if (!isRecord(value)) {
      return false;
    }
  
    const keys = Object.keys(value);
  
    if (keys.length !== 3) {
      return false;
    }
  
    if (!isFiniteNonNegativeNumber(value.sushi)) {
      return false;
    }
  
    if (
      !isSavedFacilityCountsV1(
        value.facilityCounts,
      )
    ) {
      return false;
    }
  
    if (
      !isFiniteNonNegativeNumber(
        value.runPlayTimeMs,
      )
    ) {
      return false;
    }
  
    return true;
  }
  
  /**
   * unknown から SaveDataV1 を安全に取り出す。
   *
   * JSON.parse() の結果を直接 `as SaveDataV1`
   * してはいけない。
   */
  export function parseSaveDataV1(
    value: unknown,
  ): SaveDataV1 | null {
    if (!isRecord(value)) {
      return null;
    }
  
    if (value.schemaVersion !== 1) {
      return null;
    }
  
    if (
      !isFiniteNonNegativeInteger(
        value.savedAtMs,
      )
    ) {
      return null;
    }
  
    if (!isSavedGameStateV1(value.game)) {
      return null;
    }
  
    return {
      schemaVersion: 1,
      savedAtMs: value.savedAtMs,
      game: value.game,
    };
  }

  /**
   * Migration 後のデータを、
   * 「現在のアプリが扱う SaveData」として最終確認する入口。
   *
   * Save Code / Main Save / Checkpoint など、
   * 外部から復元する処理は最終的にここへ集約できる。
   */
  export function parseCurrentSaveData(
    value: unknown,
  ): SaveData | null {
    return parseSaveDataV5(value);
  }

function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 10000 &&
    value.every(id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id)) &&
    new Set(value).size === value.length;
}

export function parseSaveDataV2(value: unknown): SaveDataV2 | null {
  if (!isRecord(value) || value.schemaVersion !== 2 || !isFiniteNonNegativeInteger(value.savedAtMs)
    || !isRecord(value.game)) return null;
  const game = value.game;
  if (Object.keys(game).length !== 8 || !isFiniteNonNegativeNumber(game.sushi)
    || !isSavedFacilityCountsV1(game.facilityCounts) || !isFiniteNonNegativeNumber(game.runPlayTimeMs)
    || !isFiniteNonNegativeInteger(game.totalClicks) || !Number.isSafeInteger(game.totalClicks)
    || !isFiniteNonNegativeNumber(game.totalSushiEarned)
    || !isIdList(game.unlockedAchievementIds) || !isIdList(game.purchasedUpgradeIds) || !isIdList(game.seenNewsIds)) return null;
  // Unknown well-formed IDs are preserved, but have no effect in this build.
  return { schemaVersion: 2, savedAtMs: value.savedAtMs, game: {
    sushi: game.sushi, facilityCounts: { ...game.facilityCounts }, runPlayTimeMs: game.runPlayTimeMs,
    totalClicks: game.totalClicks, totalSushiEarned: game.totalSushiEarned,
    unlockedAchievementIds: [...game.unlockedAchievementIds], purchasedUpgradeIds: [...game.purchasedUpgradeIds],
    seenNewsIds: [...game.seenNewsIds],
  } };
}

export function parseSaveDataV3(value: unknown): SaveDataV3 | null {
  if (!isRecord(value) || value.schemaVersion !== 3 || !isRecord(value.game)
    || Object.keys(value.game).length !== 10) return null;
  const { endingPhase, collapseElapsedMs, ...legacy } = value.game;
  const parsed = parseSaveDataV2({ schemaVersion: 2, savedAtMs: value.savedAtMs, game: legacy });
  if (!parsed || !isFiniteNonNegativeNumber(collapseElapsedMs) || collapseElapsedMs > COLLAPSE_DURATION_MS
    || (endingPhase !== 'playing' && endingPhase !== 'collapse' && endingPhase !== 'cleared')) return null;
  if (endingPhase === 'playing' && collapseElapsedMs !== 0) return null;
  if (endingPhase !== 'playing' && parsed.game.facilityCounts.global_freshness_sync < 1) return null;
  if (endingPhase === 'cleared' && collapseElapsedMs !== COLLAPSE_DURATION_MS) return null;
  return { schemaVersion: 3, savedAtMs: parsed.savedAtMs, game: { ...parsed.game,
    endingPhase, collapseElapsedMs } };
}

export function parseSaveDataV4(value: unknown): SaveDataV4 | null {
  if (!isRecord(value) || value.schemaVersion !== 4 || !isRecord(value.game)
    || Object.keys(value.game).length !== 12) return null;
  const { syncCount, syncElapsedMs, ...previous } = value.game;
  const parsed = parseSaveDataV3({ schemaVersion: 3, savedAtMs: value.savedAtMs, game: previous });
  if (!parsed || !isFiniteNonNegativeInteger(syncCount) || syncCount > 3
    || syncCount > parsed.game.facilityCounts.global_freshness_sync
    || !isFiniteNonNegativeNumber(syncElapsedMs) || syncElapsedMs > SYNC_SETTLE_MS) return null;
  if (syncCount === 0 && syncElapsedMs !== 0) return null;
  if (parsed.game.endingPhase === 'playing' && syncCount === 3) return null;
  // Legacy v3 collapse/clear records can have fewer than three devices; preserve them.
  if (parsed.game.endingPhase !== 'playing' && syncCount === 0) return null;
  return { schemaVersion: 4, savedAtMs: parsed.savedAtMs, game: { ...parsed.game, syncCount, syncElapsedMs } };
}

export function parseSaveDataV5(value: unknown): SaveData | null {
  if (!isRecord(value) || value.schemaVersion !== 5 || !isRecord(value.game)
    || Object.keys(value.game).length !== 13) return null;
  const { previousRun, ...current } = value.game;
  const parsed = parseSaveDataV4({ schemaVersion: 4, savedAtMs: value.savedAtMs, game: current });
  if (!parsed || parsed.game.endingPhase === 'cleared') return null;
  let record: SaveDataV4 | null = null;
  if (previousRun !== null) {
    record = parseSaveDataV4({ schemaVersion: 4, savedAtMs: value.savedAtMs, game: previousRun });
    if (!record || record.game.endingPhase !== 'cleared') return null;
  }
  return { schemaVersion: 5, savedAtMs: parsed.savedAtMs,
    game: { ...parsed.game, previousRun: record?.game ?? null } };
}
