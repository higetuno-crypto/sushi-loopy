import type { FacilityId } from '../types';

/** Presentation can be replaced without changing economic or save IDs. */
export const FACILITY_ART: Record<FacilityId, { icon: string; note: string }> = {
  craftsman: { icon: '👨‍🍳', note: '一貫ずつ、心をこめて。' },
  conveyor_sushi: { icon: '🍥', note: 'おいしいは、まわる。' },
  auto_sushi_machine: { icon: '⚙', note: '休まない、小さな手。' },
  marine_food_plant: { icon: '🌊', note: '海ごと、いただきます。' },
  sushi_ocean_mining: { icon: '⚓', note: '深海の、さらに下へ。' },
  fusion_sushi_converter: { icon: '🍣', note: '寿司と寿司で、街にあかりを。' },
  luna_sea: { icon: '☾', note: '月にも、海があった。' },
  freshness_freezer: { icon: '❄', note: '時間より、鮮度。' },
  global_freshness_sync: { icon: '◎', note: 'いただきますを、同期する。' },
};

export const ASSETS = {
  sushi: `${import.meta.env.BASE_URL}assets/salmon-hero-v1.webp`,
  sushiSmall: `${import.meta.env.BASE_URL}assets/salmon-hero-v1-small.webp`,
};
export const TOWN_STORIES = [
  '職人が店にやってきます', 'レーンと、お客さんのいる店に', 'アームが動き、握りたてが店へ',
  '港から寿司屋へ、トラックの初便', '沖合で採掘。船が食材を運びます', '寿司のエネルギーで街に灯りを',
  '月への定期便が飛び立ちます', '冷たい泡の、小さな氷の庭に', '街のすべてを、ひとつの鮮度に',
];
