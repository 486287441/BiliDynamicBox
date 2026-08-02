export type ContentCategory = "work" | "entertainment"
export type ContentCategoryFilter = "all" | ContentCategory

export const CONTENT_CATEGORY_FILTER_LABELS: Record<ContentCategoryFilter, string> = {
  all: "全部",
  work: "知识",
  entertainment: "娱乐",
}
