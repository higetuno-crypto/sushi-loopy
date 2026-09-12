export type FacilityId =
  | "craftsman"
  | "conveyor_sushi"
  | "auto_sushi_machine"
  | "marine_food_plant"
  | "sushi_ocean_mining"
  | "fusion_sushi_converter"
  | "luna_sea"
  | "freshness_freezer"
  | "global_freshness_sync";

export interface FacilityDefinition {
  id: FacilityId;
  displayName: string;
  /**
   * 1台目を購入するときの基礎価格。
   * 実際の購入価格は所持数と growthRate から計算する。
   */
  basePrice: number;
  /**
   * 1施設あたりの基礎SUSHI生産量 / 秒。
   */
  baseProduction: number;
  /**
   * 購入するたびに価格が何倍になるか。
   * 例: 1.15 = 15%ずつ上昇。
   */
  growthRate: number;
}

export type EndingPhase = 'playing' | 'collapse' | 'cleared';

export interface GameState {
  syncCount: number;
  syncElapsedMs: number;
  endingPhase: EndingPhase;
  collapseElapsedMs: number;
  /**
   * 現在所持しているSUSHI。
   */
  sushi: number;
  /**
   * 各施設の現在所持数。
   *
   * SPSや現在価格などの派生値は保存しない。
   */
  facilityCounts: Record<FacilityId, number>;
  /**
   * 現在のRUNで実際にプレイした累計時間。
   * 単位: ミリ秒
   */
  runPlayTimeMs: number;
  totalClicks: number;
  /** v1 migration starts at current balance; historical spending is unknowable. */
  totalSushiEarned: number;
  unlockedAchievementIds: string[];
  purchasedUpgradeIds: string[];
  seenNewsIds: string[];
}

export interface MetaState {
  /**
   * LOOPした回数。
   * 初回プレイは0。
   */
  loopCount: number;
  /**
   * 偽EDを一度でも見たか。
   */
  firstEndingSeen: boolean;
  /**
   * 特異点へ到達したことがあるか。
   */
  singularityReached: boolean;
  /**
   * 現在進行中のRUNを識別するID。
   */
  currentRunId: string;
}
