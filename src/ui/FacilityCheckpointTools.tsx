import {
  useState,
} from "react";

import {
  FACILITIES,
} from "../game/data/facilities";
import type {
  FacilityId,
} from "../game/types";
import {
  useGameStore,
} from "../game/state/store";
import {
  listFacilityCheckpoints,
  restoreFacilityCheckpoint,
} from "../game/save/facilityCheckpoints";

function getFacilityName(
  facilityId: FacilityId,
): string {
  const facility =
    FACILITIES.find(
      (item) =>
        item.id === facilityId,
    );

  return (
    facility?.displayName ??
    facilityId
  );
}

function formatCreatedAt(
  createdAtMs: number,
): string {
  return new Date(
    createdAtMs,
  ).toLocaleString();
}

export function
FacilityCheckpointTools() {
  /**
   * facilityCounts が変わった時だけ再描画。
   *
   * これは Checkpoint 作成トリガーではない。
   * UI を更新するためだけの購読。
   */
  useGameStore(
      (state) =>
        state.facilityCounts,
    );

  const [message, setMessage] =
    useState("");

  const checkpoints = listFacilityCheckpoints();

  const handleRestore = (
    facilityId: FacilityId,
  ): void => {
    const facilityName =
      getFacilityName(
        facilityId,
      );

    const confirmed =
      window.confirm(
        `${facilityName} の初回購入直後へ戻しますか？\n\n現在の進行状態と Main Save は復元後の状態で上書きされます。`,
      );

    if (!confirmed) {
      return;
    }

    const result =
      restoreFacilityCheckpoint(
        facilityId,
      );

    if (!result.success) {
      setMessage(
        `Restore failed: ${result.error}`,
      );

      return;
    }

    setMessage(
      result.mainSavePersisted
        ? `${facilityName} の Checkpoint を復元しました。`
        : `${facilityName} を復元しましたが、この端末へ保存できませんでした。再読み込みすると復元前へ戻ります。`,
    );
  };

  return (
    <details>
      <summary>
        施設の初回購入へ戻る
        {" "}
        ({checkpoints.length}/9)
      </summary>

      {checkpoints.length ===
      0 ? (
        <p>
          まだ Checkpoint は
          ありません。
          施設を初めて購入すると
          自動で保存されます。
        </p>
      ) : (
        <ul>
          {checkpoints.map(
            (checkpoint) => (
              <li
                key={
                  checkpoint.facilityId
                }
              >
                <div>
                  <strong>
                    {getFacilityName(
                      checkpoint.facilityId,
                    )}
                  </strong>
                </div>

                <div>
                  {formatCreatedAt(
                    checkpoint.createdAtMs,
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleRestore(
                      checkpoint.facilityId,
                    )
                  }
                >
                  Restore
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      {message !== "" && (
        <p>{message}</p>
      )}
    </details>
  );
}
