export type AnimeTrackingKind = "bangumi" | "pgc" | "ugc" | "video"
export type AnimeAirStatus = "airing" | "completed" | "upcoming" | "unknown"

export interface AnimeTrackingItem {
  id: string
  kind: AnimeTrackingKind
  lookupId: string
  sourceUrl: string
  title: string
  cover: string
  author: string
  authorUrl: string
  latestEpisodeTitle: string
  latestEpisodeUrl: string
  latestEpisodeKey: string
  episodeCount: number
  updatedAt: number
  checkedAt: number
  seenEpisodeKey: string
  queryTitle: string
  bangumiSubjectId: number
  totalEpisodes: number
  airedEpisodes: number
  airStatus: AnimeAirStatus
  airDate: string
  nextEpisodeDate: string
  summary: string
}
