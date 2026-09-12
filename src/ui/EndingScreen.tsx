import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../game/state/store';
import { COLLAPSE_SCENES, collapseSceneIndex, canFinishFirstRun } from '../game/logic/loop';
import { FACILITIES } from '../game/data/facilities';
import { FACILITY_ART, ASSETS } from '../game/data/presentation';
import { formatNumber, formatTime } from './format';
import { playTap } from '../game/audio/engine';

export function EndingScreen() {
  const phase = useGameStore(state => state.endingPhase);
  const index = useGameStore(state => collapseSceneIndex(state.collapseElapsedMs));
  const ready = useGameStore(canFinishFirstRun);
  const finish = useGameStore(state => state.finishFirstRun);
  const time = useGameStore(state => Math.floor(state.runPlayTimeMs / 1000) * 1000);
  const earned = useGameStore(state => state.totalSushiEarned);
  const clicks = useGameStore(state => state.totalClicks);
  const counts = useGameStore(state => state.facilityCounts);
  const [showRecord, setShowRecord] = useState(false);
  const surface = useRef<HTMLElement>(null);
  useEffect(() => { surface.current?.scrollIntoView({ block: 'start' }); }, []);
  const heading = useRef<HTMLHeadingElement>(null);
  const scene = COLLAPSE_SCENES[index];
  const cleared = phase === 'cleared';
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [phase, index]);
  return <section id="counter" ref={surface} className={`ending-screen ending-scene-${index} ${cleared ? 'ending-cleared' : ''}`} aria-label="1周目の結末">
    <div className="ending-caption"><span>{cleared ? 'SUSHI LOOPY / END 01' : scene.label}</span><span>{cleared ? '営業終了' : scene.status}</span></div>
    <div className="ending-world" aria-hidden="true">
      <div className="world-orbit orbit-one" /><div className="world-orbit orbit-two" /><div className="world-orbit orbit-three" />
      <div className="world-core">{cleared ? '一貫' : index >= 2 ? '・' : '鮮'}</div>
      {FACILITIES.map((facility, i) => <span key={facility.id} className="world-fragment" style={{
        left: `${50 + Math.cos(i / 9 * Math.PI * 2) * 39}%`,
        top: `${50 + Math.sin(i / 9 * Math.PI * 2) * 37}%`,
        animationDelay: `${i * -0.8}s`,
      }}>{FACILITY_ART[facility.id].icon}</span>)}
    </div>
    <div className="ending-story" aria-live="polite" aria-atomic="true">
      <h1 ref={heading} tabIndex={-1}>{cleared ? 'おあがりよ。' : scene.title}</h1>
      <p>{cleared ? '止まった世界に、一貫置いた。誰かが箸を取る音がした。' : scene.text}</p>
    </div>
    {cleared ? <div className="clear-record">
      <strong className="clear-seal">1周目 CLEAR</strong>
      <p>世界いっぱいのお寿司より、目の前の、ひと皿。</p>
      <dl><div><dt>営業した時間</dt><dd>{formatTime(time)}</dd></div><div><dt>届けたSUSHI</dt><dd>{formatNumber(earned)}</dd></div><div><dt>手で握った回数</dt><dd>{formatNumber(clicks)}</dd></div></dl>
      <p className="ending-thanks">遊んでくれて、ありがとうございました。<br />この周回は、ここでおしまいです。</p>
      <button className="ending-secondary" onClick={() => setShowRecord(value => !value)} aria-expanded={showRecord}>育てたお店の記録{showRecord ? 'を閉じる' : 'を見る'}</button>
      {showRecord && <ul className="ending-facility-record">{FACILITIES.map(f => <li key={f.id}><span>{f.displayName}</span><strong>{formatNumber(counts[f.id])} 台</strong></li>)}</ul>}
      <small>到達記録は自動保存されます。画面下からSave Codeを書き出せます。</small>
    </div> : <>
      <div className="ending-signal"><span />{scene.report}</div>
      {ready ? <button className="last-sushi" onClick={() => { finish(); playTap(); }}><img src={ASSETS.sushiSmall} alt="" /><span>最後の一貫を握る</span><small>あなたの手で、1 SUSHI</small></button>
        : <p className="ending-wait">世界の応答を待っています<span aria-hidden="true"> …</span></p>}
      <details className="ending-transcript"><summary>ここまでの観測記録</summary>{COLLAPSE_SCENES.slice(0, index + 1).map(item => <p key={item.label}><strong>{item.title}</strong><br />{item.text}</p>)}</details>
    </>}
  </section>;
}
