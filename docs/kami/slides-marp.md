---
marp: true
theme: kami
size: 280mm 158mm
paginate: true
footer: "BiliDynamicBox"
---

<!-- _class: cover -->
<!-- _paginate: false -->
<!-- _footer: "" -->

# BiliDynamicBox

<div class="sub">B 站动态 · 收件箱式视频流</div>
<div class="meta">Markdown 演示稿 · 2026.05</div>

---

<span class="eyebrow">01 · 问题</span>

## 原生动态页让用户在混排时间线里做观看决策

<p class="lead">视频、图片、文字同屏出现，扫读成本高；稍后再看与屏蔽分散在单条菜单里。</p>

<div class="c2">

<div>

### 已定目标

- quick_filter：先降噪
- 仅 `t.bilibili.com`
- 点击为主，toast 反馈

</div>

<div>

### 成功时用户得到

- 稍后再看清单
- 不想看过滤可持续
- 按日分组处理更新

</div>

</div>

---

<span class="eyebrow">02 · 产品</span>

## 收件箱只呈现视频动态，并按今天 / 昨天 / 日期分组

<table class="t2x2">
<tr>
<td>

<div class="mt"><span class="ml">想看</span></div>

加入 B 站稍后再看；使用浏览器登录 Cookie，无需 API Key。

</td>
<td>

<div class="mt"><span class="ml">不想看</span></div>

移入垃圾箱；刷新后该条不再出现；顶部工具栏可恢复。

</td>
</tr>
<tr>
<td>

<div class="mt"><span class="ml">范围</span></div>

仅隐藏当前动态，不连带屏蔽该 UP 其它内容。

</td>
<td>

<div class="mt"><span class="ml">取关</span></div>

同一 UP 连续 5 次不想看 → 立刻弹窗确认。

</td>
</tr>
</table>

---

<span class="eyebrow">03 · 体验</span>

## 参考 BewlyBewly 卡片扫读，但实现独立在本仓库

<p class="lead">中等卡片密度 balanced_default；垃圾箱 top_toolbar；想看后 toast_only。</p>

<div class="co">明确不做：首页 / 搜索改造、推荐算法、批量运营、键盘快捷键（当前）。</div>

---

<span class="eyebrow">04 · 架构</span>

## MV3 注入 + Vue 3 + Pinia，规则收敛在 domain 层

<div class="c2">

<div>

### 工程结构

- `content/` 页面替换与挂载
- `domain/` filter · group · rules
- `store/` inbox · decision · trash
- `services/` api · storage · toast

</div>

<div>

### 数据与隐私

- `chrome.storage.local`
- 同源 `credentials: include`
- 不上传个人数据

</div>

</div>

---

<span class="eyebrow">05 · 交付</span>

## 按 M01–M05 模块推进，当前 v0.0.1 开发者模式可用

<table class="data">
<tr><td>M01</td><td>骨架与页面接管</td><td>注入 Vue 根</td></tr>
<tr><td>M02</td><td>视频过滤 + 日期分组</td><td>domain 层</td></tr>
<tr><td>M03</td><td>卡片与交互</td><td>想看 / 不想看</td></tr>
<tr><td>M04–M05</td><td>垃圾箱 + 取关阈值</td><td>持久化规则</td></tr>
</table>

---

<span class="eyebrow">06 · 安装</span>

## 三行命令即可在本地加载未打包扩展

```bash
git clone https://github.com/486287441/BiliDynamicBox.git
cd BiliDynamicBox/extension && npm ci && npm run build
# Chrome 扩展页 → 加载 extension/ 目录
```

<div class="co">登录 B 站 → 打开动态页 → 处理「今天」分组。</div>

---

<!-- _class: cover -->
<!-- _paginate: false -->
<!-- _footer: "" -->

# 少滚动，多做决定

<div class="sub">github.com/486287441/BiliDynamicBox</div>
<div class="meta">一页纸 · 白皮书 · HTML 幻灯片 同目录 docs/kami/</div>
