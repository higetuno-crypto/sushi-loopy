// Actions commit progress atomically, before checkpoint tracking snapshots it.
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
  setDebugFastClick: enabled => set({ debugFastClick: enabled }),

  tapSushi: () => {
    set((state) => {
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
      const facilityDefinition = FACILITIES.find(
        (facility) => facility.id === facilityId,
      );
  
      if (!facilityDefinition) {
        return state;
      }
  
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
      const next = { ...state, runPlayTimeMs: safeAdd(state.runPlayTimeMs, deltaMs) };
      return Math.floor(next.runPlayTimeMs / 1000) !== Math.floor(state.runPlayTimeMs / 1000)
        ? resolveAchievements(next, ['runPlayTimeMs', 'totalSushiEarned', 'sushi']) : next;
    });
  },
  buyUpgrade: id => set(state => {
    const upgrade = UPGRADE_BY_ID.get(id);
    if (!upgrade || state.purchasedUpgradeIds.includes(id) || !meetsCondition(state, upgrade.condition)
      || state.sushi < upgrade.cost) return state;
    return resolveAchievements({ ...state, sushi: state.sushi - upgrade.cost,
      purchasedUpgradeIds: [...state.purchasedUpgradeIds, id],
    }, ['upgrade', 'sushi']);
  }),
  markNewsSeen: id => set(state => state.seenNewsIds.includes(id) ? state : { seenNewsIds: [...state.seenNewsIds, id] }),
}));
