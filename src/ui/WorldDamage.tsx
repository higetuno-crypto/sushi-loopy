import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../game/state/store';
import { anomalyLevel, canFinishFirstRun, ERROR_AT_MS } from '../game/logic/loop';
import { ASSETS } from '../game/data/presentation';
import { playTap } from '../game/audio/engine';

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
    {level>=2 && <div className={`signal-tears tears-${level}`} data-world-overlay aria-hidden="true"><i/><i/><i/></div>}
    {failing && !ready && !rendered && <div className="sync-fault" data-world-overlay role="status"><code>SYNC_ERR / 0x0003<br/>同一時刻に複数の応答<br/>再接続… 再接続… 再接続…</code></div>}
    {failing && <div ref={host} className={`world-fracture ${rendered?'is-rendered':''} ${fallback?'fracture-fallback':''}`} data-world-overlay aria-hidden="true" />}
    {collapse && ready && <div className="last-counter" data-world-overlay>
      <button ref={lastButton} className="surviving-sushi" aria-label="寿司を握る" onClick={()=>{finish();playTap();}}><img src={ASSETS.sushiSmall} alt=""/><span>握る</span></button>
    </div>}
  </>;
}
