import { drawErrorDialog } from '../../src/game/rendering/systemFailure.ts';
// Shared cue times keep every simulated window and error tone on the same clock.
export const CRASH = 17.3;
export const BLUE = 18.45;
export const HOLD = 18.68;
export const IMPACT = 20.6;
export const DURATION = 42;
export const WORLD_DELAY = 8;
export const STORM = 10.4;
const random=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export const DIALOGS = [
  {at:7.15,kind:0,x:900,y:245},
  {at:8.85,kind:1,x:650,y:390},
  {at:9.6,kind:2,x:1020,y:510},
  {at:10.35,kind:3,x:380,y:270},
  ...Array.from({length:600},(_,i)=>{
    const group=Math.floor(i/12),step=i%12;
    return {at:STORM+6.65*(i/599)**.8,kind:1+group%5,scale:.5+random(group+281)*.6,
      x:-80+random(group+42)*1660+step*14,y:-45+random(group+96)*880+step*12};
  }),
  {at:15.65,kind:3,x:635,y:415},
  {at:16.95,kind:3,x:600,y:370},
].sort((a,b)=>a.at-b.at);

export function failureState(t) {
  const phase=t>=IMPACT?'collapse':t>=HOLD?'hold':t>=BLUE?'blue':t>=CRASH?'crash':t>=DIALOGS[0].at?'dialogs':'normal';
  return {phase,dialogs:phase==='dialogs'?DIALOGS.filter(d=>d.at<=t).length:0};
}

/** Everything here is drawn inside the movie canvas. No windows, alerts or OS calls. */
export function drawFailure(ctx,t) {
  const state=failureState(t);
  if(state.phase==='normal'||state.phase==='collapse')return;
  ctx.save();ctx.globalAlpha=1;ctx.textAlign='left';ctx.textBaseline='alphabetic';
  function text(s,x,y,size=22,color='#20262c') {
    ctx.fillStyle=color;ctx.font=`${size}px "Yu Gothic",Arial,sans-serif`;ctx.fillText(s,x,y);
  }
  function button(s,x,y,w=120,active=false) {
    ctx.fillStyle=active?'#dbe7f3':'#e8e8e8';ctx.fillRect(x,y,w,38);
    ctx.strokeStyle=active?'#437aad':'#989fa5';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,37);
    ctx.textAlign='center';text(s,x+w/2,y+26,18);ctx.textAlign='left';
  }
  function cursor(x,y) {
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2,y+28);ctx.lineTo(x+9,y+21);ctx.lineTo(x+16,y+34);
    ctx.lineTo(x+22,y+30);ctx.lineTo(x+15,y+18);ctx.lineTo(x+26,y+17);ctx.closePath();
    ctx.fillStyle='#f3f3ee';ctx.strokeStyle='#17252b';ctx.lineWidth=2;ctx.fill();ctx.stroke();
  }
  function dialog(d) { drawErrorDialog(ctx,d.kind,Math.round(d.x),Math.round(d.y),d.scale??1); }
  if(state.phase==='dialogs') {
    // A readable contradiction first; only then does the desktop become unmanageable.
    const count=state.dialogs;
    for(let i=0;i<count;i++) {
      if(i===0&&t>=8.6)continue;
      dialog(DIALOGS[i],i);
    }
    if(t<8.6) {
      const p=Math.max(0,Math.min(1,(t-7.75)/.48)),e=p*p*(3-2*p);
      cursor(1560+(1360-1560)*e,780+(412-780)*e);
      if(t>8.25&&t<8.38){ctx.strokeStyle='#5c9ca9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(1360,412,15,0,Math.PI*2);ctx.stroke();}
    }else cursor(1173,535);
  } else if(state.phase==='crash') {
    ctx.fillStyle='#e0e4e6';ctx.fillRect(0,0,1920,1080);
    ctx.fillStyle='#202b34';ctx.fillRect(0,0,1920,48);text('ブラウザー — 応答なし',58,32,17,'#e0e6e7');
    text('−       □       ×',1740,31,20,'#bec6cc');
    ctx.fillStyle='#c4ccd1';ctx.fillRect(0,48,1920,53);ctx.fillStyle='#e9ecee';ctx.fillRect(165,58,1480,33);
    text('←    →    ×',27,82,20,'#68747d');text('about:blank',187,81,17,'#6a757f');
    ctx.strokeStyle='#65717c';ctx.lineWidth=5;ctx.strokeRect(525,325,72,90);
    ctx.fillStyle='#65717c';ctx.fillRect(541,351,7,8);ctx.fillRect(573,351,7,8);
    ctx.beginPath();ctx.moveTo(542,391);ctx.lineTo(551,382);ctx.lineTo(569,382);ctx.lineTo(579,391);ctx.stroke();
    text('このページで問題が発生しました。',525,496,38,'#333e48');
    text('このページは応答していません。',527,550,23,'#68737b');
    text('エラーコード: RESULT_CODE_HUNG',527,607,17,'#7c8790');
    button('再読み込み',527,663,172);cursor(1173,535);
  } else if(state.phase==='blue') {
    ctx.fillStyle='#14518c';ctx.fillRect(0,0,1920,1080);
    text(':(',260,330,142,'#f0f5f8');
    text('問題が発生したため、デバイスを再起動する必要があります。',270,462,34,'#f0f5f8');
    text('エラー情報を収集しています。',270,525,30,'#f0f5f8');
    text('0% 完了',270,624,30,'#f0f5f8');
    text('停止コード: CRITICAL_PROCESS_DIED',270,774,18,'#d1e3f2');
  } else if(state.phase==='hold') {
    ctx.globalCompositeOperation='saturation';ctx.fillStyle='#777';ctx.fillRect(0,0,1920,1080);
    ctx.globalCompositeOperation='source-over';ctx.fillStyle='#03090d73';ctx.fillRect(0,0,1920,1080);
    cursor(1173,535);
  }
  ctx.restore();
}
