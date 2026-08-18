export function formatCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0"
  }
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1).replace(/\.0$/, "")}亿`
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\.0$/, "")}万`
  }
  return String(value)
}
