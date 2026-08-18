const DATE_VALUE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function normalizePublishAfterDate(value: unknown): string {
  if (typeof value !== "string") return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  const match = DATE_VALUE_PATTERN.exec(trimmed)
  if (!match) return ""
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return ""
  return trimmed
}

export function getPublishAfterTimestamp(value: string): number {
  const normalized = normalizePublishAfterDate(value)
  if (!normalized) return 0
  const [year, month, day] = normalized.split("-").map(Number)
  return Math.floor(new Date(year, month - 1, day, 0, 0, 0, 0).getTime() / 1000)
}
