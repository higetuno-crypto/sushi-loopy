import { ACHIEVEMENTS } from '../data/achievements';
import { NEWS } from '../data/news';
import type { GameState } from '../types';
import { indexConditions, meetsCondition } from './conditions';

const achievementIndex = indexConditions(ACHIEVEMENTS);

/** Pure, idempotent. A dependency queue also resolves chained achievements. */
export function resolveAchievements(state: GameState, events?: readonly string[]): GameState {
  let next = state;
  const owned = new Set(state.unlockedAchievementIds);
  const candidates = new Set(events ? events.flatMap(key => achievementIndex.get(key) ?? []) : ACHIEVEMENTS);
  for (const item of candidates) {
    if (owned.has(item.id) || !meetsCondition(next, item.condition)) continue;
    owned.add(item.id);
    next = { ...next, unlockedAchievementIds: [...owned] };
    for (const dependent of achievementIndex.get('achievement') ?? []) {
      if (!owned.has(dependent.id)) candidates.add(dependent);
    }
  }
  // A dependent may have been visited before its prerequisite. Bounded by newly unlocked IDs.
  return next === state ? state : resolveAchievements(next, ['achievement']);
}

/** Called by the news clock, never by the production frame. */
export function chooseNews(state: GameState, previousId: string | null = null, turn = 0) {
  const eligible = NEWS.filter(item => meetsCondition(state, item.condition));
  const seen = new Set(state.seenNewsIds);
  const unread = eligible.filter(item => !seen.has(item.id)).sort((a, b) => b.priority - a.priority);
  if (unread.length) return unread[0];
  const repeats = eligible.filter(item => item.id !== previousId);
  return repeats.length ? repeats[turn % repeats.length] : eligible[0];
}
