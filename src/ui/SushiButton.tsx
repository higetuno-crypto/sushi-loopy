import { useRef, useState } from 'react';
import { ASSETS } from '../game/data/presentation';
import { playTap } from '../game/audio/engine';
import { formatNumber } from './format';
import { useHoldTap } from './useHoldTap';
type SushiButtonProps = { onTap: () => void; perClick: number };
export function SushiButton({ onTap, perClick }: SushiButtonProps) {
  const [taps, setTaps] = useState<{ id: number; amount: number }[]>([]);
  const [imageFailed, setImageFailed] = useState(false);
  const sequence = useRef(0);
  const tap = () => {
    onTap(); playTap();
    const item = { id: sequence.current++, amount: perClick };
    setTaps(items => [...items.slice(-5), item]);
  };
  const hold = useHoldTap(tap);
  return <section className="sushi-button-section">
    <span className="hero-caption">できたてを、どうぞ。</span>
    <span className="spark spark-one" aria-hidden="true">✧</span><span className="spark spark-two" aria-hidden="true">✦</span>
    <button className="sushi-button" type="button" {...hold} aria-label="寿司をタップする。長押しでも握れます">
      {imageFailed ? <span className="sushi-fallback">🍣</span> : <img src={ASSETS.sushi} srcSet={`${ASSETS.sushiSmall} 320w, ${ASSETS.sushi} 640w`} sizes="(max-width: 600px) 260px, 340px" width="631" height="640" alt="" draggable="false" onError={() => setImageFailed(true)} />}
      {taps.map(item => <span className="tap-particle" aria-hidden="true" key={item.id} style={{ left: `${35 + item.id % 4 * 10}%` }} onAnimationEnd={() => setTaps(items => items.filter(x => x.id !== item.id))}>+{formatNumber(item.amount)}</span>)}
      {taps.map(item => <span className="sushi-drop" aria-hidden="true" key={`sushi-${item.id}`} style={{ left: `${20 + item.id % 5 * 12}%` }}>🍣<span /></span>)}
    </button>
    <p className="sushi-button-label">タップ・長押しで握る <span>+{formatNumber(perClick)} SUSHI</span><small>おしたままで、1秒に4こ！</small></p>
  </section>;
}
