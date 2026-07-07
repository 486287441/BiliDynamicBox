import type { UpSpaceVideo } from "./up-filter-types"

export interface SpaceArchiveInput {
  bvid: string
  aid: string
  title: string
  cover: string
  durationText: string
  playCount: number
  danmakuCount: number
  publishAt: number
}

const RECENT_RANK_LABELS = ["最新发布", "次新发布", "第三新发布", "第四新发布", "第五新发布"]

function toVideo(archive: SpaceArchiveInput, selectionLabel: string): UpSpaceVideo {
  return {
    bvid: archive.bvid,
    aid: archive.aid,
    title: archive.title,
    cover: archive.cover,
    durationText: archive.durationText,
    playCount: archive.playCount,
    danmakuCount: archive.danmakuCount,
    publishAt: archive.publishAt,
    selectionLabel,
  }
}

function videoKey(archive: SpaceArchiveInput): string {
  return archive.bvid || archive.aid
}

export function buildUpVideoBundle(recentArchives: SpaceArchiveInput[]): UpSpaceVideo[] {
  if (recentArchives.length === 0) {
    return []
  }

  const result: UpSpaceVideo[] = []
  const seen = new Set<string>()

  function append(archive: SpaceArchiveInput | undefined, selectionLabel: string): void {
    if (!archive || result.length >= 5) {
      return
    }
    const key = videoKey(archive)
    if (!key || seen.has(key)) {
      return
    }
    seen.add(key)
    result.push(toVideo(archive, selectionLabel))
  }

  const sortedByPlay = [...recentArchives].sort((left, right) => right.playCount - left.playCount)
  append(sortedByPlay[0], "近期播放最高")

  const sortedByPublish = [...recentArchives].sort((left, right) => right.publishAt - left.publishAt)
  for (let index = 0; index < RECENT_RANK_LABELS.length && result.length < 5; index += 1) {
    append(sortedByPublish[index], RECENT_RANK_LABELS[index])
  }

  return result
}
