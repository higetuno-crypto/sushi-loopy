import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { startAutoSave } from "./game/runtime/autoSave";
import { bootstrapGame } from "./game/runtime/bootstrap";
import { startFacilityCheckpointTracking } from "./game/runtime/facilityCheckpointTracking";
import "./styles/global.css";

const stopGameScheduler = bootstrapGame();

/*
 * React が buyFacility を取得する前に purchase tracking を開始する。
 * Hydration は bootstrapGame() 内で完了しているため、
 * 起動時の State 復元が購入イベント扱いになることはない。
 */
const stopFacilityCheckpointTracking =
  startFacilityCheckpointTracking();

/*
 * bootstrapGame() finishes startup hydration synchronously.
 * Auto Save must start only after that process has completed.
 */
const stopAutoSave = startAutoSave();

const cleanupGame = (): void => {
  stopFacilityCheckpointTracking();
  stopAutoSave();
  stopGameScheduler();
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
      <App />
  </StrictMode>,
);

/*
 * cleanupGame は HMR の破棄時のみ使用する。
 *
 * beforeunload では停止しない。
 * beforeunload はナビゲーションがキャンセルされたり
 * bfcache から復帰したりしてもページが生き残ることがあり、
 * そこで scheduler / Auto Save / checkpoint tracking を止めると
 * 画面は動いているのに生産も保存も行われない状態で固定されてしまう。
 *
 * ページが本当に破棄されるときの最終保存は
 * Auto Save 側の pagehide が担当する。
 */
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupGame();
  });
}
