import { useGameStore } from '../game/state/store';

export function DebugTools() {
  const enabled = useGameStore(state => state.debugFastClick);
  const setEnabled = useGameStore(state => state.setDebugFastClick);
  return <div className="debug-tools">
    <small>検証用：進行は自動保存されます。使用前にSave Codeでバックアップを。</small>
    <button type="button" aria-pressed={enabled} onClick={() => setEnabled(!enabled)}>
      {enabled ? 'DEBUG ON · 1クリック +10,000' : 'デバッグ · 1クリック +10,000にする'}
    </button>
    {enabled && <p role="status">通常プレイではありません。もう一度押すと解除。再読み込みでもOFFになります。増やしたSUSHI・実績・購入内容は自動保存されます。試す前にページ下部でSave Codeを控えてください。</p>}
  </div>;
}
