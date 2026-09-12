import {
  saveGameState,
  type SaveFailureReason,
} from "../save/storage";
import { useGameStore } from "../state/store";
import { applyOfflineProduction } from "./offlineCatchUp";

export const AUTO_SAVE_INTERVAL_MS = 5000;

/**
 * Main Save の書き込み権を持つタブを示す lease。
 *
 * Main Save は単一のキーなので、複数タブが同時に書くと
 * 互いの進行を上書きし合う。
 * 「今アクティブなタブだけが書く」ようにするための仕組み。
 */
const WRITER_LEASE_KEY =
  "sushi-loopy.writer" as const;

/**
 * lease がこの時間より古ければ、
 * 書いていたタブは既に閉じたとみなして引き継ぐ。
 */
const WRITER_LEASE_TTL_MS = 15_000;

const writerId = `${Date.now().toString(36)}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

/**
 * Save の健全性が変化したことを UI へ伝えるイベント。
 *
 * Save 失敗を握りつぶすと、プレイヤーは
 * 「保存されていない」ことに気付けないため、
 * 状態が変わったときだけ通知する。
 */
export const SAVE_STATUS_EVENT =
  "sushi-loopy:save-status" as const;

export type SaveStatusReason =
  | SaveFailureReason
  | "blocked-by-other-tab"
  | "exception";

export type SaveStatusDetail = {
  healthy: boolean;
  reason: SaveStatusReason | null;
  consecutiveFailures: number;
};

let consecutiveFailures = 0;
let lastStatusSignature = "";

function publishStatus(
  reason: SaveStatusReason | null,
): void {
  const healthy = reason === null;

  if (healthy) {
    consecutiveFailures = 0;
  } else {
    consecutiveFailures += 1;
  }

  const signature = `${healthy}:${reason ?? ""}`;

  // 5秒ごとに同じイベントを撒かない。
  if (signature === lastStatusSignature) {
    return;
  }

  lastStatusSignature = signature;

  const detail: SaveStatusDetail = {
    healthy,
    reason,
    consecutiveFailures,
  };

  window.dispatchEvent(
    new CustomEvent<SaveStatusDetail>(
      SAVE_STATUS_EVENT,
      { detail },
    ),
  );
}

type WriterLease = {
  id: string;
  atMs: number;
};

function readWriterLease(): WriterLease | null {
  try {
    const raw = localStorage.getItem(
      WRITER_LEASE_KEY,
    );

    if (raw === null) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null
    ) {
      return null;
    }

    const { id, atMs } =
      parsed as Partial<WriterLease>;

    if (
      typeof id !== "string" ||
      typeof atMs !== "number" ||
      !Number.isFinite(atMs)
    ) {
      return null;
    }

    return { id, atMs };
  } catch {
    return null;
  }
}

function claimWriterLease(): void {
  try {
    localStorage.setItem(
      WRITER_LEASE_KEY,
      JSON.stringify({
        id: writerId,
        atMs: Date.now(),
      }),
    );
  } catch {
    // lease を取れなくても保存自体は試みる。
  }
}

/**
 * このタブが Main Save を書いてよいか。
 *
 * 他タブが保持していて、かつその lease がまだ新しい場合だけ false。
 */
function canWriteMainSave(): boolean {
  const lease = readWriterLease();

  if (lease === null) {
    return true;
  }

  if (lease.id === writerId) {
    return true;
  }

  return (
    Date.now() - lease.atMs >
    WRITER_LEASE_TTL_MS
  );
}

function flushMainSave(): void {
  if (!canWriteMainSave()) {
    publishStatus("blocked-by-other-tab");
    return;
  }

  claimWriterLease();

  try {
    const result = saveGameState(
      useGameStore.getState(),
    );

    publishStatus(
      result.success ? null : result.reason,
    );
  } catch {
    // Save failure must never stop game progression.
    publishStatus("exception");
  }
}

let intervalId: number | null = null;

/**
 * hidden に入った時刻。
 *
 * hidden 中は scheduler が生産を止めるため、
 * この区間は Offline として復帰時にまとめて清算する。
 */
let hiddenAtMs: number | null = null;

/**
 * まだ清算していない hidden 区間があるときは保存しない。
 *
 * hidden 中は scheduler も Auto Save も止まっており、
 * GameState は hidden 突入時の flush から変化しない。
 * ここで再保存すると savedAtMs だけが現在時刻へ進み、
 * その hidden 区間が Offline 窓から消えてしまう。
 */
function flushUnlessHiddenSpanPending(): void {
  if (hiddenAtMs !== null) {
    return;
  }

  flushMainSave();
}

function startInterval(): void {
  if (intervalId !== null) {
    return;
  }

  intervalId = window.setInterval(() => {
    flushMainSave();
  }, AUTO_SAVE_INTERVAL_MS);
}

function stopInterval(): void {
  if (intervalId === null) {
    return;
  }

  window.clearInterval(intervalId);
  intervalId = null;
}

export function startAutoSave(): () => void {
  claimWriterLease();
  // Story milestones share the existing writer lease and failure reporting.
  const unsubscribeEnding = useGameStore.subscribe((state, previous) => {
    if (state.endingPhase !== previous.endingPhase) flushUnlessHiddenSpanPending();
  });

  const handleVisibilityChange = (): void => {
    if (
      document.visibilityState === "hidden"
    ) {
      /*
       * hidden に入る瞬間を記録し、その状態で1回保存する。
       *
       * その後 interval を止めることで savedAtMs が
       * hidden 中に更新され続けるのを防ぐ。
       * これをしないと、hidden 中の時間が
       * 「生産もされず Offline にも積まれない」空白になる。
       */
      hiddenAtMs = Date.now();

      flushMainSave();
      stopInterval();

      return;
    }

    /*
     * visible 復帰。
     *
     * このタブが操作対象になったので書き込み権を取り直し、
     * hidden 中の経過を Offline として清算してから
     * Auto Save を再開する。
     */
    claimWriterLease();

    if (hiddenAtMs !== null) {
      applyOfflineProduction(
        hiddenAtMs,
        Date.now(),
      );

      hiddenAtMs = null;
    }

    startInterval();
    flushMainSave();
  };

  const handlePageHide = (): void => {
    flushUnlessHiddenSpanPending();
  };

  /*
   * 既に hidden の状態で起動することがある
   * （バックグラウンドタブで開かれた場合など）。
   *
   * その場合は interval を回さず、
   * hidden の起点だけを記録しておく。
   */
  if (document.visibilityState === "hidden") {
    hiddenAtMs = Date.now();
  } else {
    startInterval();
  }

  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange,
  );

  window.addEventListener(
    "pagehide",
    handlePageHide,
  );

  return () => {
    /*
     * HMR cleanup itself may happen before pagehide.
     * Flush once before removing listeners so the latest state is not lost.
     */
    flushUnlessHiddenSpanPending();

    stopInterval();
    unsubscribeEnding();

    document.removeEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.removeEventListener(
      "pagehide",
      handlePageHide,
    );
  };
}
