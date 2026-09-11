import type { FacilityDefinition } from "../types";

export const FACILITIES = [
  {
    id: "craftsman",
    displayName: "職人さん",
    basePrice: 10,
    baseProduction: 1,
    growthRate: 1.15,
  },
  {
    id: "conveyor_sushi",
    displayName: "回転寿司オープン",
    basePrice: 100,
    baseProduction: 8,
    growthRate: 1.15,
  },
  {
    id: "auto_sushi_machine",
    displayName: "寿司自動握り器",
    basePrice: 1_000,
    baseProduction: 60,
    growthRate: 1.15,
  },
  {
    id: "marine_food_plant",
    displayName: "海洋食材プラント",
    basePrice: 10_000,
    baseProduction: 450,
    growthRate: 1.15,
  },
  {
    id: "sushi_ocean_mining",
    displayName: "SUSHI海洋採掘",
    basePrice: 100_000,
    baseProduction: 3_500,
    growthRate: 1.15,
  },
  {
    id: "fusion_sushi_converter",
    displayName: "寿司融合発電",
    basePrice: 1_000_000,
    baseProduction: 30_000,
    growthRate: 1.15,
  },
  {
    id: "luna_sea",
    displayName: "LUNA_SEA",
    basePrice: 10_000_000,
    baseProduction: 250_000,
    growthRate: 1.15,
  },
  {
    id: "freshness_freezer",
    displayName: "鮮度凍結装置",
    basePrice: 100_000_000,
    baseProduction: 2_000_000,
    growthRate: 1.15,
  },
  {
    id: "global_freshness_sync",
    displayName: "世界鮮度同期装置",
    basePrice: 1_000_000_000,
    baseProduction: 20_000_000,
    growthRate: 1.15,
  },
] as const satisfies readonly FacilityDefinition[];
