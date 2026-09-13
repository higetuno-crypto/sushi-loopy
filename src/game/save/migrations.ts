import {
    CURRENT_SCHEMA_VERSION,
    type SaveData,
  } from "./types";
  import { parseSaveDataV1, parseSaveDataV2, parseSaveDataV3, parseSaveDataV4, parseCurrentSaveData } from "./validation";
  import { createInitialGameState } from '../state/initialState';
  import { resolveAchievements } from '../logic/progression';
  
  type UnknownRecord = Record<string, unknown>;
  
  function isRecord(value: unknown): value is UnknownRecord {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    );
  }
  
  function readSchemaVersion(
    value: unknown,
  ): number | null {
    if (!isRecord(value)) {
      return null;
    }
  
    const version = value.schemaVersion;
  
    if (
      typeof version !== "number" ||
      !Number.isInteger(version) ||
      version < 1
    ) {
      return null;
    }
  
    return version;
  }
  
  /**
   * 任意バージョンの Save データを受け取り、
   * 現在の SaveData へ変換する入口。
   *
   * - 壊れたデータ → null
   * - 未知の古いバージョン → null
   * - アプリより新しいバージョン → null
   * - 正常なデータ → 現行 SaveData
   */
  export function migrateSaveData(
    value: unknown,
  ): SaveData | null {
    const schemaVersion =
      readSchemaVersion(value);
  
    if (schemaVersion === null) {
      return null;
    }
  
    /**
     * 未来のバージョンを古いアプリで読み込まない。
     *
     * 例:
     * アプリ = v1
     * Save = v2
     *
     * v2 の意味を v1 は知らないので安全に拒否する。
     */
    if (
      schemaVersion >
      CURRENT_SCHEMA_VERSION
    ) {
      return null;
    }
  
    switch (schemaVersion) {
      case 1: {
        const old = parseSaveDataV1(value);
        if (!old) return null;
        return { schemaVersion: 5, savedAtMs: old.savedAtMs,
          game: resolveAchievements({ ...createInitialGameState(), ...old.game,
            facilityCounts: { ...old.game.facilityCounts }, totalSushiEarned: old.game.sushi,
          }),
        };
      }
      case 2: {
        const old = parseSaveDataV2(value);
        if (!old) return null;
        return { schemaVersion: 5, savedAtMs: old.savedAtMs,
          game: { ...old.game, endingPhase: 'playing', collapseElapsedMs: 0, syncCount: 0, syncElapsedMs: 0, previousRun: null } };
      }
      case 3: {
        const old = parseSaveDataV3(value);
        if (!old) return null;
        return migrateSaveData({ schemaVersion: 4, savedAtMs: old.savedAtMs, game: { ...old.game,
          syncCount: old.game.endingPhase === 'playing' ? 0 : Math.min(3, old.game.facilityCounts.global_freshness_sync),
          syncElapsedMs: 0 } });
      }
      case 4: {
        const old = parseSaveDataV4(value);
        if (!old) return null;
        return { schemaVersion: 5, savedAtMs: old.savedAtMs, game:
          old.game.endingPhase === 'cleared'
            ? { ...createInitialGameState(), previousRun: old.game }
            : { ...old.game, previousRun: null } };
      }
      case 5: return parseCurrentSaveData(value);
  
      default: {
        return null;
      }
    }
  }
