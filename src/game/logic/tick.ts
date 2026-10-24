import { useGameStore } from '../state/store'

/**
 * ゲームを deltaSeconds 秒ぶん進行させる。
 *
 * scheduler が「いつ呼ぶか」を担当し、
 * tick は「その時間ぶん何を進めるか」を担当する。
 */
export function runGameTick(deltaSeconds: number): void {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return
  }

  const state = useGameStore.getState()

  // 実際に経過した秒数ぶんSUSHIを生産する
  state.applyProduction(deltaSeconds)

  // Snapshot/GLB work can stall the UI. Do not fast-forward unseen ending cues after that stall.
  state.addRunPlayTime(state.endingPhase === 'collapse' ? Math.min(deltaSeconds * 1000, 250) : deltaSeconds * 1000)
}
