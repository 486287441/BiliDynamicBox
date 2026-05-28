export interface DynamicItem {
  id_str?: string
  type?: string
  modules?: {
    module_author?: {
      mid?: number | string
      name?: string
      pub_ts?: number
      pub_time?: string
    }
    module_dynamic?: {
      major?: {
        type?: string
        archive?: {
          aid?: string | number
          bvid?: string
          title?: string
          cover?: string
          jump_url?: string
        }
      }
    }
  }
}

export interface VideoDynamicCard {
  dynamicId: string
  videoAid: string
  videoBvid: string
  title: string
  cover: string
  upMid: string
  upName: string
  publishAt: number
}

export interface DateGroup {
  key: string
  label: string
  items: VideoDynamicCard[]
}
