import { useGameStore } from '../game/state/store';
import { FACILITIES } from '../game/data/facilities';
import { formatNumber, formatTime } from './format';

export function PreviousRunRecord() {
  const record = useGameStore(state => state.previousRun);
  if (!record) return null;
  return <details className="previous-run-record" data-preserve-ui>
    <summary>前回のルーピー</summary>
    <dl>
      <div><dt>世界同期までにかかった時間</dt><dd>{formatTime(Math.max(0, record.runPlayTimeMs - record.collapseElapsedMs))}</dd></div>
      <div><dt>手で握った回数</dt><dd>{formatNumber(record.totalClicks)}</dd></div>
      <div><dt>作ったSUSHI</dt><dd>{formatNumber(record.totalSushiEarned)}</dd></div>
    </dl>
    <ul>{FACILITIES.filter(f => record.facilityCounts[f.id] > 0).map(f => <li key={f.id}><span>{f.displayName}</span><span>× {formatNumber(record.facilityCounts[f.id])}</span></li>)}</ul>
  </details>;
}
