import type { UpgradeDefinition } from '../contentTypes';

export const UPGRADES: readonly UpgradeDefinition[] = [
  { id: 'warm_hands', displayName: '手のひらの記憶', description: '一握りのSUSHIが2倍。ちょうどいい力加減を覚えた。', icon: '✋', cost: 50,
    condition: { kind: 'stat', stat: 'totalClicks', atLeast: 25 }, effects: [{ kind: 'clickBonus', amount: 1 }] },
  { id: 'craftsman_knife', displayName: 'よく切れる包丁', description: '職人さんの生産が2倍。切れ味は、やさしさ。', icon: '🔪', cost: 150,
    condition: { kind: 'facility', id: 'craftsman', count: 3 }, effects: [{ kind: 'facilityBonus', id: 'craftsman', amount: 1 }] },
  { id: 'quiet_belt', displayName: 'なめらかな回転', description: '回転寿司の生産が2倍。お皿も音楽に乗って。', icon: '🍥', cost: 750,
    condition: { kind: 'facility', id: 'conveyor_sushi', count: 2 }, effects: [{ kind: 'facilityBonus', id: 'conveyor_sushi', amount: 1 }] },
  { id: 'house_recipe', displayName: 'ひみつの合わせ酢', description: 'すべての施設の生産 +10%。だれかに教えたくなる味。', icon: '✦', cost: 2500,
    condition: { kind: 'achievement', id: 'click_100' }, effects: [{ kind: 'productionBonus', amount: 0.1 }] },
  { id: 'machine_rhythm', displayName: '三拍子の握り', description: '自動握り器の生産が2倍。機械が、鼻歌をうたいはじめた。', icon: '♫', cost: 8000,
    condition: { kind: 'facility', id: 'auto_sushi_machine', count: 2 }, effects: [{ kind: 'facilityBonus', id: 'auto_sushi_machine', amount: 1 }] },
];

export const UPGRADE_BY_ID = new Map(UPGRADES.map(item => [item.id, item]));
