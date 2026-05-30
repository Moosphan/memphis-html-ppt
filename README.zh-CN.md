# Memphis HTML PPT

[English README](README.md)

![Memphis HTML PPT 项目横幅](assets/readme-banner.jpg)

Memphis HTML PPT 是一个轻量级工具集，用于将 Markdown 文档或网页快速转换为本地可打开的 HTML 幻灯片预览，并采用鲜明的 Memphis 风格视觉设计。

它适合以下场景：

- 快速做演示稿原型
- 将文章内容转成“像 PPT 一样”的 HTML 预览
- 作为 Codex / Claude Skill 的可复用模板项目
- 做带有强视觉风格的信息展示实验

## 项目亮点

- 支持从本地 Markdown 或网页 URL 生成 HTML 幻灯片
- 内置 Memphis 风格视觉系统，强调高饱和色彩、几何装饰和编辑感排版
- 提供多种版式模板，包括封面、叙事、对比、清单、时间线、指标、FAQ、结尾页等
- 附带本地打包脚本，方便产出 Codex / Claude Skill 发布目录
- 输出结果是可直接在浏览器打开的 HTML 文件

## 当前状态

这个仓库目前更适合作为“可用的生成器 + 可复用模板工程”，而不是一个已经完全产品化的 npm 包。

- 预览生成脚本已经可用
- 打包脚本可用于本地生成发布目录
- 项目已补充最小 `package.json`，便于统一用 Node.js 脚本管理命令

## 预览效果

![旅游方向预览图](assets/travel-preview.jpg)

## 目录结构

```text
.
├── assets/                    # 样式和模板库
├── references/                # 设计规范、工作流和打包说明
├── scripts/                   # 生成预览和构建发布包的脚本
├── SKILL.md                   # Skill 定义文件
├── juejin-skill-ppt.md        # 示例源内容
├── juejin-skill-memphis.html  # 示例生成结果
└── test-content.md            # 本地测试内容
```

## 环境要求

- 推荐 Node.js 18 或更高版本

当前脚本依赖：

- Node.js 原生 `fetch`
- ES Module 语法
- Node.js 文件系统 API

## 快速开始

从本地 Markdown 生成 HTML 预览：

```bash
npm run preview -- --input ./test-content.md --output ./preview.html
```

或者直接执行脚本：

```bash
node scripts/generate-preview.js --input ./test-content.md --output ./preview.html
```

从网页生成 HTML 预览：

```bash
node scripts/generate-preview.js --input https://example.com/article --output ./preview.html
```

生成后，直接用浏览器打开 `preview.html` 即可查看。

导出当前 premium 版最终 HTML PPT：

```bash
npm run export:premium -- --input ./test-content.md --output ./final.premium.html
```

## 可用脚本

### `scripts/generate-preview.js`

生成 Memphis 风格 HTML 幻灯片预览。

```bash
node scripts/generate-preview.js --input <url-or-file> --output <html-file>
```

主要行为：

- 支持本地 Markdown、本地 HTML、远程 HTTP/HTTPS 页面
- 将内容解析为章节、段落和列表项
- 基于 [`assets/template-library.json`](assets/template-library.json) 选择版式模板
- 输出最终 HTML 文件到指定路径

### `scripts/build-release.js`

在 `dist/` 下构建发布目录：

```bash
npm run build
```

或者：

```bash
node scripts/build-release.js
```

输出目录：

- `dist/codex/memphis-html-ppt`
- `dist/claude/memphis-html-ppt`

### `scripts/export-premium-html.js`

导出当前 premium 版 HTML PPT 成品。

```bash
node scripts/export-premium-html.js --input <url-or-file> --output <html-file>
```

主要行为：

- 读取源文档
- 将内容映射到当前 premium 模板规范
- 输出最终 premium HTML Deck 文件

### `scripts/publish-local.js`

将构建产物同步到本地 Skill 目录：

```bash
npm run publish:local
```

或者：

```bash
node scripts/publish-local.js
```

目标位置：

- `~/.codex/skills/memphis-html-ppt`
- `~/.claude/skills/memphis-html-ppt`

## 工作原理

当前生成流程比较直接：

1. 读取 Markdown、HTML 或远程网页。
2. 提取章节、段落和列表内容。
3. 为每个章节匹配一个幻灯片模板。
4. 使用共享的 Memphis 样式渲染为 HTML Deck。

现阶段实现更偏向“快速可用”和“视觉呈现”，不是深度语义理解型排版引擎。

## 设计风格

这个项目刻意避开普通商务风 PPT，更强调：

- 明亮且高对比的配色
- 几何切片和装饰元素
- 带节奏感的不对称布局
- 强烈的标题层级
- 有控制感的视觉活力

更多设计背景可参考：

- [`references/memphis-style.md`](references/memphis-style.md)
- [`references/template-catalog.md`](references/template-catalog.md)
- [`references/html-preview-workflow.md`](references/html-preview-workflow.md)

## 已知限制

- 目前还没有 npm 发布工作流
- 还没有自动化测试
- HTML 解析逻辑目前偏轻量，复杂网页结构保真度有限
- 超长章节目前不会自动拆成多页溢出幻灯片
- 远程网页的提取效果依赖目标页面本身的 HTML 结构

## 后续可扩展方向

- 增加基于截图的视觉回归校验
- 优化长内容拆页能力
- 支持更丰富的网页正文提取与元数据处理
- 支持更多导出格式或与其他演示工具互通

## 开源协议

本项目采用 MIT License，详见 [LICENSE](LICENSE)。
