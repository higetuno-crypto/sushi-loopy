import { FACILITIES } from "../data/facilities";
import type {
  FacilityId,
  GameState,
  MetaState,
} from "../types";

function createInitialFacilityCounts(): Record<FacilityId, number> {
  return Object.fromEntries(
    FACILITIES.map((facility) => [facility.id, 0]),
  ) as Record<FacilityId, number>;
}

export function createInitialGameState(): GameState {
  return {
    syncCount: 0,
    syncElapsedMs: 0,
    endingPhase: 'playing',
    collapseElapsedMs: 0,
    sushi: 0,
    facilityCounts: createInitialFacilityCounts(),
    runPlayTimeMs: 0,
    totalClicks: 0,
    totalSushiEarned: 0,
    unlockedAchievementIds: [],
    purchasedUpgradeIds: [],
    seenNewsIds: [],
  };
}

export function createInitialMetaState(): MetaState {
  return {
    loopCount: 0,
    firstEndingSeen: false,
    singularityReached: false,
    currentRunId: "run-0",
  };
}
