import type {
  FacilityId,
  GameState,
} from "../types";
import {
  SAVE_V1_FACILITY_IDS,
  type SaveData,
} from "./types";
import { createSaveSnapshot, createHydratedGameState } from "./snapshot";
import { parseCurrentSaveData } from "./validation";
import { migrateSaveData } from "./migrations";
import { saveGameState } from "./storage";
import { useGameStore } from "../state/store";

export const FACILITY_CHECKPOINT_STORAGE_KEY =
  "sushi-loopy.facility-checkpoints";

export interface FacilityCheckpoint {
  facilityId: FacilityId;
  createdAtMs: number;

  /**
   * Checkpoint 専用の別 Save schema は作らない。
   * Main Save と同じ SaveData payload をそのまま保持する。
   */
  save: SaveData;
}

type FacilityCheckpointMap = Partial<
  Record<FacilityId, FacilityCheckpoint>
>;

export type CreateFacilityCheckpointResult =
  | {
      success: true;
      created: boolean;
    }
  | {
      success: false;
      error: string;
    };

export type RestoreFacilityCheckpointResult =
  | {
      success: true;

      /**
       * 復元後の Main Save 書き込みが成功したか。
       *
       * false の場合、State は復元されているが
       * 次回起動時には復元前へ戻ってしまう。
       */
      mainSavePersisted: boolean;
    }
  | {
      success: false;
      error: string;
    };

type UnknownRecord = Record<string, unknown>;

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isFiniteNonNegativeInteger(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function createSavePayload(state: GameState, savedAtMs: number): SaveData {
  return { ...createSaveSnapshot(state), savedAtMs };
}

function parseCheckpoint(
  value: unknown,
  expectedFacilityId: FacilityId,
): FacilityCheckpoint | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.facilityId !==
    expectedFacilityId
  ) {
    return null;
  }

  if (
    !isFiniteNonNegativeInteger(
      value.createdAtMs,
    )
  ) {
    return null;
  }

  /**
   * Checkpoint 内の Save payload も
   * Main Save と同じ Migration / Validation を通す。
   *
   * future schema や壊れた Save はここで拒否される。
   */
  const migratedSave =
    migrateSaveData(value.save);

  if (migratedSave === null) {
    return null;
  }

  return {
    facilityId:
      expectedFacilityId,

    createdAtMs:
      value.createdAtMs,

    save:
      migratedSave,
  };
}

/**
 * localStorage の生の内容をそのまま読む。
 *
 * 検証に通らないエントリも「読めなかった値」として保持する。
 * 書き込み時にこの生データへマージすることで、
 * このビルドが解釈できない Checkpoint
 * （例: 将来の schemaVersion 2 で作られたもの）を
 * 消してしまわないようにする。
 */
function readRawCheckpointRecord():
  UnknownRecord | null {
  try {
    const serialized =
      localStorage.getItem(
        FACILITY_CHECKPOINT_STORAGE_KEY,
      );

    if (serialized === null) {
      return {};
    }

    const parsed: unknown =
      JSON.parse(serialized);

    if (!isRecord(parsed)) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn(
      "Failed to read facility checkpoints.",
      error,
    );

    return null;
  }
}

function readCheckpointMap():
  FacilityCheckpointMap {
  const parsed =
    readRawCheckpointRecord();

  if (parsed === null) return {};

  const checkpoints:
    FacilityCheckpointMap = {};

  for (
    const facilityId
    of SAVE_V1_FACILITY_IDS
  ) {
    const checkpoint =
      parseCheckpoint(
        parsed[facilityId],
        facilityId,
      );

    if (checkpoint !== null) {
      checkpoints[facilityId] =
        checkpoint;
    }
  }

  return checkpoints;
}

function writeRawCheckpointRecord(
  record: UnknownRecord,
): boolean {
  try {
    localStorage.setItem(
      FACILITY_CHECKPOINT_STORAGE_KEY,
      JSON.stringify(record),
    );

    return true;
  } catch (error) {
    console.warn(
      "Failed to write facility checkpoints.",
      error,
    );

    return false;
  }
}

/**
 * 施設を実際に初回購入した直後だけ呼ぶ。
 *
 * 既に同じ FacilityId の Checkpoint が存在する場合は
 * 絶対に上書きしない。
 *
 * この関数自身は Game State を変更しない。
 */
export function
createFacilityCheckpointIfAbsent(
  facilityId: FacilityId,
  state: GameState,
): CreateFacilityCheckpointResult {
  const rawRecord =
    readRawCheckpointRecord();

  if (rawRecord === null) return { success: false, error: 'Existing checkpoint archive could not be read; it was preserved.' };

  /**
   * 存在判定は「検証に通ったか」ではなく
   * 「そのキーが既にあるか」で行う。
   *
   * 検証に落ちたエントリを未作成扱いにすると、
   * 読めないだけの正当な Checkpoint を
   * 上書きして失うことになる。
   */
  if (
    rawRecord[facilityId] !== undefined
  ) {
    return {
      success: true,
      created: false,
    };
  }

  /**
   * 二重ガード。
   *
   * Tracker 側でも 0 -> 1 を確認するが、
   * Storage 側でも本当に owned === 1 か確認する。
   */
  if (
    state.facilityCounts[
      facilityId
    ] !== 1
  ) {
    return {
      success: false,
      error:
        "Facility checkpoint can only be created immediately after the first purchase.",
    };
  }

  const createdAtMs =
    Date.now();

  const checkpoint:
    FacilityCheckpoint = {
      facilityId,
      createdAtMs,

      /**
       * 購入処理完了後に渡された
       * State から snapshot を作る。
       */
      save:
        createSavePayload(
          state,
          createdAtMs,
        ),
    };

  /**
   * 既存の生データへマージして書き戻す。
   *
   * このビルドが解釈できなかったエントリも
   * そのまま残す。
   */
  if (!parseCurrentSaveData(checkpoint.save)) return { success: false, error: "Invalid checkpoint snapshot." };

  const written =
    writeRawCheckpointRecord({
      ...rawRecord,
      [facilityId]: checkpoint,
    });

  if (!written) {
    return {
      success: false,
      error:
        "Failed to save facility checkpoint.",
    };
  }

  return {
    success: true,
    created: true,
  };
}

/**
 * UI 用。
 *
 * Save schema v1 の施設順で返す。
 */
export function
listFacilityCheckpoints():
  FacilityCheckpoint[] {
  const checkpoints =
    readCheckpointMap();

  const result:
    FacilityCheckpoint[] = [];

  for (
    const facilityId
    of SAVE_V1_FACILITY_IDS
  ) {
    const checkpoint =
      checkpoints[facilityId];

    if (
      checkpoint !== undefined
    ) {
      result.push(checkpoint);
    }
  }

  return result;
}

/**
 * Facility Checkpoint を復元する。
 *
 * 重要:
 * - Offline Production は呼ばない
 * - Migration / Validation を再度通す
 * - 成功後 Main Save を即時更新する
 * - Checkpoint 自体は削除/上書きしない
 */
export function
restoreFacilityCheckpoint(
  facilityId: FacilityId,
): RestoreFacilityCheckpointResult {
  const checkpoints =
    readCheckpointMap();

  const checkpoint =
    checkpoints[facilityId];

  if (
    checkpoint === undefined
  ) {
    return {
      success: false,
      error:
        "Facility checkpoint not found.",
    };
  }

  /**
   * localStorage から来たデータを信用せず、
   * Restore の直前にも Migration / Validation。
   */
  const saveData =
    migrateSaveData(
      checkpoint.save,
    );

  if (saveData === null) {
    return {
      success: false,
      error:
        "Facility checkpoint is invalid or unsupported.",
    };
  }

  /**
   * Main Save / Save Code と同じ
   * 永続化対象の全項目を共通Hydrationで復元。
   *
   * Zustand setState は partial merge なので
   * tapSushi / buyFacility 等の action は残る。
   */
  const hydrated = createHydratedGameState(saveData);
  useGameStore.setState({ ...hydrated,
    previousRun: useGameStore.getState().previousRun ?? hydrated.previousRun,
  });

  /**
   * Offline Production は一切行わない。
   *
   * 復元した snapshot が
   * そのまま現在状態となる。
   */

  /**
   * 次の F5 で復元前へ戻らないよう、
   * 復元直後に Main Save を更新する。
   *
   * saveGameState 側で新しい savedAtMs が付くため、
   * Restore 後の通常 Offline 判定も正常になる。
   *
   * 書き込みに失敗した場合、State は復元済みでも
   * 次回起動では復元前へ戻る。
   * 成功したと言い切らず呼び出し側へ伝える。
   */
  const saveResult = saveGameState(
    useGameStore.getState(),
  );

  return {
    success: true,
    mainSavePersisted:
      saveResult.success,
  };
}
