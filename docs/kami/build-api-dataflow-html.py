#!/usr/bin/env python3
"""Generate api-dataflow-long-doc.html from markdown using Kami long-doc styles."""
from __future__ import annotations

import html as h
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
MD_PATH = ROOT / "docs" / "API与动态收件箱数据流说明.md"
TPL_PATH = Path(__file__).resolve().parent / "long-doc.html"
OUT_PATH = Path(__file__).resolve().parent / "api-dataflow-long-doc.html"


def md_inline(text: str) -> str:
    text = h.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\[(.+?)\]\((.+?)\)", r'<a href="\2">\1</a>', text)
    return text


def parse_table(lines: list[str]) -> str:
    rows = [line.strip() for line in lines if line.strip().startswith("|")]
    if len(rows) < 2:
        return ""

    def cells(row: str) -> list[str]:
        return [cell.strip() for cell in row.strip("|").split("|")]

    header = cells(rows[0])
    body_rows = [cells(row) for row in rows[2:]]
    parts = ["<table>\n<thead><tr>"]
    for cell in header:
        parts.append(f"<th>{md_inline(cell)}</th>")
    parts.append("</tr></thead>\n<tbody>")
    for row in body_rows:
        parts.append("<tr>")
        for cell in row:
            parts.append(f"<td>{md_inline(cell)}</td>")
        parts.append("</tr>")
    parts.append("</tbody></table>")
    return "".join(parts)


def md_block_to_html(text: str) -> str:
    lines = text.split("\n")
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]

        if line.strip().startswith("```"):
            i += 1
            code_lines: list[str] = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1
            code = h.escape("\n".join(code_lines))
            out.append(f"<pre><code>{code}</code></pre>")
            continue

        if line.strip().startswith("|"):
            tbl_lines: list[str] = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                tbl_lines.append(lines[i])
                i += 1
            out.append(parse_table(tbl_lines))
            continue

        if line.startswith("> "):
            quote: list[str] = []
            while i < len(lines) and lines[i].startswith("> "):
                quote.append(lines[i][2:])
                i += 1
            out.append(
                "<blockquote>" + "<br>".join(md_inline(q) for q in quote) + "</blockquote>"
            )
            continue

        if line.startswith("- "):
            out.append("<ul>")
            while i < len(lines) and lines[i].startswith("- "):
                out.append(f"<li>{md_inline(lines[i][2:])}</li>")
                i += 1
            out.append("</ul>")
            continue

        if re.match(r"^\d+\. ", line):
            out.append("<ol>")
            while i < len(lines) and re.match(r"^\d+\. ", lines[i]):
                item = re.sub(r"^\d+\. ", "", lines[i])
                out.append(f"<li>{md_inline(item)}</li>")
                i += 1
            out.append("</ol>")
            continue

        if line.strip() == "---":
            i += 1
            continue

        if line.strip():
            out.append(f"<p>{md_inline(line)}</p>")
        i += 1

    return "\n".join(out)


def chapter_html(index: int, title_line: str, body: str) -> tuple[str, str, str]:
    anchor = f"ch{index}"
    match = re.match(r"^(\d+)\.\s*(.+)$", title_line.strip())
    if match:
        num, title = match.group(1), match.group(2)
    else:
        num, title = f"{index:02d}", title_line.strip()

    subparts = re.split(r"^### ", body, flags=re.MULTILINE)
    body_html = ""
    if subparts[0].strip():
        body_html += md_block_to_html(subparts[0])
    for subpart in subparts[1:]:
        sub_lines = subpart.split("\n", 1)
        subtitle = sub_lines[0].strip()
        sub_body = sub_lines[1] if len(sub_lines) > 1 else ""
        body_html += f"<h3>{md_inline(subtitle)}</h3>\n" + md_block_to_html(sub_body)

    section = f"""<!-- Chapter {num} -->
<section class="chapter" id="{anchor}">
  <div class="chapter-num">{num.zfill(2)} · Chapter</div>
  <h1>{md_inline(title)}</h1>
  {body_html}
</section>"""
    return num.zfill(2), title, anchor, section


def inject_flow_diagrams(section: str, chapter_index: int) -> str:
    if "flowchart" not in section:
        return section

    if chapter_index == 5:
        diagram = """<figure>
<pre><code>用户打开 t.bilibili.com
    → bootstrap → load(true) 重置拉第一页
    → ensureViewportFilled 填满视口
    → maintainScrollBuffer 提前缓冲

用户向下滚动 → maintainScrollBuffer
用户点不想看/筛选 → fillAfterHide 补列表</code></pre>
<figcaption>图 5-1 · 三种加载场景关系</figcaption>
</figure>"""
    elif chapter_index == 9:
        diagram = """<figure>
<pre><code>阶段 1（后台索引 · 慢 · 可增量）
  fetchMomentsPage → 只解析必要字段 → IndexedDB

阶段 2（选日期 · 快）
  IndexedDB → 按 publishAt 筛选 → 渲染 VideoCard</code></pre>
<figcaption>图 9-1 · 两阶段日期筛选架构</figcaption>
</figure>"""
    else:
        diagram = ""

    section = re.sub(
        r"<pre><code>flowchart[\s\S]*?</code></pre>",
        diagram,
        section,
        count=1,
    )
    return section


def main() -> None:
    md = MD_PATH.read_text(encoding="utf-8")
    tpl = TPL_PATH.read_text(encoding="utf-8")
    style_start = tpl.index("<style>")
    style_end = tpl.index("</style>") + len("</style>")
    style_block = tpl[style_start:style_end].replace(
        "BiliDynamicBox 白皮书", "API 数据流说明"
    )

    head = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>API 与 BiliDynamicBox 动态收件箱数据流说明</title>
<meta name="author" content="BiliDynamicBox">
<meta name="description" content="API 概念、B 站动态接口、滚动加载、AI API 对比与日期筛选难点说明。">
<meta name="keywords" content="BiliDynamicBox,B站API,动态收件箱,Chrome扩展,数据流">
<meta name="generator" content="Kami">
{style_block}
<style>
  .toc-item a {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    width: 100%;
    text-decoration: none;
    color: inherit;
  }}
  .toc-item a .toc-title {{ flex: 1; padding-left: 6pt; }}
  .chapter {{ scroll-margin-top: 12pt; }}
</style>
</head>
"""

    parts = re.split(r"^## ", md, flags=re.MULTILINE)
    intro = parts[0]

    intro_html = ""
    for block in intro.split("\n---\n"):
        if block.strip().startswith("#") or "目录" in block:
            continue
        if block.strip():
            intro_html += md_block_to_html(block)

    toc_items: list[tuple[str, str, str]] = []
    chapter_sections: list[str] = []
    epilogue = ""
    chapter_idx = 0
    for chapter in parts[1:]:
        lines = chapter.split("\n", 1)
        title_line = lines[0].strip()
        body = lines[1] if len(lines) > 1 else ""

        if title_line == "目录":
            continue
        if title_line == "结语":
            epilogue = md_block_to_html(body)
            continue

        chapter_idx += 1
        num, title, anchor, section = chapter_html(chapter_idx, title_line, body)
        section = inject_flow_diagrams(section, chapter_idx)
        toc_items.append((num, title, anchor))
        chapter_sections.append(section)

    toc_html = '<section class="toc">\n  <h2>目录</h2>\n'
    for num, title, anchor in toc_items:
        toc_html += f"""  <div class="toc-item">
    <a href="#{anchor}">
      <span class="toc-num">{num}</span>
      <span class="toc-title">{h.escape(title)}</span>
      <span class="toc-page">§</span>
    </a>
  </div>
"""
    toc_html += "</section>\n"

    cover = """<section class="cover">
  <div>
    <div class="cover-eyebrow">技术说明 · API 与数据流</div>
    <div class="cover-title">API 与 BiliDynamicBox<br>动态收件箱</div>
    <div class="cover-sub">从 API 入门到本项目：B 站动态接口、滚动预加载、AI API 对比，以及日期筛选为何慢</div>
  </div>
  <div class="cover-meta">
    <strong>BiliDynamicBox</strong><br>
    文档版本 2026-06 · 扩展 manifest 1.0.0<br>
    github.com/486287441/BiliDynamicBox
  </div>
</section>
"""

    exec_summary = f"""<section class="chapter" id="summary">
  <div class="chapter-num">00 · Overview</div>
  <h1>文档导读</h1>
  {intro_html}
  <div class="takeaway">
    <div class="takeaway-label">阅读提示</div>
    代码路径以仓库 <code>extension/</code> 为准。本文解释数据从 B 站 API 到收件箱 UI 的完整链路，以及历史日期筛选的产品与技术边界。
  </div>
</section>
"""

    closing = ""
    if epilogue:
        closing = f"""<section class="chapter" id="closing">
  <div class="chapter-num">11 · Closing</div>
  <h1>结语</h1>
  {epilogue}
  <p><em>文档版本：2026-06 · 对应扩展 manifest 1.0.0</em></p>
</section>
"""

    body = cover + "\n" + toc_html + exec_summary + "\n".join(chapter_sections) + closing
    OUT_PATH.write_text(head + "<body>\n" + body + "\n</body>\n</html>\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
