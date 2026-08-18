export const UNFOLLOW_TRIGGER_THRESHOLD = 5

export function shouldPromptUnfollow(nextCount: number): boolean {
  return Number.isFinite(nextCount) && nextCount > 0 && nextCount % UNFOLLOW_TRIGGER_THRESHOLD === 0
}
