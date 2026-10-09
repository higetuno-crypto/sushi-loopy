import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { FACILITIES } from '../game/data/facilities';
import type { Town } from '../game/logic/town';
import type { FacilityId, GameState } from '../game/types';
import type { createTownRenderer, TownView } from '../game/rendering/townRenderer';
import { useGameStore } from '../game/state/store';

export function TownSprite({index,actors=false,className='',style}:{index:number;actors?:boolean;className?:string;style?:CSSProperties}) {
  return <span aria-hidden="true" className={`town-sprite ${className}`} style={{backgroundImage:`url(${import.meta.env.BASE_URL}assets/town/${actors?'actors':'facilities'}.webp)`,backgroundPosition:`${index%3*50}% ${Math.floor(index/3)*50}%`,...style}}/>;
}
type Props={
  counts:GameState['facilityCounts'];town:Town;
  moving?:FacilityId|null;frozen?:boolean;paused?:boolean;
  onMove?:(slot:number)=>void;
  onPlay?:(kind:'truck'|'cat'|'chef'|'bubble'|'boat'|'guest')=>void;
};
export const TownScene=memo(function TownScene(props:Props) {
  const {counts,town,moving,frozen,paused}=props;
  const host=useRef<HTMLDivElement>(null),renderer=useRef<ReturnType<typeof createTownRenderer>|null>(null),latest=useRef(props);
  const [view,setView]=useState<TownView>('craftsman'),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
  const currentView=useRef<TownView>('craftsman');
  useEffect(()=>{latest.current=props;});
  useEffect(()=>{
    let cancelled=false;
    const node=host.current!;
    void import('../game/rendering/townRenderer').then(({createTownRenderer})=>{
      if(cancelled)return;
      renderer.current=createTownRenderer(node,key=>{
        if(['cat','truck','chef','boat'].includes(key)) {
          renderer.current?.react(key);latest.current.onPlay?.(key as 'cat'|'truck'|'chef'|'boat');
        }else {currentView.current=key as FacilityId;setView(key as FacilityId);renderer.current?.focus(key as FacilityId);}
      },()=>setFailed(true));
      renderer.current.update(latest.current.counts,latest.current.town);
      renderer.current.pause(!!(latest.current.frozen||latest.current.paused));
      renderer.current.focus(latest.current.frozen?'all':currentView.current,true);
    }).catch(()=>{if(!cancelled)setFailed(true);});
    const capture=async(event:Event)=>{
      const request=event as CustomEvent<{resolve:(blob:Blob)=>void;reject:(error:unknown)=>void}>;
      try {if(!renderer.current)throw new Error('Town renderer unavailable');request.detail.resolve(await renderer.current.photo());}
      catch(error){request.detail.reject(error);}
    };
    node.addEventListener('town-photo',capture);
    return()=>{cancelled=true;node.removeEventListener('town-photo',capture);renderer.current?.dispose();renderer.current=null;};
  },[retry]);
  useEffect(()=>{renderer.current?.update(counts,town);},[counts,town]);
  useEffect(()=>{renderer.current?.pause(!!(frozen||paused));},[frozen,paused]);
  useEffect(()=>{renderer.current?.focus(moving||frozen?'all':view);},[view,moving,frozen]);
  useEffect(()=>{
    const purchased=(event:Event)=>{
      if(latest.current.frozen)return;
      const {id}=(event as CustomEvent<{id:FacilityId}>).detail;
      currentView.current=id;setView(id);renderer.current?.focus(id);
    };
    window.addEventListener('sushi-loopy:town-purchase',purchased);
    return()=>window.removeEventListener('sushi-loopy:town-purchase',purchased);
  },[]);
  useEffect(()=>useGameStore.subscribe((state,old)=>{if(!latest.current.frozen&&state.totalClicks!==old.totalClicks)renderer.current?.react('chef');}),[]);
  const focus=(next:TownView)=>{currentView.current=next;setView(next);renderer.current?.focus(next);};
  const play=(kind:'cat'|'truck'|'chef'|'boat')=>{renderer.current?.react(kind);props.onPlay?.(kind);};
  return <div className={`town-view weather-${town.weather}`}>
    <div ref={host} className="town-viewport town-world" role="img" aria-label="海辺の寿司屋。職人、レーン、配達トラックが動く立体の街"/>
    {failed && <div className="town-render-fallback"><p>街の表示を再開できませんでした。</p><button onClick={()=>{setFailed(false);setRetry(n=>n+1);}}>街を再表示</button></div>}
    {!frozen && <nav className="town-views" aria-label="街の眺め">
      <button aria-pressed={view==='craftsman'&&!moving} onClick={()=>focus('craftsman')}>お店</button>
      {counts.marine_food_plant>0 && <button aria-pressed={view==='marine_food_plant'&&!moving} onClick={()=>focus('marine_food_plant')}>港</button>}
      <button aria-pressed={view==='all'||!!moving} onClick={()=>focus('all')}>全景</button>
    </nav>}
    {moving && <div className="town-plot-picker" aria-label="移動先の区画">{town.plots.map((slot,index)=><button key={slot} onClick={()=>props.onMove?.(slot)}>{FACILITIES[index].displayName}</button>)}</div>}
    {!frozen && <details className="town-interactions"><summary>街のものに触れる</summary><div><button onClick={()=>play('cat')}>猫をなでる</button>{counts.craftsman>0&&<button onClick={()=>play('chef')}>職人の手元を見る</button>}{counts.marine_food_plant>0&&<button onClick={()=>play('truck')}>配達トラックに合図する</button>}{counts.sushi_ocean_mining>0&&<button onClick={()=>play('boat')}>漁船に合図する</button>}</div></details>}
  </div>;
});
