# billbillRead

在 [B 站动态页](https://t.bilibili.com/) 将内容区替换为「收件箱」式视频动态流：按日期分组、快速标记「想看 / 不想看」，并支持垃圾箱与连续「不想看」后的取关确认。

## 功能概览

- 仅处理**视频动态**，按今天 / 昨天 / 更早日期分组展示
- **想看**：加入 B 站稍后再看（使用当前登录态 Cookie，无需配置 API Key）
- **不想看**：移入垃圾箱，刷新后不再出现
- 同一 UP 主连续 5 次「不想看」时提示是否取关
- 顶部工具栏提供垃圾箱入口

## 安装（开发者模式）

1. 克隆本仓库：

   ```bash
   git clone https://github.com/486287441/billbillRead.git
   cd billbillRead/extension
   ```

2. 安装依赖并构建：

   ```bash
   npm ci
   npm run build
   ```

3. 打开 Chrome / Edge → **扩展程序** → **开发者模式** → **加载已解压的扩展程序**，选择仓库中的 `extension` 目录。

4. 登录 B 站账号后访问 <https://t.bilibili.com/> 即可使用。

> `extension/dist/` 为构建产物。修改 `extension/src/` 后请重新执行 `npm run build`。

## 项目结构

| 路径 | 说明 |
| --- | --- |
| `extension/` | 浏览器扩展（Manifest V3） |
| `extension/src/` | Vue 3 + Pinia 源码 |
| `extension/dist/` | Vite 构建输出（需 `npm run build` 生成/更新） |
| `需求.md` / `plan/` | 产品与实现文档（中文） |

## 安全说明

- **不要**将 `.env`、Cookie 导出文件、私钥或任何令牌提交到仓库。
- 扩展通过页面同源请求调用 B 站公开接口，鉴权依赖浏览器中已有的登录 Cookie（`credentials: "include"`），仓库内不包含密钥。

## 参考项目

UI 风格参考 [BewlyBewly](https://github.com/hakadao/BewlyBewly)。如需对照上游实现，请在本地单独克隆，目录名为 `BewlyBewly-main/`（已在 `.gitignore` 中排除，不会进入本仓库）。

## 许可证

见各目录内说明；`extension/assets/fonts/` 下字体文件请遵守对应 `*-LICENSE.txt`。
