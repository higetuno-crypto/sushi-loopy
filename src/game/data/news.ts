import type { NewsDefinition } from '../contentTypes';

export const NEWS: readonly NewsDefinition[] = [
  { id: 'opening', text: '小さなお寿司屋さんが開店。まずは、ひとつ握ってみましょう。', condition: { kind: 'always' }, priority: 0, category: 'おしながき' },
  { id: 'tea', text: '本日のおすすめ：お寿司。明日のおすすめも、おそらくお寿司。', condition: { kind: 'always' }, priority: 0, category: 'おしながき' },
  { id: 'first_hands', text: '町の職人が仲間入り。「留守のあいだも、握っておきますね」', condition: { kind: 'facility', id: 'craftsman', count: 1 }, priority: 10, category: '街のうわさ' },
  { id: 'hundred', text: '百握り達成。常連さんが、いつもの席で小さく拍手。', condition: { kind: 'achievement', id: 'click_100' }, priority: 12, category: '街のうわさ' },
  { id: 'belt', text: 'お皿がまわりはじめた。まだ、ちゃんと一周して帰ってくる。', condition: { kind: 'facility', id: 'conveyor_sushi', count: 1 }, priority: 20, category: '産業だより' },
  { id: 'knife', text: 'よく切れる包丁を導入。職人さんの口数が少し増えた。', condition: { kind: 'upgrade', id: 'craftsman_knife' }, priority: 15, category: '街のうわさ' },
  { id: 'machine', text: '自動握り器が稼働。「おいしい」の定義を、学習しています。', condition: { kind: 'facility', id: 'auto_sushi_machine', count: 1 }, priority: 30, category: '産業だより' },
  { id: 'plant', text: '海洋食材プラント、豊漁を宣言。海の同意は確認中です。', condition: { kind: 'facility', id: 'marine_food_plant', count: 1 }, priority: 40, category: '産業だより' },
  { id: 'mining', text: '海底から古いお品書きを発見。まだ建てていない施設の名前がある。', condition: { kind: 'facility', id: 'sushi_ocean_mining', count: 1 }, priority: 50, category: '観測記録' },
  { id: 'fusion', text: '寿司融合発電、点灯。となりの店の看板まで光った。', condition: { kind: 'facility', id: 'fusion_sushi_converter', count: 1 }, priority: 60, category: '観測記録' },
  { id: 'moon', text: '月面に海を確認。地球から持ち出した記録はありません。', condition: { kind: 'facility', id: 'luna_sea', count: 1 }, priority: 70, category: '観測記録' },
  { id: 'freezer', text: '鮮度凍結に成功。賞味期限より先に、時計が止まりました。', condition: { kind: 'facility', id: 'freshness_freezer', count: 1 }, priority: 80, category: '観測記録' },
  { id: 'sync', text: '世界鮮度同期、完了。すべての食卓から、同じ「いただきます」。', condition: { kind: 'facility', id: 'global_freshness_sync', count: 1 }, priority: 90, category: '観測記録' },
  { id: 'five_minutes', text: '湯のみを替えておきました。お茶が冷めるくらい、夢中ですね。', condition: { kind: 'stat', stat: 'runPlayTimeMs', atLeast: 300000 }, priority: 5, category: '街のうわさ' },
  { id: 'thousand', text: '累計1,000 SUSHI。店先ののれんが、すこし誇らしげです。', condition: { kind: 'stat', stat: 'totalSushiEarned', atLeast: 1000 }, priority: 8, category: '街のうわさ' },
];
