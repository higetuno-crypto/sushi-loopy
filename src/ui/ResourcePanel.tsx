import { formatNumber, formatTime } from './format';
import { useGameStore } from '../game/state/store';
import { selectProductionBonus } from '../game/state/selectors';
type ResourcePanelProps = { sushi: number; sushiPerSecond: number; runPlayTimeMs: number };
export function ResourcePanel({ sushi, sushiPerSecond, runPlayTimeMs }: ResourcePanelProps) {
  const bonus = useGameStore(selectProductionBonus);
  return <section className="resource-panel" aria-label="生産状況">
    <span className="resource-label">ただいまのお寿司</span>
    <div className="resource-main"><strong className="resource-value" data-echo={formatNumber(sushi)}>{formatNumber(sushi)}</strong><span>SUSHI</span></div>
    <div className="resource-sub-grid"><span><b>{formatNumber(sushiPerSecond)}</b> / 秒</span><span className="bonus-pill">生産 +{formatNumber(bonus * 100)}%</span></div>
    <span className="run-time">営業時間 {formatTime(runPlayTimeMs)}</span>
  </section>;
}
