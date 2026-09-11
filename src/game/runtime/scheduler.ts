import { runGameTick } from '../logic/tick'

const SCHEDULER_INTERVAL_MS = 250

let intervalId: number | null = null
let lastTimestampMs: number | null = null

/**
 * 現在時刻を基準時刻として記録する。
 *
 * hidden → visible に戻ったときにも使用する。
 */
function resetTimestamp(): void {
  lastTimestampMs = performance.now()
}

/**
 * scheduler の1回分の更新処理。
 */
function update(): void {
  // STEP 1ではバックグラウンド中のゲーム進行を停止する
  if (document.hidden) {
    lastTimestampMs = null
    return
  }

  const now = performance.now()

  // hiddenから復帰した直後など、
  // 比較対象となる前回時刻が存在しない場合は
  // 今回はゲームを進めず、現在時刻だけ記録する
  if (lastTimestampMs === null) {
    lastTimestampMs = now
    return
  }

  const deltaMilliseconds = now - lastTimestampMs
  lastTimestampMs = now

  const deltaSeconds = deltaMilliseconds / 1000

  runGameTick(deltaSeconds)
}

/**
 * タブの表示状態が変化したときの処理。
 */
function handleVisibilityChange(): void {
  if (document.hidden) {
    // hidden中の時間を後でまとめて処理しないように破棄する
    lastTimestampMs = null
    return
  }

  // visibleに戻った瞬間を新しい基準時刻にする
  resetTimestamp()
}

/**
 * ゲームschedulerを開始する。
 *
 * すでに起動済みの場合は二重起動しない。
 *
 * @returns schedulerを停止するcleanup関数
 */
export function startGameScheduler(): () => void {
  if (intervalId !== null) {
    return () => {}
  }

  resetTimestamp()

  document.addEventListener(
    'visibilitychange',
    handleVisibilityChange,
  )

  intervalId = window.setInterval(
    update,
    SCHEDULER_INTERVAL_MS,
  )

  return stopGameScheduler
}

/**
 * ゲームschedulerを停止する。
 */
export function stopGameScheduler(): void {
  if (intervalId !== null) {
    window.clearInterval(intervalId)
    intervalId = null
  }

  document.removeEventListener(
    'visibilitychange',
    handleVisibilityChange,
  )

  lastTimestampMs = null
}