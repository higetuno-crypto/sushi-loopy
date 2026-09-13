import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { chooseNews } from '../game/logic/progression';
import { meetsCondition } from '../game/logic/conditions';
import { useGameStore } from '../game/state/store';

export function NewsTicker() {
  const surface = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = surface.current;
    if (!element) return;
    const update = () => document.documentElement.style.setProperty('--news-height', `${Math.ceil(element.getBoundingClientRect().height)}px`);
    update();
    const observer = new ResizeObserver(update); observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--news-height'); };
  }, []);
  const [news, setNews] = useState(() => chooseNews(useGameStore.getState()));
  const initialNews = useRef(news);
  useEffect(() => {
    let previous: string | null = null;
    let turn = 0;
    const advance = () => {
      const item = chooseNews(useGameStore.getState(), previous, turn++);
      if (!item) return;
      previous = item.id;
      setNews(item);
      useGameStore.getState().markNewsSeen(item.id);
    };
    // StrictMode remount must not consume two unread editions on startup.
    const initial = chooseNews(useGameStore.getState(), null, 0);
    if (initialNews.current && meetsCondition(useGameStore.getState(), initialNews.current.condition)) {
      previous = initialNews.current.id;
      useGameStore.getState().markNewsSeen(initialNews.current.id);
    } else if (initial) advance();
    const timer = window.setInterval(() => { if (!document.hidden) advance(); }, 12000);
    const unsubscribe = useGameStore.subscribe((state, old) => {
      // Restore/import can invalidate the visible story; ordinary ticks cannot.
      if (state.facilityCounts !== old.facilityCounts || state.purchasedUpgradeIds !== old.purchasedUpgradeIds || state.seenNewsIds.length < old.seenNewsIds.length) {
        if (previous && !state.seenNewsIds.includes(previous)) advance();
      }
    });
    return () => { window.clearInterval(timer); unsubscribe(); };
  }, []);
  const valid = useGameStore(state => !news || meetsCondition(state, news.condition));
  return <aside ref={surface} className="news-ticker" aria-label="寿司新聞">
    <span className="news-label">寿司新聞 <span>↗</span></span>
    <p key={valid ? news?.id : 'restored'}>{valid ? news?.text : 'のれんを掛け直しています。次のお知らせをお待ちください。'}</p>
    <span className="news-edition">{news?.category}</span>
  </aside>;
}
