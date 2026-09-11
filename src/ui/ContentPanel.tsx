import { memo, useState } from 'react';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../game/data/achievements';
import { UPGRADES } from '../game/data/upgrades';
import { NEWS } from '../game/data/news';
import { meetsCondition } from '../game/logic/conditions';
import { useGameStore } from '../game/state/store';
import { formatNumber } from './format';

function UpgradeList() {
  // One selector per card means the catalog does not rerender on every production tick.
  return <div className="upgrade-list">{UPGRADES.map(upgrade => <UpgradeCard key={upgrade.id} id={upgrade.id} />)}</div>;
}

function UpgradeCard({ id }: { id: string }) {
  const upgrade = UPGRADES.find(item => item.id === id)!;
  const available = useGameStore(state => meetsCondition(state, upgrade.condition));
  const purchased = useGameStore(state => state.purchasedUpgradeIds.includes(id));
  const affordable = useGameStore(state => state.sushi >= upgrade.cost);
  const buy = useGameStore(state => state.buyUpgrade);
  return <article className={`upgrade-card ${purchased ? 'is-purchased' : ''}`}>
    <span className="content-icon" aria-hidden="true">{available || purchased ? upgrade.icon : '◇'}</span>
    <div><h3>{upgrade.displayName}</h3><p>{upgrade.description}</p>
      {!available && !purchased && <small>{unlockHint(upgrade.id)}</small>}</div>
    <button disabled={!available || !affordable || purchased} onClick={() => buy(id)} aria-label={`${upgrade.displayName}を購入`}>
      {purchased ? '✓ 導入済み' : !available ? '準備中' : `${formatNumber(upgrade.cost)} 寿司`}
    </button>
  </article>;
}

function unlockHint(id: string): string {
  const condition = UPGRADES.find(item => item.id === id)!.condition;
  if (condition.kind === 'facility') return `対象施設を${condition.count}個所有で解放`;
  if (condition.kind === 'stat' && condition.stat === 'totalClicks') return `${condition.atLeast}回握ると解放`;
  if (condition.kind === 'achievement') return `実績「${ACHIEVEMENTS.find(item => item.id === condition.id)?.displayName ?? condition.id}」で解放`;
  return 'お店の成長とともに解放';
}

function AchievementList() {
  const ids = useGameStore(state => state.unlockedAchievementIds);
  const clicks = useGameStore(state => Math.min(state.totalClicks, 100));
  return <><p className="section-note">小さな一歩が、お店の力に。報酬はすべての施設の生産に加算されます。</p>
    <div className="achievement-grid">{ACHIEVEMENTS.map(item => {
      const unlocked = ids.includes(item.id);
      const bonus = item.effects.reduce((sum, e) => sum + (e.kind === 'productionBonus' ? e.amount : 0), 0);
      return <article key={item.id} className={`achievement-card ${unlocked ? 'is-unlocked' : ''}`}>
        <span className="achievement-seal" aria-hidden="true">{unlocked ? item.icon : '◇'}</span>
        <div><h3>{item.displayName}</h3><p>{item.description}</p><small>{unlocked ? '✓ 達成' : item.id === 'click_100' ? `${clicks} / 100 回` : '未達成'} <span>生産 +{formatNumber(bonus * 100)}%</span></small></div>
      </article>;
    })}</div></>;
}

function NewsArchive() {
  const seen = useGameStore(state => state.seenNewsIds);
  return <div className="news-archive">{[...seen].reverse().map(id => NEWS.find(item => item.id === id)).filter(item => !!item).map(item =>
    <article key={item.id}><small>{item.category}</small><p>{item.text}</p></article>)}
    {!seen.length && <p>新聞は、お店と一緒に育っていきます。</p>}</div>;
}

export const ContentPanel = memo(function ContentPanel() {
  const [tab, setTab] = useState<'upgrades' | 'achievements' | 'news'>('upgrades');
  const achievementIds = useGameStore(state => state.unlockedAchievementIds);
  const count = achievementIds.filter(id => ACHIEVEMENT_BY_ID.has(id)).length;
  return <section className="content-panel" aria-label="お店の記録">
    <div className="content-tabs" role="tablist" aria-label="強化・実績・新聞">
      {([{id:'upgrades',label:'強化'}, {id:'achievements',label:`実績帳 ${count}/10`}, {id:'news',label:'新聞の切り抜き'}] as const).map(item =>
        <button id={`tab-${item.id}`} key={item.id} role="tab" aria-selected={tab === item.id} aria-controls="content-tabpanel" onClick={() => setTab(item.id)}>{item.label}</button>)}
    </div>
    <div id="content-tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
      {tab === 'upgrades' ? <UpgradeList /> : tab === 'achievements' ? <AchievementList /> : <NewsArchive />}
    </div>
  </section>;
});
