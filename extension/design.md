# ReadFlow 纸感画廊设计系统

状态：Locked · 2026-08-02

## 设计方向

- 类型：Editorial（编辑画廊）
- 产品结构：Workbench；长内容页使用 Long Document；营销页延续 Workbench 的纸张与装帧语言。
- 气质坐标：light / humanist-sans / warm。
- 核心意象：一张温暖的纸、一层深墨字、一枚克制的朱砂印。视频封面像装裱在索引卡上的藏品，工具像编辑桌上的裁纸器与标签。
- 不改变信息结构、五列密度、操作顺序或功能逻辑；精致感来自比例、纸色、细线、字重和动效，不来自额外装饰。

## 颜色

- Paper `oklch(96.5% 0.018 82)`：页面底色。
- Paper 2 `oklch(94% 0.022 80)`：控件、次级面。
- Paper 3 `oklch(90.5% 0.026 78)`：选中前的安静填充。
- Ink `oklch(23% 0.032 252)`：标题与主要信息。
- Ink 2 `oklch(36% 0.028 250)`：正文。
- Rule `oklch(77% 0.024 78)`：装帧线与边界。
- Vermilion `oklch(52% 0.18 35)`：仅用于主要决策、当前状态与键盘焦点；控制在可视面积 5% 左右。
- 暗色模式保留同一朱砂色相，纸张反转为暖墨黑，避免冷蓝玻璃感。

## 字体与排版

- 展示标题：ReadFlow Shanggu，650，紧凑字距；用于页面名、分组标题与设置标题。
- 正文：ReadFlow Onest + ReadFlow Shanggu，400–600。
- 元数据：ReadFlow Onest，启用 tabular numerals；字号小但对比明确，不用过度灰化。
- 标题依靠字重、间距与细线建立层级，不依赖渐变文字、全大写或彩色发光。

## 形状与空间

- 4 / 8 / 12 / 16 / 24 / 40 / 64 / 96 的紧凑编辑尺度。
- 卡片圆角 10px，输入与分段控件圆角 4px，弹窗圆角 14px；头像、开关滑块和计数点允许完全圆形。
- 卡片是“装裱单元”：一层边框、一张封面、一块说明、一条分段操作栏。禁止卡中再套无意义卡片。
- 阴影只表达层级变化，默认以细线为主；悬停仅上移 1px。

## 动效

- 微交互 100ms，常规 180ms，入场 280ms，复杂过渡 420ms。
- 进入采用 `expo.out`：8px 位移、0.99 缩放，快速收束；退出保持更短。
- 排序重排使用 FLIP，300ms，不弹跳。
- 按下只做 1px 下沉或 0.985 缩放；不使用 overshoot、发光扩散或摇摆。
- `prefers-reduced-motion` 下只保留最长 150ms 的透明度过渡。

## 交互与文案

- 主操作沿用产品现有短动词：“想看”“帮我读”“不想看”。
- CTA 直白、低噪声，不添加营销式感叹号。
- 所有键盘可操作控件必须有立即出现的 2px 朱砂焦点环。
- 禁用态保持可辨认，透明度 0.5；加载态不得改变控件几何尺寸。

## 页面一致性

### 共享

- 纸色、墨色、朱砂色、字体、细线、输入控件、分段控件、焦点态、短动效。
- 顶栏与右侧 Dock 使用矩形编辑工具语言，不使用悬浮玻璃胶囊。

### 允许不同

- 首页保留五列内容画廊。
- 资料库可在已有的网格/列表信息密度之间切换，但沿用同一装裱卡片。
- 设置页采用 248px 左侧作用域导航 + 右侧单一内容区；分类固定为首页、动态、跨页面、AI、数据入口，并在右侧标题旁明确显示生效范围。一次只显示一个作用域，内部用分隔线组织。窄屏时左栏收为顶部横向分类条。
- 番剧页的海报比例可以不同，但状态、操作与元数据仍用同一套令牌。

## Exports

`tokens.css` 是唯一真源；应用入口在 `fonts.scss` 与视觉样式之前导入它。

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(96.5% 0.018 82);
  --color-paper-2: oklch(94% 0.022 80);
  --color-paper-3: oklch(90.5% 0.026 78);
  --color-ink: oklch(23% 0.032 252);
  --color-ink-2: oklch(36% 0.028 250);
  --color-rule: oklch(77% 0.024 78);
  --color-rule-2: oklch(86% 0.022 80);
  --color-muted: oklch(48% 0.018 82);
  --color-accent: oklch(52% 0.18 35);
  --color-focus: oklch(36% 0.17 32);
  --font-display: "ReadFlow Shanggu", "ReadFlow Onest", sans-serif;
  --font-body: "ReadFlow Onest", "ReadFlow Shanggu", sans-serif;
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2.5rem;
  --radius-card: 0.625rem;
  --radius-input: 0.25rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(96.5% 0.018 82)", "$type": "color" },
    "paper-2": { "$value": "oklch(94% 0.022 80)", "$type": "color" },
    "paper-3": { "$value": "oklch(90.5% 0.026 78)", "$type": "color" },
    "ink": { "$value": "oklch(23% 0.032 252)", "$type": "color" },
    "ink-2": { "$value": "oklch(36% 0.028 250)", "$type": "color" },
    "rule": { "$value": "oklch(77% 0.024 78)", "$type": "color" },
    "accent": { "$value": "oklch(52% 0.18 35)", "$type": "color" },
    "focus": { "$value": "oklch(36% 0.17 32)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "ReadFlow Shanggu, ReadFlow Onest, sans-serif", "$type": "fontFamily" },
    "body": { "$value": "ReadFlow Onest, ReadFlow Shanggu, sans-serif", "$type": "fontFamily" }
  },
  "duration": {
    "micro": { "$value": "100ms", "$type": "duration" },
    "short": { "$value": "180ms", "$type": "duration" },
    "long": { "$value": "420ms", "$type": "duration" }
  }
}
```

### shadcn/ui variables

```css
:root {
  --background: 96.5% 0.018 82;
  --foreground: 23% 0.032 252;
  --card: 94% 0.022 80;
  --card-foreground: 23% 0.032 252;
  --popover: 94% 0.022 80;
  --popover-foreground: 23% 0.032 252;
  --primary: 52% 0.18 35;
  --primary-foreground: 97% 0.016 82;
  --secondary: 90.5% 0.026 78;
  --secondary-foreground: 36% 0.028 250;
  --muted: 86% 0.022 80;
  --muted-foreground: 48% 0.018 82;
  --accent: 52% 0.18 35;
  --accent-foreground: 97% 0.016 82;
  --destructive: 50% 0.18 25;
  --destructive-foreground: 97% 0.016 82;
  --border: 77% 0.024 78;
  --input: 77% 0.024 78;
  --ring: 36% 0.17 32;
  --radius: 0.625rem;
}
```
