// Economy rules: facility price, production, multipliers.
// Implemented in a later step.
import type {
    FacilityDefinition,
    FacilityId,
  } from '../types';
  
  type FacilityCounts = Readonly<Record<FacilityId, number>>;
  
  /**
   * 施設1個を次に購入するときの現在価格を計算する。
   *
   * currentPrice =
   * floor(basePrice * growthRate ** ownedCount)
   */
  export function calculateCurrentPrice(
    facility: FacilityDefinition,
    ownedCount: number,
  ): number {
    return Math.floor(
      facility.basePrice * facility.growthRate ** ownedCount,
    );
  }
  
  /**
   * 1種類の施設が現在生産している SUSHI/sec を計算する。
   *
   * facilityProduction =
   * baseProduction * ownedCount
   */
  export function calculateFacilityProduction(
    facility: FacilityDefinition,
    ownedCount: number,
  ): number {
    return facility.baseProduction * ownedCount;
  }
  
  /**
   * 全施設を合計した SUSHI/sec を計算する。
   */
  export function calculateTotalSushiPerSecond(
    facilities: readonly FacilityDefinition[],
    facilityCounts: FacilityCounts,
  ): number {
    return facilities.reduce((total, facility) => {
      const ownedCount = facilityCounts[facility.id];
  
      return (
        total +
        calculateFacilityProduction(facility, ownedCount)
      );
    }, 0);
  }