const formatter = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 });
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '上限';
  if (value >= 1e12) return `${formatter.format(value / 1e12)}兆`;
  if (value >= 1e8) return `${formatter.format(value / 1e8)}億`;
  if (value >= 1e4) return `${formatter.format(value / 1e4)}万`;
  return formatter.format(value);
}
export function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  return `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(Math.floor(ms / 1000) % 60).toString().padStart(2, '0')}`;
}
