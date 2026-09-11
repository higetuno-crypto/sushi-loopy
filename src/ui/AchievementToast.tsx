import { useEffect, useState } from 'react';
import { ACHIEVEMENT_BY_ID } from '../game/data/achievements';
import { useGameStore } from '../game/state/store';

export function AchievementToast() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => useGameStore.subscribe((state, before) => {
    if (state.unlockedAchievementIds === before.unlockedAchievementIds) return;
    const fresh = state.unlockedAchievementIds.filter(id => !before.unlockedAchievementIds.includes(id) && ACHIEVEMENT_BY_ID.has(id));
    if (fresh.length) setIds(queue => [...queue, ...fresh].slice(-10));
    if (state.unlockedAchievementIds.length < before.unlockedAchievementIds.length) setIds([]);
  }), []);
  useEffect(() => {
    if (!ids.length) return;
    const timer = window.setTimeout(() => setIds(queue => queue.slice(1)), 4000);
    return () => window.clearTimeout(timer);
  }, [ids]);
  const item = ACHIEVEMENT_BY_ID.get(ids[0]);
  return <div className="toast-region" role="status" aria-live="polite">{item && <div className="achievement-toast" key={item.id}>
    <span>{item.icon}</span><div><small>新しい実績を達成</small><strong>{item.displayName}</strong></div>
  </div>}</div>;
}
