export type UpFollowSort = "recent" | "frequent"

export interface UpSpaceVideo {
  bvid: string
  aid: string
  title: string
  cover: string
  durationText: string
  playCount: number
  danmakuCount: number
  publishAt: number
  /** 卡片上展示：为何选中这条视频 */
  selectionLabel: string
}

export interface UpCreator {
  mid: string
  name: string
  face: string
  sign: string
  followerCount: number
  followedAt: number
  videos: UpSpaceVideo[]
  videosLoading: boolean
  videosError: string | null
}
