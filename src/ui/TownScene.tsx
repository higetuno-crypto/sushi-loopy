import { memo, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { FACILITIES } from '../game/data/facilities';
import { townTier, type Town } from '../game/logic/town';
import type { FacilityId, GameState } from '../game/types';

const base = `${import.meta.env.BASE_URL}assets/town/`;
// Fixed landing pads keep paths readable and placement forgiving on a phone.
const TOWN_PLOTS = [
  [470,650], [705,560], [270,525], [245,260], [120,370], [790,250], [560,235], [750,820], [330,810],
] as const;

export function TownSprite({ index, actors = false, className = '', style }: { index: number; actors?: boolean; className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={`town-sprite ${className}`} style={{ backgroundImage: `url(${base}${actors ? 'actors' : 'facilities'}.webp)`, backgroundPosition: `${index % 3 * 50}% ${Math.floor(index / 3) * 50}%`, ...style }} />;
}

type Props = {
  counts: GameState['facilityCounts']; town: Town; selected?: FacilityId | null;
  receipt?: { id: FacilityId; serial: number; first: boolean } | null;
  moving?: FacilityId | null; frozen?: boolean;
  onSelect?: (id: FacilityId) => void; onMove?: (slot: number) => void;
  onPlay?: (kind: 'truck' | 'cat' | 'chef' | 'bubble' | 'boat' | 'guest') => void;
};

export const TownScene = memo(function TownScene({ counts, town, selected, receipt, moving, frozen, onSelect, onMove, onPlay }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 390, height: 540 });
  const [camera, setCamera] = useState({ zoom: 1.15, x: 0, y: 0 });
  const [hidden, setHidden] = useState(document.hidden);
  const pointers = useRef(new Map<number, {x:number;y:number}>());
  const gesture = useRef({ x: 0, y: 0, panX: 0, panY: 0, distance: 0, zoom: 1.15, moved: false });
  const suppressClick = useRef(0);
  useEffect(() => {
    const node = host.current!;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(node);
    const visibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const scale = Math.min(size.width / 900, size.height / (frozen ? 1200 : 900)) * (frozen ? 1 : camera.zoom);
  const position = (index: number) => TOWN_PLOTS[town.plots[index]];
  const [shopX, shopY] = position(0);
  const route = (index: number) => { const [x,y] = position(index); return `M ${x} ${y} Q ${x + 70} ${y + 55} 520 445 Q 520 560 ${shopX} ${shopY + 25}`; };
  const plantRoute = route(3);
  const pointStyle = (x: number, y: number): CSSProperties => ({ left:x, top:y });
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (frozen || event.button !== 0) return;
    pointers.current.set(event.pointerId, {x:event.clientX,y:event.clientY});
    const list = [...pointers.current.values()];
    gesture.current = { x:event.clientX, y:event.clientY, panX:camera.x, panY:camera.y, zoom:camera.zoom, distance:list.length === 2 ? Math.hypot(list[1].x-list[0].x,list[1].y-list[0].y) : 0, moved:false };
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const g=gesture.current, list=[...pointers.current.values()];
    if (list.length === 2 && g.distance > 0) {
      g.moved=true;
      setCamera(c=>({...c, zoom:Math.max(1,Math.min(2.3,g.zoom*Math.hypot(list[1].x-list[0].x,list[1].y-list[0].y)/g.distance))}));
    } else if (Math.hypot(event.clientX-g.x,event.clientY-g.y)>8 || g.moved) {
      g.moved=true;
      setCamera(c=>({...c,x:Math.max(-size.width,Math.min(size.width,g.panX+event.clientX-g.x)),y:Math.max(-size.height*.7,Math.min(size.height*.7,g.panY+event.clientY-g.y))}));
    }
    if (g.moved) event.currentTarget.setPointerCapture(event.pointerId);
  };
  const up = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current.moved) suppressClick.current=performance.now()+200;
    pointers.current.delete(event.pointerId);
    const remaining=[...pointers.current.values()][0];
    if (remaining) gesture.current={x:remaining.x,y:remaining.y,panX:camera.x,panY:camera.y,distance:0,zoom:camera.zoom,moved:true};
  };
  return <div className={`town-view ${frozen || hidden ? 'town-paused' : ''} weather-${town.weather}`}>
    <div ref={host} className="town-viewport" inert={frozen} aria-label="わたしの寿司の街。ドラッグで移動、二本指で拡大" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClickCapture={e=>{if(performance.now()<suppressClick.current){e.preventDefault();e.stopPropagation();}}}>
      <div className="town-world" data-town-photo style={{ width:900,height:1200,transform:`translate(${size.width/2-450*scale+(frozen?0:camera.x)}px, ${size.height/2-(frozen?600:545)*scale+(frozen?0:camera.y)}px) scale(${scale})` }}>
        <img className="town-terrain" src={`${base}island.webp`} width="900" height="1200" alt="海に囲まれた、石段と桟橋の小さな島" draggable="false" />
        <svg className="town-roads" viewBox="0 0 900 1200" aria-hidden="true">
          {[2,3,5,7].filter(i=>counts[FACILITIES[i].id]>0).map(i=><g key={`${i}:${town.plots.join()}`}><path d={route(i)} stroke="#f9e5ba" strokeWidth="32"/><path d={route(i)} stroke="#bda97e" strokeWidth="24"/><path d={route(i)} stroke="#f5e5bc" strokeWidth="3" strokeDasharray="9 12"/></g>)}
        </svg>
        {counts.fusion_sushi_converter>0 && <div className="town-lamps" aria-hidden="true">{[[365,610],[575,380],[675,760],[300,250]].map(([x,y],i)=><TownSprite key={i} actors index={8} className="town-lamp" style={pointStyle(x,y)}/>)}</div>}
        {FACILITIES.map((facility,index)=>{
          const count=counts[facility.id], [x,y]=position(index), tier=townTier(count), visible=count>0 || index===0;
          if(!visible && !moving) return null;
          return <button key={facility.id} type="button" className={`town-building building-${facility.id} tier-${tier} ${selected===facility.id?'is-selected':''} ${receipt?.id===facility.id?'is-new':''} ${!visible?'is-plot':''}`} style={{left:x,top:y,zIndex:Math.floor(y), '--tier':tier} as CSSProperties} aria-label={`${facility.displayName} ${count}個${moving?'。この場所へ移動':''}`} aria-pressed={selected===facility.id} onClick={()=>moving?onMove?.(town.plots[index]):onSelect?.(facility.id)}>
            {visible ? <>
              <TownSprite index={index} className={`town-building-art ${index<2?`cloth-${town.color}`:''}`} />
              {count>0 && <span className="town-work" aria-hidden="true">
                {index===0 && <TownSprite actors index={3} className="town-chef"/>}
                {index===1 && <><i className="town-plate plate-one">●</i><i className="town-plate plate-two">●</i><TownSprite actors index={4} className="town-customer"/></>}
                {index===2 && <TownSprite index={2} className="town-mechanism"/>}
                {index===3 && <><i className="town-water water-one"/><i className="town-water water-two"/><span className="town-crate">▦</span></>}
                {index===4 && <TownSprite actors index={6} className="town-drill"/>}
                {index===5 && <i className="town-power"/>}
                {index===6 && <TownSprite index={6} className="town-rocket"/>}
                {index===7 && <><i className="town-ice ice-one">◌</i><i className="town-ice ice-two">◌</i></>}
                {index===8 && <i className="town-signal"/>}
              </span>}
              {tier>1 && <span className="town-expansion" aria-hidden="true">{Array.from({length:tier-1},(_,i)=><TownSprite actors index={index<2?4:8} key={i}/>)}</span>}
              <span className="town-building-label">{index===0?town.name:facility.displayName}<small>{count>0?`Lv.${tier} · ×${count}`:'開店準備'}</small></span>
              {receipt?.id===facility.id && <span key={receipt.serial} className="town-build-ring" aria-hidden="true"/>}
            </> : <span className="town-empty-plot">ここへ</span>}
          </button>;
        })}
        {counts.marine_food_plant>0 && <>
          <button type="button" aria-label="配達トラックに合図する" className={`town-truck truck-${town.truckColor} ${receipt?.id==='marine_food_plant'&&receipt.first?'first-delivery':''}`} key={`truck:${town.plots.join()}:${receipt?.id==='marine_food_plant'?receipt.serial:'steady'}`} style={{offsetPath:`path('${plantRoute}')`}} onClick={()=>onPlay?.('truck')}><TownSprite actors index={0}/><span className="truck-cargo">▦</span></button>
          {townTier(counts.marine_food_plant)>1 && <button type="button" aria-label="二台目のトラックに合図する" className={`town-truck truck-${town.truckColor} second-truck`} style={{offsetPath:`path('${plantRoute}')`}} onClick={()=>onPlay?.('truck')}><TownSprite actors index={1}/></button>}
        </>}
        {counts.auto_sushi_machine>0 && <TownSprite actors index={6} className="town-sushi-delivery" style={{offsetPath:`path('${route(2)}')`}}/>}
        {counts.sushi_ocean_mining>0 && <button aria-label="漁船に合図する" className="town-boat" onClick={()=>onPlay?.('boat')}><TownSprite actors index={2}/></button>}
        {town.bench && <TownSprite actors index={7} className="town-bench" style={pointStyle(shopX-140,shopY+78)}/>}
        <button className={`town-cat ${town.bench?'cat-at-bench':''}`} style={pointStyle(shopX-(town.bench?140:50),shopY+(town.bench?52:70))} aria-label="猫をなでる" onClick={()=>onPlay?.('cat')}><TownSprite actors index={5}/></button>
        {counts.conveyor_sushi>0 && <button className="town-guest" style={pointStyle(shopX+115,shopY+55)} aria-label="常連さんの注文を見る" onClick={()=>onPlay?.('guest')}><TownSprite actors index={4}/><span>ひと皿、いい？</span></button>}
        {counts.freshness_freezer>0 && <button className="town-bubble" style={pointStyle(position(7)[0]+70,position(7)[1]-160)} aria-label="氷の泡を鳴らす" onClick={()=>onPlay?.('bubble')}>◌</button>}
        <div className="town-atmosphere" aria-hidden="true"/>
        <span className="town-photo-sign">{town.name}<small>SUSHI LOOPY</small></span>
      </div>
    </div>
    {!frozen && <div className="town-camera" data-html2canvas-ignore>
      <button aria-label="街を縮小" disabled={camera.zoom<=1} onClick={()=>setCamera(c=>({...c,zoom:Math.max(1,c.zoom-.25)}))}>−</button>
      <button aria-label="街を拡大" disabled={camera.zoom>=2.3} onClick={()=>setCamera(c=>({...c,zoom:Math.min(2.3,c.zoom+.25)}))}>＋</button>
      <button onClick={()=>setCamera({zoom:1.15,x:0,y:0})}>お店へ</button>
    </div>}
  </div>;
});
