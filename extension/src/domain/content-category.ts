export type ContentCategory = "work" | "entertainment"
export type ContentCategoryFilter = "all" | ContentCategory

export const CONTENT_CATEGORY_FILTER_LABELS: Record<ContentCategoryFilter, string> = {
  all: "全部",
  work: "知识",
  entertainment: "娱乐",
}

const ENTERTAINMENT_KEYWORDS = [
  "娱乐", "搞笑", "游戏", "电竞", "综艺", "电影", "影视", "音乐", "舞蹈", "动漫", "番剧", "鬼畜", "萌宠", "直播", "开箱", "日常", "美食", "旅行",
]

const KNOWLEDGE_KEYWORDS = [
  "知识", "科普", "教程", "学习", "技术", "编程", "开发", "人工智能", "ai", "科学", "历史", "财经", "新闻", "分析", "解读", "纪录片", "产品", "设计", "职场", "法律", "医学", "系统",
]

export function inferContentCategory(card: { title: string; tag?: string }): ContentCategory {
  const text = `${card.title} ${card.tag ?? ""}`.toLocaleLowerCase()
  if (ENTERTAINMENT_KEYWORDS.some((keyword) => text.includes(keyword))) return "entertainment"
  if (KNOWLEDGE_KEYWORDS.some((keyword) => text.includes(keyword))) return "work"
  // Unclear titles stay in the knowledge/productivity stream until AI classification is available.
  return "work"
}
