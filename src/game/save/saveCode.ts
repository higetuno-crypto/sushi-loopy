import { migrateSaveData } from "./migrations";
import { createSaveSnapshot, createHydratedGameState } from "./snapshot";
import { saveGameState } from "./storage";
import type { SaveData } from "./types";
import { parseCurrentSaveData } from "./validation";
import { useGameStore } from "../state/store";

/**
 * Save Code 自体のフォーマット version。
 *
 * Save payload の schemaVersion とは別物。
 * payload の世代差は既存 Migration が担当する。
 */
export const SAVE_CODE_PREFIX =
  "SUSHILOOPY1:" as const;

export type ImportSaveCodeResult =
  | {
      ok: true;

      /**
       * Import 後の Main Save 書き込みが成功したか。
       *
       * false の場合、State は置き換わっているが
       * 次回起動時には Import 前へ戻ってしまう。
       */
      mainSavePersisted: boolean;
    }
  | {
      ok: false;
      reason:
        | "empty"
        | "invalid-prefix"
        | "decode-failed"
        | "parse-failed"
        | "invalid-save";
    };

/**
 * Save Code は暗号ではない。
 *
 * Base64 はコピーしやすい文字列へ変換しているだけで、
 * ユーザーは内容を復号・編集できる。
 *
 * STEP 2-F では手動バックアップ用途を目的とし、
 * チート対策・署名・暗号化は行わない。
 */
function encodeUtf8ToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function decodeBase64ToUtf8(
  value: string,
): string | null {
  try {
    const binary = atob(value);

    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new TextDecoder("utf-8", {
      fatal: true,
    }).decode(bytes);
  } catch {
    return null;
  }
}

function encodeSaveData(
  saveData: SaveData,
): string {
  const json = JSON.stringify(saveData);

  return (
    SAVE_CODE_PREFIX +
    encodeUtf8ToBase64(json)
  );
}

/**
 * 現在の最新 Runtime State から
 * Main Save と同じ Save snapshot を作り、
 * 人間がコピーできる Save Code にする。
 */
export function exportSaveCode(): string {
  const state = useGameStore.getState();

  const snapshot = createSaveSnapshot(state);

  /**
   * createSaveSnapshot() は savedAtMs を含まない。
   *
   * Main Save の writeMainSave() と同様に、
   * 実際に書き出すこの瞬間の時刻を付与して
   * SaveData を完成させる。
   */
  const saveData: SaveData = {
    ...snapshot,
    savedAtMs: Date.now(),
  };

  /**
   * Main Save の writeMainSave() と同じ検証を必ず通す。
   *
   * 検証を省くと、例えば sushi が NaN になったとき
   * JSON 上は null となり、
   * 「Import すると必ず失敗するバックアップ」を
   * プレイヤーへ渡してしまう。
   */
  const validated =
    parseCurrentSaveData(saveData);

  if (validated === null) {
    throw new Error(
      "Current game state cannot be exported as a valid Save Code.",
    );
  }

  return encodeSaveData(validated);
}

/**
 * Save Code を安全に復元する。
 *
 * 重要:
 * decode / JSON.parse / Migration / Validation が
 * 全て成功するまで Store は一切変更しない。
 *
 * また、Save Code Import は Offline Production を呼ばない。
 * これは「今この瞬間にその snapshot へ戻す」操作であり、
 * savedAtMs から経過時間を再計算する操作ではない。
 */
export function importSaveCode(
  input: string,
): ImportSaveCodeResult {
  const code = input.trim();

  if (code.length === 0) {
    return {
      ok: false,
      reason: "empty",
    };
  }

  if (!code.startsWith(SAVE_CODE_PREFIX)) {
    return {
      ok: false,
      reason: "invalid-prefix",
    };
  }

  const encodedPayload = code.slice(
    SAVE_CODE_PREFIX.length,
  );

  if (encodedPayload.length === 0) {
    return {
      ok: false,
      reason: "decode-failed",
    };
  }

  const decoded =
    decodeBase64ToUtf8(encodedPayload);

  if (decoded === null) {
    return {
      ok: false,
      reason: "decode-failed",
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(decoded);
  } catch {
    return {
      ok: false,
      reason: "parse-failed",
    };
  }

  /**
   * 古い schema は現行 schema へ変換。
   * future schema は migrateSaveData() 側で拒否される。
   */
  const migrated = migrateSaveData(parsed);

  if (migrated === null) {
    return {
      ok: false,
      reason: "invalid-save",
    };
  }

  /**
   * Migration 後も必ず現行 Save として最終 Validation。
   */
  const validated =
    parseCurrentSaveData(migrated);

  if (validated === null) {
    return {
      ok: false,
      reason: "invalid-save",
    };
  }

  /**
   * ここまで成功して初めて Runtime State を置き換える。
   *
   * actions は Zustand Store 側に残したまま、
   * 永続化対象の GameState 部分だけを復元する。
   */
  useGameStore.setState(createHydratedGameState(validated));

  /**
   * Import 後の状態を Main Save へ即時保存する。
   *
   * これにより次の F5 で
   * Import 前の Main Save に戻らない。
   *
   * 同時に savedAtMs も現在時刻へ更新されるので、
   * Save Code 内の古い savedAtMs を使って
   * Offline 報酬を再取得することもない。
   *
   * 書き込みに失敗した場合は成功と言い切らず、
   * 呼び出し側へ伝える。
   */
  const saveResult = saveGameState(
    useGameStore.getState(),
  );

  return {
    ok: true,
    mainSavePersisted:
      saveResult.success,
  };
}
