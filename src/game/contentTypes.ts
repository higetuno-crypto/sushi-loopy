import type { FacilityId } from './types';

export type Condition =
  | { kind: 'always' }
  | { kind: 'facility'; id: FacilityId; count: number }
  | { kind: 'stat'; stat: 'totalClicks' | 'totalSushiEarned' | 'runPlayTimeMs' | 'sushi'; atLeast: number }
  | { kind: 'achievement' | 'upgrade'; id: string }
  | { kind: 'all' | 'any'; conditions: readonly Condition[] };

/** Additive bonuses within a target; global and facility multipliers multiply. */
export type Effect =
  | { kind: 'productionBonus' | 'clickBonus'; amount: number }
  | { kind: 'facilityBonus'; id: FacilityId; amount: number };

export interface AchievementDefinition {
  id: string;
  displayName: string;
  description: string;
  icon: string;
  condition: Condition;
  effects: readonly Effect[];
}

export interface UpgradeDefinition {
  id: string;
  displayName: string;
  description: string;
  icon: string;
  condition: Condition;
  cost: number;
  effects: readonly Effect[];
}

export interface NewsDefinition {
  id: string;
  text: string;
  condition: Condition;
  priority: number;
  category: 'おしながき' | '街のうわさ' | '産業だより' | '観測記録';
}
