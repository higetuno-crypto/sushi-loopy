import {
  useEffect,
  useState,
} from "react";

import {
  exportSaveCode,
  importSaveCode,
  type ImportSaveCodeResult,
} from "../game/save/saveCode";
import {
  SAVE_STATUS_EVENT,
  type SaveStatusDetail,
} from "../game/runtime/autoSave";

function getImportMessage(
  result: ImportSaveCodeResult,
): string {
  if (result.ok) {
    if (!result.mainSavePersisted) {
      return "Imported, but this browser could not store the save. Reloading will bring back the previous save.";
    }

    return "Save Code imported successfully.";
  }

  switch (result.reason) {
    case "empty":
      return "Save Code is empty.";

    case "invalid-prefix":
      return "This is not a Sushi Loopy Save Code.";

    case "decode-failed":
      return "Save Code could not be decoded.";

    case "parse-failed":
      return "Save Code contains invalid data.";

    case "invalid-save":
      return "Save Code is invalid or unsupported by this build.";
  }
}

function describeSaveStatus(
  detail: SaveStatusDetail,
): string {
  if (detail.reason === 'protected-existing-save') {
    return '既存のセーブを安全に読み取れないため、元データを保護して自動保存を停止しています。進行を続ける場合は現在のSave Codeを書き出してください。元のセーブは削除せず保管されています。';
  }
  if (detail.reason === "blocked-by-other-tab") {
    return "別のタブで Sushi Loopy が開かれているため、このタブでは保存していません。使いたいタブを1つだけ残して再読み込みしてください。";
  }

  if (
    detail.reason === "storage-unavailable" ||
    detail.reason === "write-failed" ||
    detail.reason === "exception"
  ) {
    return `保存に失敗しています（${detail.consecutiveFailures} 回連続）。ブラウザの保存容量やプライベートモードを確認してください。このままでは進行が失われます。`;
  }

  return `保存に失敗しています（${detail.reason}）。進行が保存されていません。`;
}

export function SaveTools() {
  const [saveCode, setSaveCode] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [saveWarning, setSaveWarning] =
    useState("");

  /**
   * Save 失敗を握りつぶさず表示する。
   *
   * 保存できていないことに気付けないまま
   * プレイし続けるのが最悪のケースなので、
   * details を開いていなくても見える位置に出す。
   */
  useEffect(() => {
    const handleSaveStatus = (
      event: Event,
    ): void => {
      const { detail } =
        event as CustomEvent<SaveStatusDetail>;

      setSaveWarning(
        detail.healthy
          ? ""
          : describeSaveStatus(detail),
      );
    };

    window.addEventListener(
      SAVE_STATUS_EVENT,
      handleSaveStatus,
    );

    return () => {
      window.removeEventListener(
        SAVE_STATUS_EVENT,
        handleSaveStatus,
      );
    };
  }, []);

  const handleExport = () => {
    try {
      const code = exportSaveCode();

      setSaveCode(code);
      setMessage(
        "Current save exported. Copy the Save Code and keep it somewhere safe.",
      );
    } catch {
      setMessage(
        "Save Code export failed.",
      );
    }
  };

  const handleImport = () => {
    if (!window.confirm('Save Codeの状態へ戻します。現在の進行は置き換わります。続けますか？')) return;
    const result =
      importSaveCode(saveCode);

    setMessage(
      getImportMessage(result),
    );
  };

  return (
    <>
      {saveWarning.length > 0 && (
        <p
          className="save-warning"
          role="alert"
        >
          ⚠ {saveWarning}
        </p>
      )}

      <details className="save-tools">
        <summary>セーブとバックアップ</summary>

        <p>
          5秒ごとに自動保存します。Save Codeは手動バックアップです。
          復元すると、現在の進行がコードの状態に置き換わります。
        </p>

        <textarea
          aria-label="Save Code"
          value={saveCode}
          onChange={(event) => {
            setSaveCode(event.target.value);
            setMessage("");
          }}
          rows={6}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />

        <div>
          <button
            type="button"
            onClick={handleExport}
          >
            Save Codeを書き出す
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={saveCode.trim().length === 0}
          >
            Save Codeから復元
          </button>
        </div>

        {message.length > 0 && (
          <p role="status">
            {message}
          </p>
        )}
      </details>
    </>
  );
}
