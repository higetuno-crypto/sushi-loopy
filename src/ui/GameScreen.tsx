import { memo } from 'react';
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
    <div><span>つぎの一歩</span><strong>{target ? target.displayName : '世界いっぱいのお寿司'}</strong></div>
    <div className="goal-track" role="progressbar" aria-label="次の施設への進捗" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
    <small>{remaining > 0 ? `あと ${formatNumber(remaining)} SUSHI` : target ? '準備ができました。設備から購入できます。' : 'すべての施設が動いています。'}</small>
  </div>;
}

const CounterStage = memo(function CounterStage() {
  const tap = useGameStore(state => state.tapSushi);
  const perClick = useGameStore(selectTapGain);
  return <section className="counter-stage" aria-label="寿司を握る">
    <div className="stage-heading"><span>THE SUSHI COUNTER</span><span className="open-stamp">営業中</span></div>
    <Counter />
    <SushiButton onTap={tap} perClick={perClick} />
    <div className="conveyor-strip" aria-hidden="true"><div>{Array.from({length:12}, (_,i) => <span key={i}>{['🍣','🍙','🍥','🍣'][i%4]}</span>)}</div></div>
    <NextGoal />
    <SoundControl />
    <DebugTools />
  </section>;
});

export function GameScreen() {
  return <main className="game-screen">
    <header className="game-header">
      <a className="wordmark" href="#counter" aria-label="Sushi Loopy"><span className="logo-seal">すし</span><span>Sushi <em>Loopy</em><small>ひとつ握る。世界がまわる。</small></span></a>
      <div className="header-note"><span className="status-dot" /> 本日も、のんびり営業中。<small>一貫からはじまる、小さな物語。</small></div>
    </header>
    <NewsTicker />
    <div className="game-layout" id="counter">
      <CounterStage />
      <div className="management-column"><FacilityList /><ContentPanel /></div>
    </div>
    <footer className="game-footer"><span>握る。まわる。ちょっと、ひと息。</span><small>SUSHI LOOPY · STEP 03</small></footer>
    <div className="save-area"><SaveTools /><FacilityCheckpointTools /></div>
    <AchievementToast />
    <MobileTapDock />
  </main>;
}
