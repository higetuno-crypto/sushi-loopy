import type { AchievementDefinition } from '../contentTypes';
import { FACILITIES } from './facilities';

const TITLES = ['いらっしゃいませ', 'まわりはじめた世界', '手のひらを超えて', '海をひと皿に', '海底のおしながき', '太陽の握り方', '月はネタだった', 'きのうより新鮮', '世界は、食べごろ'];
const BONUSES = [0.002, 0.005, 0.005, 0.01, 0.01, 0.02, 0.02, 0.05, 0.05];
const ICONS = ['👨‍🍳', '🍥', '⚙', '🌊', '⚓', '☀', '☾', '❄', '◎'];

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  ...FACILITIES.map((facility, index): AchievementDefinition => ({
    id: `first_${facility.id}`,
    displayName: TITLES[index],
    description: `${facility.displayName}を初めて購入する`,
    icon: ICONS[index],
    condition: { kind: 'facility', id: facility.id, count: 1 },
    effects: [{ kind: 'productionBonus', amount: BONUSES[index] }],
  })),
  {
    id: 'click_100', displayName: '百握りの道も、一握りから',
    description: '寿司を100回握る', icon: '🍣',
    condition: { kind: 'stat', stat: 'totalClicks', atLeast: 100 },
    effects: [{ kind: 'productionBonus', amount: 0.01 }],
  },
];

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map(item => [item.id, item]));
