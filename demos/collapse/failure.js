// Shared cue times keep every simulated window and error tone on the same clock.
export const CRASH = 17.3;
export const BLUE = 18.45;
export const HOLD = 18.68;
export const IMPACT = 20.6;
export const DURATION = 42;
export const WORLD_DELAY = 8;
const random=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export const DIALOGS = [
  {at:7.15,kind:0,x:900,y:245},
  {at:8.85,kind:1,x:650,y:390},
  {at:9.6,kind:2,x:1020,y:510},
  {at:10.35,kind:3,x:380,y:270},
  ...Array.from({length:72},(_,i)=>({at:11+5.8*(i/71)**.72,kind:1+i%5,
    x:30+random(i+42)*1260,y:75+random(i+96)*720})),
  {at:15.65,kind:3,x:635,y:415},
  {at:16.95,kind:3,x:600,y:370},
].sort((a,b)=>a.at-b.at);
const messages = [
  ['鮮度同期サービス','メモリを参照しました。','鮮度同期を続行します。'],
  ['SushiLoopy.exe — アプリケーション エラー','メモリを参照できませんでした。','0x00000001 のメモリにアクセスできません。'],
  ['メモリ参照エラー','参照できませんでした。','同じメモリが、すでに参照されています。'],
  ['プログラムの保護','このプログラムをブロックしますか？','SushiLoopy.exe は応答していません。'],
  ['鮮度同期サービス — 応答なし','同期先が見つかりません。','再試行しています...'],
  ['回復処理エラー','エラーの報告中にエラーが発生しました。','ERROR_RECURSIVE_REFERENCE'],
];

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
  function dialog(d,index) {
    const x=Math.round(d.x),y=Math.round(d.y),w=d.kind===3?650:580,h=204;
    const [title,body,detail]=messages[d.kind];
    ctx.shadowColor='#00000085';ctx.shadowBlur=20;ctx.shadowOffsetY=8;
    ctx.fillStyle='#ededeb';ctx.fillRect(x,y,w,h);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.strokeStyle='#bcc5cd';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2);
    const gradient=ctx.createLinearGradient(x,y,x+w,y);gradient.addColorStop(0,'#17374f');gradient.addColorStop(1,'#3d687f');
    ctx.fillStyle=gradient;ctx.fillRect(x+2,y+2,w-4,34);text(title,x+13,y+25,16,'#f8f9f5');
    ctx.fillStyle='#bb6457';ctx.fillRect(x+w-34,y+7,24,23);text('×',x+w-30,y+25,21,'#fff');
    const cx=x+40,cy=y+85;
    ctx.fillStyle=d.kind===0?'#4c8b9b':d.kind===3?'#bd8733':'#ba5146';
    ctx.beginPath();ctx.arc(cx,cy,20,0,Math.PI*2);ctx.fill();
    ctx.textAlign='center';text(d.kind===0?'i':d.kind===3?'!':'×',cx,cy+8,28,'#fff');ctx.textAlign='left';
    text(body,x+78,y+83,d.kind===3?24:22);text(detail,x+78,y+117,14,'#58616a');
    if(index>3)text(`0x${(0x0000ffff+index*4096).toString(16).padStart(8,'0')}`,x+18,y+181,12,'#7a8389');
    if(d.kind===3){button('ブロック',x+w-284,y+h-56,124,true);button('許可',x+w-144,y+h-56,124);}
    else button(d.kind===4?'再試行':'OK',x+w-142,y+h-56,120,d.kind===0);
  }
  if(state.phase==='dialogs') {
    // A readable contradiction first; only then does the desktop become unmanageable.
    const count=state.dialogs;
    for(let i=0;i<count;i++) {
      if(i===0&&t>=8.6)continue;
      dialog(DIALOGS[i],i);
    }
    if(t>15.65&&t<16.95)dialog({kind:3,x:635,y:415},count);
    if(t<8.6) {
      const p=Math.max(0,Math.min(1,(t-7.75)/.48)),e=p*p*(3-2*p);
      cursor(1560+(1360-1560)*e,780+(412-780)*e);
      if(t>8.25&&t<8.38){ctx.strokeStyle='#5c9ca9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(1360,412,15,0,Math.PI*2);ctx.stroke();}
    }else cursor(1173,535);
  } else if(state.phase==='crash') {
    ctx.fillStyle='#e0e4e6';ctx.fillRect(0,0,1920,1080);
    ctx.fillStyle='#202b34';ctx.fillRect(0,0,1920,48);text('Sushi Loopy — 応答なし',58,32,17,'#e0e6e7');
    text('−       □       ×',1740,31,20,'#bec6cc');
    ctx.fillStyle='#c4ccd1';ctx.fillRect(0,48,1920,53);ctx.fillStyle='#e9ecee';ctx.fillRect(165,58,1480,33);
    text('←    →    ×',27,82,20,'#68747d');text('sushi-loopy.local',187,81,17,'#6a757f');
    ctx.strokeStyle='#65717c';ctx.lineWidth=5;ctx.strokeRect(525,325,72,90);
    ctx.fillStyle='#65717c';ctx.fillRect(541,351,7,8);ctx.fillRect(573,351,7,8);
    ctx.beginPath();ctx.moveTo(542,391);ctx.lineTo(551,382);ctx.lineTo(569,382);ctx.lineTo(579,391);ctx.stroke();
    text('このページで問題が発生しました。',525,496,38,'#333e48');
    text('Sushi Loopy が応答を停止しました。',527,550,23,'#68737b');
    text('エラーコード: WORLD_PROCESS_UNRESPONSIVE',527,607,17,'#7c8790');
    button('再読み込み',527,663,172);cursor(1173,535);
  } else if(state.phase==='blue') {
    ctx.fillStyle='#14518c';ctx.fillRect(0,0,1920,1080);
    text(':(',260,330,142,'#f0f5f8');
    text('問題が発生したため、世界を再起動する必要があります。',270,462,34,'#f0f5f8');
    text('エラー情報を収集しています。',270,525,30,'#f0f5f8');
    text('0% 完了',270,624,30,'#f0f5f8');
    text('停止コード: FRESHNESS_SYNC_FAILURE',270,774,18,'#d1e3f2');
  } else if(state.phase==='hold') {
    ctx.globalCompositeOperation='saturation';ctx.fillStyle='#777';ctx.fillRect(0,0,1920,1080);
    ctx.globalCompositeOperation='source-over';ctx.fillStyle='#03090d73';ctx.fillRect(0,0,1920,1080);
    cursor(1173,535);
  }
  ctx.restore();
}
