import type { GameState } from "../types";
import { migrateSaveData } from "./migrations";
import {
  createSaveSnapshot,
  type SaveSnapshot,
} from "./snapshot";
import type { SaveData } from "./types";
import { parseCurrentSaveData } from "./validation";

export const MAIN_SAVE_KEY =
  "sushi-loopy.save" as const;

export type SaveFailureReason =
  | "storage-unavailable"
  | "invalid-snapshot"
  | "stringify-failed"
  | "write-failed"
  | "protected-existing-save";

export type SaveResult =
  | {
      success: true;
      save: SaveData;
    }
  | {
      success: false;
      reason: SaveFailureReason;
    };

export type LoadFailureReason =
  | "storage-unavailable"
  | "not-found"
  | "read-failed"
  | "parse-failed"
  | "migration-failed"
  | "validation-failed";

export type LoadResult =
  | {
      success: true;
      save: SaveData;
    }
  | {
      success: false;
      reason: LoadFailureReason;
    };

/**
 * SaveSnapshot を Main Save として
 * localStorage に保存する。
 *
 * savedAtMs は実際に write する時点で追加する。
 *
 * 例外は外へ投げず、
 * success / failure で返す。
 */
export function writeMainSave(
  snapshot: SaveSnapshot,
): SaveResult {
  /**
   * ここではまだ外部入力と同様に
   * unknown として扱い、
   * validator を通してから SaveData とする。
   */
  const candidate: unknown = {
    ...snapshot,
    savedAtMs: Date.now(),
  };

  const save = parseCurrentSaveData(candidate);

  if (save === null) {
    return {
      success: false,
      reason: "invalid-snapshot",
    };
  }

  let serialized: string;

  try {
    serialized = JSON.stringify(save);
  } catch {
    return {
      success: false,
      reason: "stringify-failed",
    };
  }

  if (typeof window === "undefined") {
    return {
      success: false,
      reason: "storage-unavailable",
    };
  }

  try {
    const existing = window.localStorage.getItem(MAIN_SAVE_KEY);
    if (existing !== null) {
      let old: unknown;
      try { old = JSON.parse(existing); } catch { return { success: false, reason: 'protected-existing-save' }; }
      if (migrateSaveData(old) === null) return { success: false, reason: 'protected-existing-save' };
      if ((old as { schemaVersion: number }).schemaVersion === 4 && window.localStorage.getItem('sushi-loopy.save.backup-v4') === null) {
        window.localStorage.setItem('sushi-loopy.save.backup-v4', existing);
      }
      if ((old as { schemaVersion: number }).schemaVersion === 3 && window.localStorage.getItem('sushi-loopy.save.backup-v3') === null) {
        window.localStorage.setItem('sushi-loopy.save.backup-v3', existing);
      }
      if ((old as { schemaVersion: number }).schemaVersion === 2 && window.localStorage.getItem('sushi-loopy.save.backup-v2') === null) {
        window.localStorage.setItem('sushi-loopy.save.backup-v2', existing);
      }
      if ((old as { schemaVersion: number }).schemaVersion === 1 && window.localStorage.getItem('sushi-loopy.save.backup-v1') === null) {
        window.localStorage.setItem('sushi-loopy.save.backup-v1', existing);
      }
    }
    window.localStorage.setItem(
      MAIN_SAVE_KEY,
      serialized,
    );
  } catch {
    return {
      success: false,
      reason: "write-failed",
    };
  }

  return {
    success: true,
    save,
  };
}

/**
 * Runtime GameState から Snapshot を作り、
 * Main Save として保存する入口。
 *
 * Store 自体には依存しない。
 * 呼び出し側が現在 state を渡す。
 */
export function saveGameState(
  state: GameState,
): SaveResult {
  const snapshot =
    createSaveSnapshot(state);

  return writeMainSave(snapshot);
}

/**
 * Main Save を localStorage から
 * 安全に読み込む。
 *
 * localStorage
 * ↓
 * JSON.parse
 * ↓
 * unknown
 * ↓
 * migrate
 * ↓
 * validate
 * ↓
 * SaveData
 *
 * 失敗しても例外を外へ投げない。
 */
export function loadMainSave(): LoadResult {
  if (typeof window === "undefined") {
    return {
      success: false,
      reason: "storage-unavailable",
    };
  }

  let serialized: string | null;

  try {
    serialized =
      window.localStorage.getItem(
        MAIN_SAVE_KEY,
      );
  } catch {
    return {
      success: false,
      reason: "read-failed",
    };
  }

  if (serialized === null) {
    return {
      success: false,
      reason: "not-found",
    };
  }

  let raw: unknown;

  try {
    raw = JSON.parse(serialized) as unknown;
  } catch {
    return {
      success: false,
      reason: "parse-failed",
    };
  }

  let migrated: SaveData | null;

  try {
    migrated = migrateSaveData(raw);
  } catch {
    return {
      success: false,
      reason: "migration-failed",
    };
  }

  if (migrated === null) {
    return {
      success: false,
      reason: "migration-failed",
    };
  }

  /**
   * Migration 後も改めて現行 schema を
   * validate してから呼び出し側へ返す。
   *
   * 現行schemaの共通検証器を使用する。
   */
  const validated =
    parseCurrentSaveData(migrated);

  if (validated === null) {
    return {
      success: false,
      reason: "validation-failed",
    };
  }

  return {
    success: true,
    save: validated,
  };
}
