import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../game/state/store';
import { anomalyLevel, canFinishFirstRun, ERROR_AT_MS, FRACTURE_AT_MS } from '../game/logic/loop';
import { ASSETS } from '../game/data/presentation';
import { playTap } from '../game/audio/engine';
import { drawSystemFailure } from '../game/rendering/systemFailure';

function SystemFailure() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = canvas.current!, ink = node.getContext('2d');
    if (!ink) return;
    let frame = 0, previous = -1, updatedAt = performance.now();
    const render = (now: number) => {
      if (!document.hidden) {
        const elapsed = useGameStore.getState().collapseElapsedMs;
        if (elapsed !== previous) { previous = elapsed; updatedAt = now; }
        const ms = elapsed + Math.min(now - updatedAt, 250);
        const ratio = Math.min(devicePixelRatio, 1.5);
        if (node.width !== Math.round(innerWidth * ratio) || node.height !== Math.round(innerHeight * ratio)) {
          node.width = Math.round(innerWidth * ratio); node.height = Math.round(innerHeight * ratio);
        }
        ink.setTransform(ratio, 0, 0, ratio, 0, 0);
        const motion = document.documentElement.dataset.motion;
        const reduced = motion === 'off' || (motion !== 'on' && matchMedia('(prefers-reduced-motion: reduce)').matches);
        const state = drawSystemFailure(ink, ms, innerWidth, innerHeight, reduced);
        node.dataset.phase = state.phase; node.dataset.dialogs = String(state.dialogs);
        node.dataset.reduced = String(reduced);
        if (ms >= FRACTURE_AT_MS) return;
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={canvas} className="system-failure" data-world-overlay aria-hidden="true" />;
}

export function WorldDamage() {
  const level=useGameStore(anomalyLevel);
  const collapse=useGameStore(state=>state.endingPhase==='collapse');
  const failing=useGameStore(state=>state.endingPhase==='collapse' && state.collapseElapsedMs>=ERROR_AT_MS);
  const ready=useGameStore(canFinishFirstRun);
  const finish=useGameStore(state=>state.finishFirstRun);
  const host=useRef<HTMLDivElement>(null);
  const lastButton=useRef<HTMLButtonElement>(null);
  const [rendered,setRendered]=useState(false);
  const [fallback,setFallback]=useState(false);
  useEffect(()=>{
    if(level>=2) void import('../game/rendering/worldFracture').catch(()=>{});
  },[level]);
  useEffect(()=>{
    if(!failing || !host.current)return;
    const node=host.current, controller=new AbortController();
    let dispose:(()=>void)|undefined;
    const fail=()=>{if(!controller.signal.aborted){setFallback(true);setRendered(false);}};
    node.addEventListener('fracture-lost',fail);
    const timeout=window.setTimeout(()=>{fail();controller.abort();},7000);
    void import('../game/rendering/worldFracture').then(module=>module.createWorldFracture(node,controller.signal,()=>useGameStore.getState().collapseElapsedMs)).then(cleanup=>{
      window.clearTimeout(timeout);
      if(controller.signal.aborted){cleanup();return;}
      dispose=cleanup;setRendered(true);
    }).catch(()=>{window.clearTimeout(timeout);fail();});
    return ()=>{window.clearTimeout(timeout);controller.abort();dispose?.();node.removeEventListener('fracture-lost',fail);};
  },[failing]);
  useEffect(()=>{
    const root=document.querySelector('.game-screen');
    root?.classList.toggle('fractured',failing);
    return ()=>root?.classList.remove('fractured');
  },[failing]);
  useEffect(()=>{if(ready)lastButton.current?.focus({preventScroll:true});},[ready]);
  return <>
    {collapse && <SystemFailure/>}
    {level>=2 && <div className={`signal-tears tears-${level}`} data-world-overlay aria-hidden="true"><i/><i/><i/></div>}
    {collapse && !ready && <span className="town-sr-value" data-world-overlay role="status">同期できません。メモリを参照できませんでした。</span>}
    {failing && <div ref={host} className={`world-fracture ${rendered?'is-rendered':''} ${fallback?'fracture-fallback':''}`} data-world-overlay aria-hidden="true" />}
    {collapse && ready && <div className="last-counter" data-world-overlay>
      <button ref={lastButton} className="surviving-sushi" aria-label="寿司を握る" onClick={()=>{finish();playTap();}}><img src={ASSETS.sushiSmall} alt=""/><span>握る</span></button>
    </div>}
  </>;
}
