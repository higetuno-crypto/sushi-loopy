import type { GameState } from '../types';

export const COLLAPSE_DURATION_MS = 28_000;
export const COLLAPSE_SCENES = [
  { fromMs: 0, label: '01 / 同期', title: 'いただきますが、重なった。',
    text: '隣の席も、海の向こうも。同じ声、同じ箸の角度。皿だけが、いつもどおり回っている。',
    report: '全食卓の同期を確認。次の一口を待機しています。', status: '食卓、同期中' },
  { fromMs: 10_000, label: '02 / 崩壊', title: '海が、皿のふちからこぼれる。',
    text: '月の海が傾く。工場も、街も、回転レーンに乗って流れてくる。止めるボタンは、もう皿の裏だ。',
    report: '海面の位置を取得できません。月との接続が失われました。', status: '世界座標、喪失' },
  { fromMs: 20_000, label: '03 / 静止', title: '鮮度だけが、残った。',
    text: '湯気が止まった。時計も止まった。傷まない世界では、誰も次の一口を食べられない。',
    report: '全設備停止。応答しているのは、カウンターの手元だけ。', status: '応答、1件' },
  { fromMs: COLLAPSE_DURATION_MS, label: '04 / 最後の一貫', title: 'まだ、手は動く。',
    text: '目の前に、空の皿がある。はじめてのお客さんを迎えた、あの日と同じように。もう一度だけ、握ろう。',
    report: '自動生産は停止しています。最後の一貫を、あなたの手で。', status: '手動操作を待機' },
] as const;
export function collapseSceneIndex(elapsedMs: number): number {
  return COLLAPSE_SCENES.reduce((index, scene, i) => elapsedMs >= scene.fromMs ? i : index, 0);
}
export function canStartCollapse(state: GameState): boolean {
  return state.endingPhase === 'playing' && state.facilityCounts.global_freshness_sync > 0;
}
export function canFinishFirstRun(state: GameState): boolean {
  return state.endingPhase === 'collapse' && state.collapseElapsedMs >= COLLAPSE_DURATION_MS;
}
