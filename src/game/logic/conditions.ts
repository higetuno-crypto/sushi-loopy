import type { Condition } from '../contentTypes';
import type { GameState } from '../types';

export function meetsCondition(state: GameState, condition: Condition): boolean {
  switch (condition.kind) {
    case 'always': return true;
    case 'facility': return state.facilityCounts[condition.id] >= condition.count;
    case 'stat': return state[condition.stat] >= condition.atLeast;
    case 'achievement': return state.unlockedAchievementIds.includes(condition.id);
    case 'upgrade': return state.purchasedUpgradeIds.includes(condition.id);
    case 'all': return condition.conditions.every(item => meetsCondition(state, item));
    case 'any': return condition.conditions.some(item => meetsCondition(state, item));
  }
}

export function conditionDependencies(condition: Condition): string[] {
  switch (condition.kind) {
    case 'always': return ['always'];
    case 'facility': return [`facility:${condition.id}`];
    case 'stat': return [condition.stat];
    case 'achievement': return ['achievement'];
    case 'upgrade': return ['upgrade'];
    case 'all': case 'any': return [...new Set(condition.conditions.flatMap(conditionDependencies))];
  }
}

export function indexConditions<T extends { condition: Condition }>(items: readonly T[]): Map<string, T[]> {
  const index = new Map<string, T[]>();
  for (const item of items) {
    for (const key of conditionDependencies(item.condition)) {
      index.set(key, [...(index.get(key) ?? []), item]);
    }
  }
  return index;
}
