import { EndingScreen } from './EndingScreen';
import { canStartCollapse } from '../game/logic/loop';
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
import { SushiBox } from './SushiBox';
import { MotionControl } from './MotionControl';

function Counter() {
  const sushi = useGameStore(state => state.sushi);
  const runPlayTimeMs = useGameStore(state => Math.floor(state.runPlayTimeMs / 1000) * 1000);
  const sushiPerSecond = useGameStore(selectTotalSushiPerSecond);
  return <ResourcePanel sushi={sushi} sushiPerSecond={sushiPerSecond} runPlayTimeMs={runPlayTimeMs} />;
}

function NextGoal() {
  const ready = useGameStore(canStartCollapse);
  const start = useGameStore(state => state.startCollapse);
  const next = useGameStore(state => FACILITIES.find(f => state.facilityCounts[f.id] === 0)?.id);
  const target = FACILITIES.find(f => f.id === next);
  const progress = useGameStore(state => target ? Math.min(100, Math.floor(state.sushi / target.basePrice * 100)) : 100);
  const remaining = useGameStore(state => target ? Math.max(0, Math.ceil(target.basePrice - state.sushi)) : 0);
  if (ready) return <div className="next-goal finale-invitation">
    <span>最後の一歩 / 1周目の結末へ</span><strong>すべての食卓を、ひとつに。</strong>
    <p>世界鮮度同期装置が待機しています。同期を実行すると、お店は最後の局面へ進みます。</p>
    <button className="sync-button" onClick={start}>世界の同期を実行する</button>
    <small>追加費用なし · 結末まで約30秒＋最後の一操作</small>
  </div>;
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
    <SushiBox />
    <NextGoal />
    <DebugTools />
  </section>;
});

export function GameScreen() {
  const phase = useGameStore(state => state.endingPhase);
  const playing = phase === 'playing';
  return <main className={`game-screen phase-${phase}`}>
    <header className="game-header">
      <a className="wordmark" href="#counter" aria-label="Sushi Loopy"><span className="logo-seal">すし</span><span>Sushi <em>Loopy</em><small>ひとつ握る。世界がまわる。</small></span></a>
      <div className="header-note"><span className="status-dot" /> {playing ? '本日も、のんびり営業中。' : phase === 'cleared' ? '本日の営業は、終了しました。' : '世界鮮度同期、実行中。'}<small>一貫からはじまる、小さな物語。</small></div>
    </header>
    {playing && <NewsTicker />}
    <div className="experience-controls"><SoundControl /><MotionControl /></div>
    {!playing && <EndingScreen />}
    {playing && <>
    <div className="game-layout" id="counter">
      <CounterStage />
      <div className="management-column"><FacilityList /><ContentPanel /></div>
    </div>
    </>}
    <footer className="game-footer"><span>握る。まわる。ちょっと、ひと息。</span><small>SUSHI LOOPY · END 01</small></footer>
    <div className="save-area"><SaveTools /><FacilityCheckpointTools /></div>
    {playing && <><AchievementToast /><MobileTapDock /></>}
  </main>;
}
