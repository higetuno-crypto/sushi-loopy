
import { createHydratedGameState } from "../save/snapshot";
import { useGameStore } from "../state/store";
import {
  loadMainSave,
  saveGameState,
} from "../save/storage";

import { startGameScheduler } from "./scheduler";
import { applyOfflineProduction } from "./offlineCatchUp";

/**
 * 検証済み SaveData を Runtime の GameState に戻す。
 *
 * Save形式とRuntime Stateは別の型として維持し、
 * 必要な永続化対象だけを明示的にコピーする。
 */

/**
 * Load → Hydration → Offline Production → 即時 Save。
 *
 * 順序:
 *
 * 1. Main Save Load
 * 2. Store Hydrate
 * 3. Offline Production
 * 4. Main Save 即時更新
 *
 * scheduler / Auto Save は、
 * この関数が終了した後に開始する。
 */
function hydrateMainSave(): void {
  const loadResult = loadMainSave();

  /**
   * Save が無い / 壊れている場合。
   *
   * Store は既に createInitialGameState() で
   * 初期化されているため何もしない。
   *
   * Offline Production も行わない。
   */
  if (!loadResult.success) {
    return;
  }

  const saveData = loadResult.save;

  /*
   * --------------------------------------------------
   * 1. Hydration
   * --------------------------------------------------
   */

  const hydratedState =
    createHydratedGameState(saveData);

  // replace=true は使わない。
  // Zustand の既存 action を残したまま
  // GameState 部分だけを更新する。
  useGameStore.setState(hydratedState);

  /*
   * --------------------------------------------------
   * 2. Offline Production
   * --------------------------------------------------
   *
   * 必ず Load / Hydration 後の State を使う。
   */

  /*
   * Offlineでは sushi だけを増やす。
   * runPlayTimeMs は一切変更しない。
   *
   * hidden 復帰時の catch-up と同じ関数を使い、
   * Offline 加算の経路を1本に保つ。
   */
  applyOfflineProduction(
    saveData.savedAtMs,
    Date.now(),
  );

  /*
   * --------------------------------------------------
   * 3. Offline 加算直後に Main Save
   * --------------------------------------------------
   *
   * saveGameState() が新しい savedAtMs を
   * Date.now() で作るため、
   *
   * 直後に F5 しても
   * 同じ Offline 時間を再利用できない。
   *
   * Offline Gain = 0 の場合でも保存する。
   * 未来の savedAtMs 等を現在時刻へ更新するため。
   */

  saveGameState(
    useGameStore.getState(),
  );
}

/**
 * Sushi Loopy の起動処理。
 *
 * 必ず
 *
 * Load
 * → Hydrate
 * → Offline Production
 * → 即時 Save
 * → scheduler開始
 *
 * の順で実行する。
 */
export function bootstrapGame(): () => void {
  hydrateMainSave();

  return startGameScheduler();
}
