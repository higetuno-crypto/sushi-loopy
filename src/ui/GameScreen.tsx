import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FACILITIES } from '../game/data/facilities';
import type { FacilityId } from '../game/types';
import { createTown, TOWN_COLORS } from '../game/logic/town';
import { anomalyLevel, pendingSynchronization } from '../game/logic/loop';
import { selectTapGain, useGameStore } from '../game/state/store';
import { selectTotalSushiPerSecond } from '../game/state/selectors';
import { playTap, playTownSound } from '../game/audio/engine';
import { SAVE_STATUS_EVENT, type SaveStatusDetail } from '../game/runtime/autoSave';
import { FacilityItem } from './FacilityItem';
import { FacilityList } from './FacilityList';
import { ContentPanel } from './ContentPanel';
import { NewsTicker } from './NewsTicker';
import { AchievementToast } from './AchievementToast';
import { SoundControl } from './SoundControl';
import { MotionControl } from './MotionControl';
import { SaveTools } from './SaveTools';
import { FacilityCheckpointTools } from './FacilityCheckpointTools';
import { PreviousRunRecord } from './PreviousRunRecord';
import { DebugTools } from './DebugTools';
import { Synchronization } from './Synchronization';
import { WorldDamage } from './WorldDamage';
import { TownScene, TownSprite } from './TownScene';
import { useHoldTap } from './useHoldTap';
import { formatNumber } from './format';

function Sheet({open, title, close, children, name}: {open:boolean;title:string;close:()=>void;children:ReactNode;name:string}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const dialog=ref.current!;
    if(open && !dialog.open) dialog.showModal();
    else if(!open && dialog.open) dialog.close();
  },[open]);
  return <dialog ref={ref} className={`town-sheet sheet-${name}`} aria-labelledby={`sheet-${name}`} onCancel={close} onClick={e=>{if(e.target===e.currentTarget)close();}}>
    <div className="sheet-surface"><header><div><small>SUSHI LOOPY</small><h2 id={`sheet-${name}`}>{title}</h2></div><button autoFocus onClick={close} aria-label={`${title}を閉じる`}>×</button></header>{children}</div>
  </dialog>;
}

function TownCounter({openSettings}:{openSettings:()=>void}) {
  const sushi=useGameStore(s=>s.sushi), sps=useGameStore(selectTotalSushiPerSecond), name=useGameStore(s=>s.town.name);
  const [warning,setWarning]=useState(false);
  useEffect(()=>{const update=(event:Event)=>setWarning(!(event as CustomEvent<SaveStatusDetail>).detail.healthy);window.addEventListener(SAVE_STATUS_EVENT,update);return()=>window.removeEventListener(SAVE_STATUS_EVENT,update);},[]);
  return <header className="town-header">
    <div className="town-brand"><span className="town-seal">すし</span><div><span>Sushi <em>Loopy</em></span><h1>{name}</h1></div></div>
    <button className={`town-menu ${warning?'save-attention':''}`} onClick={openSettings} aria-label={warning?'保存に問題があります。設定を開く':'記録と設定を開く'}>{warning?'保存に注意':'•••'}</button>
    <div className="town-balance" aria-label="生産状況"><strong className="resource-value">{formatNumber(sushi)}</strong><span>SUSHI</span><small><i/> +{formatNumber(sps)} / 秒</small></div>
  </header>;
}

function TownDock({open, active, photo}:{open:(sheet:'facilities'|'customize')=>void;active:boolean;photo:boolean}) {
  const tap=useGameStore(s=>s.tapSushi), gain=useGameStore(selectTapGain);
  const [count,setCount]=useState(0);
  const hold=useHoldTap(()=>{tap();playTap();setCount(c=>c+1);},active && !photo);
  return <nav className="town-dock" aria-label="街の操作" inert={!active || photo}>
    <button onClick={()=>open('facilities')}><span aria-hidden="true">▥</span>設備</button>
    <button className="town-tap sushi-button" {...hold} aria-label="寿司をタップする。長押しでも握れます"><TownSprite actors index={6}/><span>にぎる<small>長押しで +{formatNumber(gain)} ずつ</small></span>{count>0 && <b key={count} className="town-tap-gain" aria-hidden="true">+{formatNumber(gain)}</b>}</button>
    <button onClick={()=>open('customize')}><span aria-hidden="true">✿</span>模様替え</button>
  </nav>;
}

function GuestOrder({notify}:{notify:(text:string)=>void}) {
  const count=useGameStore(s=>s.town.ordersServed), seconds=useGameStore(s=>Math.max(0,Math.ceil((s.town.orderReadyAt-s.runPlayTimeMs)/1000))), gain=useGameStore(s=>selectTotalSushiPerSecond(s)*4);
  const serve=useGameStore(s=>s.serveGuest);
  const names=['サーモン','たまご','まぐろ'];
  return <div className="guest-order"><TownSprite actors index={4}/><h3>いつもの、{names[count%3]}を。</h3><p>{seconds>0?`「ごちそうさま！」 次のひと皿まで ${seconds}秒`:`好きな一貫をどうぞ。お礼は ${formatNumber(gain)} SUSHI。`}</p><div>{names.map((name,i)=><button key={name} disabled={seconds>0} onClick={()=>{if(serve(i)){playTownSound('guest');notify(`「これこれ。ありがとう！」 +${formatNumber(gain)} SUSHI`);}else notify('「今日は、'+names[count%3]+'の気分かな。」');}}><span className={`order-sushi sushi-${i}`} aria-hidden="true"/>{name}</button>)}</div><small>気が向いたときに。待たせてもペナルティはありません。</small><p className="guest-history">お届けしたひと皿 · {count}皿</p></div>;
}

function Customization({move,photo}:{move:(id:FacilityId)=>void;photo:()=>void}) {
  const town=useGameStore(s=>s.town), counts=useGameStore(s=>s.facilityCounts), configure=useGameStore(s=>s.configureTown);
  const [name,setName]=useState(town.name);
  const [saved,setSaved]=useState(false);
  const colors=['朱','藍','若葉'];
  return <div className="town-customize">
    <form onSubmit={e=>{e.preventDefault();const clean=name.trim();if(clean){configure({name:clean});setSaved(useGameStore.getState().town.name===clean);}}}><label htmlFor="town-name">お店の名前</label><div className="town-name-input"><input id="town-name" value={name} maxLength={20} required pattern="[^<>]+" onChange={e=>{setName(e.target.value);setSaved(false);}}/><button>保存</button></div>{saved && <small role="status">看板を掛け替えました。</small>}</form>
    {(['color','truckColor'] as const).map(key=><fieldset key={key}><legend>{key==='color'?'のれんの色':'トラックの色'}</legend><div className="town-swatches">{TOWN_COLORS.map((color,i)=><button key={color} className={`swatch-${color}`} aria-pressed={town[key]===color} onClick={()=>configure({[key]:color})}><span/>{colors[i]}{town[key]===color?' ✓':''}</button>)}</div></fieldset>)}
    <fieldset><legend>街の時間</legend><div className="town-options">{(['day','evening','rain'] as const).map((weather,i)=><button key={weather} aria-pressed={town.weather===weather} onClick={()=>configure({weather})}>{['晴れた昼','夕暮れ','雨の日'][i]}</button>)}</div></fieldset>
    <button className="town-bench-toggle" aria-pressed={town.bench} onClick={()=>configure({bench:!town.bench})}><TownSprite actors index={7}/><span>店先のベンチ<small>{town.bench?'猫も、ここがお気に入り。':'置くと、猫の居場所になります。'}</small></span><b>{town.bench?'片付ける':'置く'}</b></button>
    <fieldset><legend>施設のお引っ越し</legend><p>施設を選び、街の置きたい場所をタップ。入れ替えは無料です。</p><div className="town-move-list">{FACILITIES.filter((f,i)=>counts[f.id]>0||i===0).map(f=><button key={f.id} onClick={()=>move(f.id)}>{f.displayName}<span>↗</span></button>)}</div></fieldset>
    <button className="town-primary" onClick={photo}>街の記念写真を撮る</button>
  </div>;
}

export function GameScreen() {
  const phase=useGameStore(s=>s.endingPhase), level=useGameStore(anomalyLevel), counts=useGameStore(s=>s.facilityCounts), town=useGameStore(s=>s.town);
  const previous=useGameStore(s=>s.previousRun), previousTown=useGameStore(s=>s.previousTown);
  const playing=phase==='playing';
  const [sheet,setSheet]=useState<'facilities'|'customize'|'settings'|'guest'|'record'|null>(null);
  const [selected,setSelected]=useState<FacilityId|null>(null);
  const [moving,setMoving]=useState<FacilityId|null>(null);
  const [receipt,setReceipt]=useState<{id:FacilityId;serial:number;first:boolean}|null>(null);
  const [message,setMessage]=useState('');
  const [photo,setPhoto]=useState(false), [photoUrl,setPhotoUrl]=useState(''), [photoBusy,setPhotoBusy]=useState(false);
  const [undo,setUndo]=useState<{id:FacilityId;slot:number}|null>(null);
  const photoRoot=useRef<HTMLDivElement>(null);
  const messageTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const notify=(text:string)=>{setMessage(text);if(messageTimer.current)clearTimeout(messageTimer.current);messageTimer.current=setTimeout(()=>setMessage(''),4500);};
  useEffect(()=>()=>{if(messageTimer.current)clearTimeout(messageTimer.current);},[]);
  useEffect(()=>{
    const timers:ReturnType<typeof setTimeout>[]=[];
    const purchase=(event:Event)=>{
      timers.forEach(clearTimeout);timers.length=0;
      const data=(event as CustomEvent<{id:FacilityId;first:boolean}>).detail;
      setReceipt({...data,serial:Date.now()});setSelected(data.first?null:data.id);setSheet(null);
      const name=FACILITIES.find(f=>f.id===data.id)!.displayName;
      setMessage(data.first?`${name}が、街に仲間入り。`:`${name}を増設しました。`);
      if(data.id==='marine_food_plant'&&data.first) {
        setMessage('海洋プラントの水槽に、水が満ちていく。');
        timers.push(setTimeout(()=>setMessage('食材を積んで、お店へ出発！'),1200),setTimeout(()=>setMessage('初便が到着。今日のおすすめ、できました。'),4300));
      }
      timers.push(setTimeout(()=>{setReceipt(null);setMessage('');},6500));
    };
    window.addEventListener('sushi-loopy:town-purchase',purchase);
    return()=>{timers.forEach(clearTimeout);window.removeEventListener('sushi-loopy:town-purchase',purchase);};
  },[]);
  useEffect(()=>useGameStore.subscribe((state,old)=>{
    if ((state.endingPhase!==old.endingPhase || pendingSynchronization(state)!==pendingSynchronization(old)) && (state.endingPhase!=='playing' || pendingSynchronization(state))) {
      setSheet(null);setMoving(null);setPhoto(false);
    }
    if(state.previousRun!==old.previousRun){setSelected(null);setReceipt(null);setUndo(null);}
  }),[]);
  useEffect(()=>()=>{if(photoUrl)URL.revokeObjectURL(photoUrl);},[photoUrl]);
  const target=FACILITIES.find(f=>f.id===selected)??FACILITIES.find(f=>counts[f.id]===0)??FACILITIES[0];
  const takePhoto=async()=>{
    if(!photoRoot.current || photoBusy)return;
    setPhotoBusy(true);setPhotoUrl('');
    try{
      const {createTownPhoto}=await import('./townPhoto');
      const scene=photoRoot.current.querySelector<HTMLElement>('.town-world')!;
      const blob=await createTownPhoto(scene,town);
      setPhotoUrl(URL.createObjectURL(blob));
    }catch{notify('写真を作れませんでした。もう一度お試しください。');}finally{setPhotoBusy(false);}
  };
  const play=(kind:'truck'|'cat'|'chef'|'bubble'|'boat'|'guest')=>{
    if(kind==='guest'){setSheet('guest');return;}
    playTownSound(kind);
    const reduced=document.documentElement.dataset.motion==='off'||(document.documentElement.dataset.motion!=='on'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
    if(!reduced)photoRoot.current?.querySelector(`.town-${kind}`)?.animate([{transform:'translateY(0) rotate(0)'},{transform:'translateY(-9px) rotate(-8deg)'},{transform:'translateY(0) rotate(0)'}],{duration:500});
    notify({truck:'ぷっぷー！ 運転手が手を振ってくれた。',cat:town.bench?'のびー。今日も、お気に入りのベンチで。':'にゃ。店先の見回りは、まかせて。',chef:'へい、おまち！',bubble:'ぽん、きん。ひんやり澄んだ氷の音。',boat:'大漁！ サーモンの地層を、ひと箱。'}[kind]);
  };
  const openPhoto=()=>{setSheet(null);setMoving(null);setPhoto(true);setPhotoUrl('');};
  return <main className={`game-screen town-game phase-${phase} ${photo?'is-photographing':''}`} data-anomaly={level}>
    <div className="town-shell world-surface" inert={!playing}>
      <TownCounter openSettings={()=>setSheet('settings')}/>
      <section className="town-stage" aria-label="寿司の街">
        <div ref={photoRoot} className="town-photo-root"><TownScene counts={counts} town={town} selected={selected} receipt={receipt} moving={moving} frozen={photo} onSelect={id=>{setSelected(id);}} onMove={slot=>{if(moving){const index=FACILITIES.findIndex(f=>f.id===moving);setUndo({id:moving,slot:town.plots[index]});useGameStore.getState().moveFacility(moving,slot);setMoving(null);notify('お引っ越し完了。道もつながりました。');}}} onPlay={play}/></div>
        <div className="town-stage-heading"><span>わたしのスシルーピー</span><button aria-label="写真モードを開く" onClick={openPhoto}>▣ 写真</button></div>
        {message && <div key={message} className="town-message" role="status">{message}</div>}
        {moving ? <div className="town-move-hint"><strong>置きたい区画をタップ</strong><button onClick={()=>setMoving(null)}>やめる</button></div> : undo && <button className="town-undo" onClick={()=>{useGameStore.getState().moveFacility(undo.id,undo.slot);setUndo(null);notify('元の配置に戻しました。');}}>配置を元に戻す ↶</button>}
        {!photo && !moving && counts.craftsman===0 && <p className="town-first-hint">ひとつ握る。<br/><strong>ここから、あなたの街が育つ。</strong></p>}
      </section>
      <div className="town-bottom"><div className="town-next"><div className="town-next-caption"><span>{selected?'この施設を育てる':'つぎの景色'}</span>{selected && <button aria-label="施設の選択を解除" onClick={()=>setSelected(null)}>×</button>}</div><FacilityItem key={target.id} facility={target}/></div><NewsTicker/></div>
      <TownDock open={setSheet} active={playing && !sheet} photo={photo}/>
    </div>
    {photo && <div className="town-photo-controls" data-preserve-ui><button onClick={()=>{setPhoto(false);setPhotoUrl('');}}>街に戻る</button><button onClick={takePhoto} disabled={photoBusy}>{photoBusy?'写真を現像中…':'この景色を撮る'}</button>{photoUrl && <a href={photoUrl} download="sushi-loopy-town.png">写真を保存 ↓</a>}</div>}
    <Sheet open={sheet==='facilities'} name="facilities" title="お店を育てる" close={()=>setSheet(null)}><FacilityList/><ContentPanel/></Sheet>
    <Sheet open={sheet==='customize'} name="customize" title="わたしの街にする" close={()=>setSheet(null)}>{sheet==='customize' && <Customization move={id=>{setMoving(id);setSheet(null);}} photo={openPhoto}/>}</Sheet>
    <Sheet open={sheet==='guest'} name="guest" title="今日のひと皿" close={()=>setSheet(null)}><GuestOrder notify={notify}/><p className="guest-answer" role="status">{sheet==='guest'?message:''}</p></Sheet>
    <Sheet open={sheet==='settings'} name="settings" title="記録と設定" close={()=>setSheet(null)}><SoundControl/><MotionControl/><p className="town-help">街はドラッグ・二本指で拡大。「にぎる」は長押しでも。街と進行は自動保存されます。</p>{previous && <button className="town-primary" onClick={()=>setSheet('record')}>前回育てた街を見る</button>}<PreviousRunRecord/><SaveTools/><FacilityCheckpointTools/><details className="town-debug"><summary>検証用の操作</summary><DebugTools/></details><small className="town-version">Sushi Loopy · Town 1.0 · Save 6</small></Sheet>
    <Sheet open={sheet==='record'} name="record" title="前回のスシルーピー" close={()=>setSheet(null)}>{previous && <><div className="town-record"><TownScene counts={previous.facilityCounts} town={previousTown??createTown()} frozen/></div><p className="town-record-caption">{previousTown?.name??'前回のお店'} · {formatNumber(previous.totalSushiEarned)} SUSHI を作った街</p></>}</Sheet>
    <WorldDamage key={phase}/><Synchronization/>
    {playing && !photo && <AchievementToast/>}
  </main>;
}

