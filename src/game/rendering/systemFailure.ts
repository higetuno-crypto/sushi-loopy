import { BROWSER_CRASH_AT_MS, BLUE_SCREEN_AT_MS, ERROR_DIALOG_TIMES, ERROR_HOLD_AT_MS, ERROR_STORM_AT_MS, FRACTURE_AT_MS } from '../logic/loop';

export const ERROR_MESSAGES = [
  ['同期エラー', '同期できません。', 'サーバーとの接続が切断されました。'],
  ['アプリケーション エラー', 'メモリを参照できませんでした。', 'メモリが "read" になることはできませんでした。'],
  ['ファイル システム エラー', '参照できませんでした。', '指定されたファイルまたはパスが見つかりません。'],
  ['プログラムの保護', 'このプログラムをブロックしますか？', 'このアプリケーションは応答していません。'],
  ['ネットワーク エラー', '同期先に接続できません。', '接続がタイムアウトしました。もう一度実行してください。'],
  ['システム エラー', '予期しないエラーが発生しました。', '操作を完了できませんでした。'],
];
const sprites: HTMLCanvasElement[] = [];
const random = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** The demo and game share cached window artwork; nothing opens outside the canvas. */
export function drawErrorDialog(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, scale = 1) {
  if (!sprites[kind]) {
    const w = kind === 3 ? 650 : 580, h = 204;
    const sprite = document.createElement('canvas'); sprite.width = w + 48; sprite.height = h + 48;
    const ink = sprite.getContext('2d')!;
    ink.translate(24, 16);
    const text = (s: string, x: number, y: number, size = 22, color = '#20262c') => {
      ink.fillStyle = color; ink.font = `${size}px "Yu Gothic",Arial,sans-serif`; ink.fillText(s, x, y);
    };
    const button = (s: string, x: number, width = 120) => {
      ink.fillStyle = '#e8e8e8'; ink.fillRect(x, h - 56, width, 38);
      ink.strokeStyle = '#989fa5'; ink.lineWidth = 1; ink.strokeRect(x + .5, h - 55.5, width - 1, 37);
      ink.textAlign = 'center'; text(s, x + width / 2, h - 30, 18); ink.textAlign = 'left';
    };
    ink.shadowColor = '#00000085'; ink.shadowBlur = 20; ink.shadowOffsetY = 8;
    ink.fillStyle = '#ededeb'; ink.fillRect(0, 0, w, h); ink.shadowBlur = 0; ink.shadowOffsetY = 0;
    ink.strokeStyle = '#bcc5cd'; ink.lineWidth = 2; ink.strokeRect(1, 1, w - 2, h - 2);
    const gradient = ink.createLinearGradient(0, 0, w, 0); gradient.addColorStop(0, '#17374f'); gradient.addColorStop(1, '#3d687f');
    ink.fillStyle = gradient; ink.fillRect(2, 2, w - 4, 34);
    const [title, body, detail] = ERROR_MESSAGES[kind]; text(title, 13, 25, 16, '#f8f9f5');
    ink.fillStyle = '#bb6457'; ink.fillRect(w - 34, 7, 24, 23); text('×', w - 30, 25, 21, '#fff');
    ink.fillStyle = kind === 3 ? '#bd8733' : '#ba5146'; ink.beginPath(); ink.arc(40, 85, 20, 0, Math.PI * 2); ink.fill();
    ink.textAlign = 'center'; text(kind === 3 ? '!' : '×', 40, 93, 28, '#fff'); ink.textAlign = 'left';
    text(body, 78, 83, kind === 3 ? 24 : 22); text(detail, 78, 117, 14, '#58616a');
    text(['0x80072EE2', '0xc0000005', '0x80070002', '0x800704EC', '0x8007274C', '0x80004005'][kind], 18, 181, 12, '#7a8389');
    if (kind === 3) { button('ブロック', w - 284, 124); button('許可', w - 144, 124); }
    else button(kind === 4 ? '再試行' : 'OK', w - 142);
    sprites[kind] = sprite;
  }
  const sprite = sprites[kind];
  ctx.drawImage(sprite, x - 24 * scale, y - 16 * scale, sprite.width * scale, sprite.height * scale);
}

export const ERROR_DIALOGS: { at: number; kind: number; x: number; y: number; scale: number; step?: number }[] = [
  ...ERROR_DIALOG_TIMES.map((at, kind) => ({ at, kind, x: .5 + (kind % 2 ? -.08 : .08), y: .3 + kind * .07, scale: 1 })),
  ...Array.from({ length: 600 }, (_, i) => {
    const group = Math.floor(i / 12), step = i % 12;
    return { at: ERROR_STORM_AT_MS + 3_650 * (i / 599) ** .8, kind: 1 + group % 5,
      x: random(group + 42), y: random(group + 96), scale: .5 + random(group + 281) * .6, step };
  }),
  { at: 5_700, kind: 3, x: .5, y: .45, scale: 1 },
  { at: 6_600, kind: 1, x: .45, y: .4, scale: 1 },
].sort((a, b) => a.at - b.at);

export function systemFailureState(ms: number) {
  const phase = ms >= FRACTURE_AT_MS ? 'done' : ms >= ERROR_HOLD_AT_MS ? 'hold' : ms >= BLUE_SCREEN_AT_MS ? 'blue' : ms >= BROWSER_CRASH_AT_MS ? 'crash' : ms >= ERROR_DIALOG_TIMES[0] ? 'dialogs' : 'normal';
  return { phase, dialogs: phase === 'dialogs' ? ERROR_DIALOGS.filter(d => d.at <= ms).length : 0 };
}

export function drawSystemFailure(ctx: CanvasRenderingContext2D, ms: number, width: number, height: number, reduced: boolean) {
  const state = systemFailureState(ms);
  ctx.clearRect(0, 0, width, height);
  if (state.phase === 'normal' || state.phase === 'done') return state;
  ctx.save();
  // Keep the first messages readable on narrow phones, without stretching the window artwork.
  const scale = Math.min(1, width / 640); ctx.scale(scale, scale);
  const w = width / scale, h = height / scale;
  if (state.phase === 'dialogs') {
    if (reduced) drawErrorDialog(ctx, 1, (w - 580) / 2, Math.max(75, h * .32));
    else for (let i = 0; i < state.dialogs; i++) {
      const d = ERROR_DIALOGS[i];
      const step = d.step ?? 0;
      drawErrorDialog(ctx, d.kind, d.x * Math.max(0, w - 650 * d.scale) + step * 14, d.y * (h - 250) + step * 12, d.scale);
    }
  } else if (state.phase === 'crash' || (reduced && state.phase === 'blue')) {
    ctx.fillStyle = '#e9ecee'; ctx.fillRect(0, 0, w, h);
    const x = Math.max(36, (w - 640) / 2), y = Math.max(150, h * .35);
    ctx.fillStyle = '#65717c'; ctx.font = '64px monospace'; ctx.fillText(':(', x, y);
    ctx.fillStyle = '#333e48'; ctx.font = '28px "Yu Gothic",sans-serif'; ctx.fillText('このページは応答していません。', x, y + 70);
    ctx.fillStyle = '#68737b'; ctx.font = '20px "Yu Gothic",sans-serif'; ctx.fillText('ページの応答を待つか、終了してください。', x, y + 120);
    ctx.font = '16px monospace'; ctx.fillText('エラーコード: RESULT_CODE_HUNG', x, y + 170);
  } else if (state.phase === 'blue') {
    ctx.fillStyle = '#14518c'; ctx.fillRect(0, 0, w, h);
    const x = Math.max(36, (w - 740) / 2), y = Math.max(150, h * .3);
    ctx.fillStyle = '#f0f5f8'; ctx.font = '100px sans-serif'; ctx.fillText(':(', x, y);
    ctx.font = '26px "Yu Gothic",sans-serif';
    ctx.fillText('問題が発生したため、デバイスを', x, y + 80);
    ctx.fillText('再起動する必要があります。', x, y + 120);
    ctx.font = '22px "Yu Gothic",sans-serif'; ctx.fillText('エラー情報を収集しています。', x, y + 185);
    ctx.fillText('0% 完了', x, y + 245); ctx.font = '16px monospace'; ctx.fillText('停止コード: CRITICAL_PROCESS_DIED', x, y + 315);
  } else {
    ctx.fillStyle = '#03090d73'; ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
  return state;
}
