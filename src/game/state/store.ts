// Actions commit progress atomically, before checkpoint tracking snapshots it.
import { pendingSynchronization, canBuySyncDevice, canFinishFirstRun, COLLAPSE_DURATION_MS, SYNC_SETTLE_MS } from '../logic/loop';
import { create } from 'zustand';

import type { FacilityId, GameState } from '../types';
import { FACILITIES } from '../data/facilities';
import { calculateCurrentPrice } from '../logic/economy';
import { UPGRADE_BY_ID } from '../data/upgrades';
import { meetsCondition } from '../logic/conditions';
import { resolveAchievements } from '../logic/progression';
import { createInitialGameState } from './initialState';
import { selectSushiPerClick, selectTotalSushiPerSecond } from './selectors';

type GameActions = {
  synchronize: () => void;
  replaySynchronization: () => void;
  finishFirstRun: () => void;
  debugFastClick: boolean;
  setDebugFastClick: (enabled: boolean) => void;
  tapSushi: () => void;
  buyFacility: (facilityId: FacilityId) => void;
  applyProduction: (deltaSeconds: number) => void;
  addRunPlayTime: (deltaMs: number) => void;
  buyUpgrade: (id: string) => void;
  markNewsSeen: (id: string) => void;
};

export type GameStore = GameState & GameActions;
// Runtime-only override: never part of GameState or a save snapshot.
export const selectTapGain = (state: GameStore): number =>
  state.debugFastClick ? 10_000 : selectSushiPerClick(state);
const safeAdd = (a: number, b: number) => Math.min(a + b, Number.MAX_VALUE);

export const useGameStore = create<GameStore>()((set) => ({
  ...createInitialGameState(),
  debugFastClick: false,
  synchronize: () => set(state => pendingSynchronization(state)
    ? { syncCount: state.syncCount + 1, syncElapsedMs: 0 } : state),
  replaySynchronization: () => set(state => {
    if (state.endingPhase !== 'cleared') return state;
    const count = state.facilityCounts.global_freshness_sync;
    const facility = FACILITIES.find(f => f.id === 'global_freshness_sync')!;
    const refund = facility.basePrice * (facility.growthRate ** count - 1) / (facility.growthRate - 1);
    return { endingPhase: 'playing', collapseElapsedMs: 0, syncCount: 0, syncElapsedMs: 0,
      sushi: safeAdd(state.sushi, Math.round(refund)), debugFastClick: false,
      facilityCounts: { ...state.facilityCounts, global_freshness_sync: 0 } };
  }),
  finishFirstRun: () => set(state => canFinishFirstRun(state) ? {
    endingPhase: 'cleared', sushi: safeAdd(state.sushi, 1),
    totalSushiEarned: safeAdd(state.totalSushiEarned, 1),
    totalClicks: Math.min(state.totalClicks + 1, Number.MAX_SAFE_INTEGER),
  } : state),
  setDebugFastClick: enabled => set({ debugFastClick: enabled }),

  tapSushi: () => {
    set((state) => {
      if (state.endingPhase !== 'playing') return state;
      const gain = selectTapGain(state);
      return resolveAchievements({ ...state,
        sushi: safeAdd(state.sushi, gain),
        totalSushiEarned: safeAdd(state.totalSushiEarned, gain),
        totalClicks: Math.min(state.totalClicks + 1, Number.MAX_SAFE_INTEGER),
      }, ['totalClicks', 'totalSushiEarned', 'sushi']);
    });
  },

  buyFacility: (facilityId) => {
    set((state) => {
      if (state.endingPhase !== 'playing') return state;
      const facilityDefinition = FACILITIES.find(
        (facility) => facility.id === facilityId,
      );
  
      if (!facilityDefinition) {
        return state;
      }
  
      if (facilityId === 'global_freshness_sync' && !canBuySyncDevice(state)) return state;
      const ownedCount = state.facilityCounts[facilityId];
  
      const currentPrice = calculateCurrentPrice(
        facilityDefinition,
        ownedCount,
      );
  
      if (!Number.isFinite(currentPrice) || state.sushi < currentPrice || ownedCount >= Number.MAX_SAFE_INTEGER) {
        return state;
      }
  
      return resolveAchievements({ ...state,
        sushi: state.sushi - currentPrice,
        ...(facilityId === 'global_freshness_sync' && state.syncCount === 2 ? {
          syncCount: 3, syncElapsedMs: 0, endingPhase: 'collapse' as const,
          collapseElapsedMs: 0, debugFastClick: false,
        } : {}),
  
        facilityCounts: {
          ...state.facilityCounts,
          [facilityId]: ownedCount + 1,
        },
      }, [`facility:${facilityId}`, 'sushi']);
    });
  },

  applyProduction: (deltaSeconds) => {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    set((state) => {
      const sushiPerSecond = selectTotalSushiPerSecond(state);

      const gain = sushiPerSecond * deltaSeconds;
      if (!Number.isFinite(gain) || gain <= 0) return state;
      return { sushi: safeAdd(state.sushi, gain), totalSushiEarned: safeAdd(state.totalSushiEarned, gain) };
    });
  },

  addRunPlayTime: (deltaMs) => {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return;
    }

    set((state) => {
      if (state.endingPhase === 'cleared') return state;
      if (state.endingPhase === 'collapse') return {
        runPlayTimeMs: safeAdd(state.runPlayTimeMs, deltaMs),
        collapseElapsedMs: Math.min(COLLAPSE_DURATION_MS, state.collapseElapsedMs + deltaMs),
      };
      const next = { ...state, runPlayTimeMs: safeAdd(state.runPlayTimeMs, deltaMs),
        syncElapsedMs: state.syncCount > 0 ? Math.min(SYNC_SETTLE_MS, state.syncElapsedMs + deltaMs) : 0 };
      return Math.floor(next.runPlayTimeMs / 1000) !== Math.floor(state.runPlayTimeMs / 1000)
        ? resolveAchievements(next, ['runPlayTimeMs', 'totalSushiEarned', 'sushi']) : next;
    });
  },
  buyUpgrade: id => set(state => {
    if (state.endingPhase !== 'playing') return state;
    const upgrade = UPGRADE_BY_ID.get(id);
    if (!upgrade || state.purchasedUpgradeIds.includes(id) || !meetsCondition(state, upgrade.condition)
      || state.sushi < upgrade.cost) return state;
    return resolveAchievements({ ...state, sushi: state.sushi - upgrade.cost,
      purchasedUpgradeIds: [...state.purchasedUpgradeIds, id],
    }, ['upgrade', 'sushi']);
  }),
  markNewsSeen: id => set(state => state.seenNewsIds.includes(id) ? state : { seenNewsIds: [...state.seenNewsIds, id] }),
}));
