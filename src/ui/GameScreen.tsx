import { PreviousRunRecord } from './PreviousRunRecord';
import { anomalyLevel } from '../game/logic/loop';
import { Synchronization } from './Synchronization';
import { WorldDamage } from './WorldDamage';
import { memo, useEffect } from 'react';
import { FacilityList } from './FacilityList';
import { ResourcePanel } from './ResourcePanel';
import { SaveTools } from './SaveTools';
import { FacilityCheckpointTools } from './FacilityCheckpointTools';
import { SushiButton } from './SushiButton';
import { ContentPanel } from './ContentPanel';
import { NewsTicker } from './NewsTicker';
import { AchievementToast } from './AchievementToast';
import { SoundControl } from './SoundControl';
import { MobileTapDock } from './MobileTapDock';
import { selectTapGain, useGameStore } from '../game/state/store';
import { selectTotalSushiPerSecond } from '../game/state/selectors';
import { DebugTools } from './DebugTools';
import { FACILITIES } from '../game/data/facilities';
import { formatNumber } from './format';
import { SushiBox } from './SushiBox';
import { MotionControl } from './MotionControl';

function Counter() {
  const sushi = useGameStore(state => state.sushi);
  const runPlayTimeMs = useGameStore(state => Math.floor(state.runPlayTimeMs / 1000) * 1000);
  const sushiPerSecond = useGameStore(selectTotalSushiPerSecond);
  return <ResourcePanel sushi={sushi} sushiPerSecond={sushiPerSecond} runPlayTimeMs={runPlayTimeMs} />;
}

function NextGoal() {
  const next = useGameStore(state => FACILITIES.find(f => state.facilityCounts[f.id] === 0)?.id);
  const target = FACILITIES.find(f => f.id === next);
  const progress = useGameStore(state => target ? Math.min(100, Math.floor(state.sushi / target.basePrice * 100)) : 100);
  const remaining = useGameStore(state => target ? Math.max(0, Math.ceil(target.basePrice - state.sushi)) : 0);
  return <div className="next-goal">
    <div><span>つぎの一歩</span><strong>{target ? target.displayName : 'お店の設備を増やす'}</strong></div>
    <div className="goal-track" role="progressbar" aria-label="次の施設への進捗" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
    <small>{remaining > 0 ? `あと ${formatNumber(remaining)} SUSHI` : target ? '準備ができました。設備から購入できます。' : '設備を追加すると、生産量が増えます。'}</small>
  </div>;
}

const CounterStage = memo(function CounterStage() {
  const tap = useGameStore(state => state.tapSushi);
  const perClick = useGameStore(selectTapGain);
  return <section className="counter-stage" aria-label="寿司を握る">
    <div className="stage-heading"><span>THE SUSHI COUNTER</span><span className="open-stamp">営業中</span></div>
    <Counter />
    <SushiButton onTap={tap} perClick={perClick} />
    <SushiBox />
    <NextGoal />
    <DebugTools />
  </section>;
});

export function GameScreen() {
  const phase = useGameStore(state => state.endingPhase);
  const level = useGameStore(anomalyLevel);
  const playing = phase === 'playing';
  const previous = useGameStore(state => state.previousRun);
  const runKey = previous ? `${previous.runPlayTimeMs}:${previous.totalClicks}:${previous.totalSushiEarned}` : 'initial';
  useEffect(() => { if (previous) window.scrollTo({ top: 0, behavior: 'instant' }); }, [previous]);
  return <main className={`game-screen phase-${phase}`} data-anomaly={level}>
    <div className="world-surface">
      <header className="game-header">
        <a className="wordmark" href="#counter" aria-label="Sushi Loopy"><span className="logo-seal">すし</span><span>Sushi <em>Loopy</em><small>ひとつ握る。世界がまわる。</small></span></a>
        <div className="header-note"><span className="status-dot" /> 本日も、のんびり営業中。<small>一貫からはじまる、小さな物語。</small></div>
      </header>
    </div>
    <NewsTicker />
    <div className="experience-controls" data-preserve-ui><SoundControl /><MotionControl /></div>
    <div key={runKey} className="world-surface game-layout" id="counter" inert={!playing}>
      <CounterStage />
      <div className="management-column"><FacilityList /><ContentPanel /></div>
    </div>
    <WorldDamage key={phase} />
    <Synchronization />
    <footer className="game-footer"><span>握る。まわる。ちょっと、ひと息。</span><small>SUSHI LOOPY</small></footer>
    <div className="save-area" data-preserve-ui><SaveTools /><FacilityCheckpointTools /></div>
    <PreviousRunRecord key={`record:${runKey}`} />
    {playing && <><AchievementToast key={`toast:${runKey}`} /><MobileTapDock key={`dock:${runKey}`} /></>}
  </main>;
}
