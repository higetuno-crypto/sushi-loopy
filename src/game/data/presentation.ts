import type { FacilityId } from '../types';

/** Presentation can be replaced without changing economic or save IDs. */
export const FACILITY_ART: Record<FacilityId, { icon: string; note: string }> = {
  craftsman: { icon: '👨‍🍳', note: '一貫ずつ、心をこめて。' },
  conveyor_sushi: { icon: '🍥', note: 'おいしいは、まわる。' },
  auto_sushi_machine: { icon: '⚙', note: '休まない、小さな手。' },
  marine_food_plant: { icon: '🌊', note: '海ごと、いただきます。' },
  sushi_ocean_mining: { icon: '⚓', note: '深海の、さらに下へ。' },
  fusion_sushi_converter: { icon: '☀', note: '太陽ひとつぶんの熱。' },
  luna_sea: { icon: '☾', note: '月にも、海があった。' },
  freshness_freezer: { icon: '❄', note: '時間より、鮮度。' },
  global_freshness_sync: { icon: '◎', note: 'いただきますを、同期する。' },
};

export const ASSETS = {
  sushi: `${import.meta.env.BASE_URL}assets/salmon-hero-v1.webp`,
  sushiSmall: `${import.meta.env.BASE_URL}assets/salmon-hero-v1-small.webp`,
};
