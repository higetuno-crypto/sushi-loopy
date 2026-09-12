import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../game/state/store';
import { pendingSynchronization } from '../game/logic/loop';

/** A routine equipment dialog. No countdown or story/ending language. */
export function Synchronization() {
  const pending = useGameStore(pendingSynchronization);
  const synced = useGameStore(state => state.syncCount);
  const synchronize = useGameStore(state => state.synchronize);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const open = pending && dismissed !== synced;
  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);
  if (!pending) return null;
  return <div className="synchronization-control">
    <button className="sync-resume" onClick={() => setDismissed(null)}>鮮度同期を設定</button>
    <dialog ref={dialog} className="sync-dialog" aria-labelledby="sync-title" onCancel={() => setDismissed(synced)}>
      <span className="sync-device-label">世界鮮度同期装置 / 接続設定</span>
      <h2 id="sync-title">鮮度同期を実施しますか？</h2>
      <p>新しい装置を、お店の設備に接続します。</p>
      <dl><dt>接続後の生産補正</dt><dd>+{(synced + 1) * 25}%</dd></dl>
      <div className="sync-dialog-actions"><button autoFocus onClick={() => setDismissed(synced)}>あとで</button><button onClick={synchronize}>同期する</button></div>
    </dialog>
  </div>;
}
