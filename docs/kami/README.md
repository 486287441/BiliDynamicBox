# BiliDynamicBox · Kami 文档包

基于 [Kami](https://github.com/tw93/Kami) 模板排版的四份交付物，内容均来自本仓库 PRD / 技术方案。

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| `one-pager.html` | 一页纸 | 执行摘要，适合对外快速介绍 |
| `long-doc.html` | 长文档 | 产品与技术白皮书（约 5 章） |
| `slides-weasy.html` | 演讲幻灯片 | WeasyPrint 16:9 幻灯片，可导出 PDF |
| `slides-marp.md` | Markdown 演示稿 | Marp 格式，配合 `slides-marp.css` |

## 预览 HTML / 导出 PDF

### 浏览器预览

直接打开 `one-pager.html`、`long-doc.html`、`slides-weasy.html`、`slides-marp.html`。

### WeasyPrint（Windows 本机已配置）

依赖：MSYS2 的 `mingw-w64-x86_64-pango` + 用户环境变量 `WEASYPRINT_DLL_DIRECTORIES=C:\msys64\mingw64\bin`。

```powershell
cd docs/kami
python -m weasyprint one-pager.html one-pager.pdf
python -m weasyprint long-doc.html long-doc.pdf
python -m weasyprint slides-weasy.html slides-weasy.pdf
```

验证：`python -m weasyprint --info` 应显示 Pango version。

### Marp CLI（已全局安装）

```powershell
cd docs/kami
marp --no-stdin slides-marp.md --theme-set . --html -o slides-marp.html
marp --no-stdin slides-marp.md --theme-set . --pdf -o slides-marp.pdf
```

`slides-marp.css` 需与 `slides-marp.md` 同目录；`theme: kami` 已在 front matter 中指定。

### 已生成的 PDF（仓库内）

| 文件 | 来源 |
| --- | --- |
| `one-pager.pdf` | WeasyPrint |
| `long-doc.pdf` | WeasyPrint |
| `slides-weasy.pdf` | WeasyPrint |
| `slides-marp.pdf` | Marp CLI |
