# Adaptive 链路迁移图

本文最初用于梳理「旧 preview 链路」与「新 adaptive AI 链路」的影响范围与删除顺序。

当前状态：

- 旧 preview 主链、旧分页导出链路、premium 实验渲染链路均已从源码入口中移除
- 对外只保留 adaptive 生成、adaptive 校验、构建与本地发布命令
- 本文保留为迁移记录，下面涉及旧文件名的段落属于历史说明

## 目标

最终主链路应统一为：

`URL / Markdown -> 通用原文抽取 -> AI deck planner(JSON) -> adaptive renderer -> HTML preview`

不再保留：

`URL / Markdown -> section 粗分 -> 轮转 template-library -> memphis-preview.css`

## 两条链路的核心差异

| 维度 | 旧 preview 链路 | 新 adaptive 链路 |
|------|------------------|------------------|
| 输入 | URL / Markdown / HTML | URL / Markdown |
| 中间格式 | `sections[]` | `deckPlan JSON` |
| 内容理解 | heading / bullet 粗提取 | 原文抽取 + AI / fallback 语义规划 |
| 模板决策 | 模板轮转 / 固定规则 | `templateId` 按 slide intent 决策 |
| 渲染系统 | `memphis-preview.css` + legacy renderer | `render-adaptive.js` + theme / template registry |
| 验版基础 | 旧 DOM 结构 | adaptive DOM + plan 校验 |
| 视觉参考 | 老 preview | `demo-adaptive-deck.html` + SVG 模板 |

## 当前调用链总览

### 旧链路

```text
package.json -> npm run preview
            -> scripts/generate-preview.js
            -> scripts/lib/source-loader.js
            -> scripts/lib/url-to-ppt-markdown.js (URL 时可能走旧分页 Markdown)
            -> assets/template-library.json
            -> assets/memphis-preview.css
            -> legacy / premium renderer
            -> *.preview.html
```

### 新链路

```text
package.json -> npm run preview:adaptive
            -> scripts/generate-adaptive-preview.js
            -> scripts/lib/url-to-ppt-markdown.js
            -> extractUrlToSourceMarkdown()
            -> scripts/lib/adaptive-deck-planner.js
            -> deckPlan JSON
            -> scripts/lib/render-adaptive.js
            -> scripts/lib/template-registry.js
            -> scripts/lib/theme-engine.js
            -> *.preview.adaptive.html
```

## 文件影响范围矩阵

### 一、入口与命令层

| 文件 | 所属链路 | 当前职责 | 后续策略 | 删除 / 收敛前提 |
|------|----------|----------|----------|------------------|
| `package.json` | 新旧并存 | 暴露 `preview`、`preview:adaptive`、`validate:*` 命令 | 最终默认入口应切到 adaptive | `preview` 的消费者全部迁走 |
| `scripts/generate-preview.js` | 旧 | 旧 preview 主入口，也兼容 premium 路径 | 标记 legacy，最终删除 | `preview` 默认命令改指向新入口，dist / docs 不再引用 |
| `scripts/generate-adaptive-preview.js` | 新 | 串联原文抽取、deckPlan、adaptive 渲染 | 未来唯一正式入口 | AI / fallback 输出稳定，校验链补齐 |
| `scripts/demo-adaptive.js` | 新参考 | 人工构造 demo plan 的演示入口 | 保留为视觉基准，不参与正式生成 | 无，属于开发基准资产 |

### 二、原文抽取与中间层

| 文件 | 所属链路 | 当前职责 | 后续策略 | 风险点 |
|------|----------|----------|----------|--------|
| `scripts/lib/url-to-ppt-markdown.js` | 新旧共享 | URL 抽取；既支持 source markdown，也保留旧分页 Markdown 出口 | 收敛为统一抽取层，长期只保留 source markdown 能力 | 目前兼容逻辑仍会把旧分页概念带回系统 |
| `scripts/extract-url-to-ppt-markdown.js` | 旧兼容 | 直接导出 PPT 分页 Markdown | 后续要么删掉，要么改成“抽原文 + 调 planner”的新 CLI | 命令名会误导调用方继续依赖旧分页格式 |
| `scripts/lib/source-loader.js` | 旧核心 | 将 URL / HTML / Markdown 转成旧的 `sections[]` 文档结构 | 旧链路删除时一起移除 | 它是旧链路最核心的耦合点，多个脚本仍依赖 |

### 三、规划与模板决策层

| 文件 | 所属链路 | 当前职责 | 后续策略 | 风险点 |
|------|----------|----------|----------|--------|
| `scripts/lib/adaptive-deck-planner.js` | 新 | 生成 `deckPlan`，负责 slide 拆分、templateId、reasoning、slot 内容 | 未来唯一规划层 | AI 不可用时 fallback 质量仍需持续打磨 |
| `assets/template-library.json` | 旧 | legacy 模板元数据 | 最终删除 | 与 `template-registry.js` 并存会造成双模板体系 |
| `scripts/lib/template-registry.js` | 新 | adaptive 模板规范、slot 预算、fit 规则 | 未来唯一模板规范源 | 需要覆盖全部最终模板能力 |

### 四、渲染与样式层

| 文件 | 所属链路 | 当前职责 | 后续策略 | 风险点 |
|------|----------|----------|----------|--------|
| `assets/memphis-preview.css` | 旧 | legacy preview 的样式源 | 最终删除 | 与 adaptive 视觉语言不一致，是“效果对不上 SVG”的根因之一 |
| `scripts/lib/render-adaptive.js` | 新 | 消费 `deckPlan` 输出 adaptive HTML | 未来唯一 HTML renderer | 需要与 SVG 模板继续做细节对齐 |
| `scripts/lib/theme-engine.js` | 新 | 设计 token、主题与基础 CSS 输出 | 保留并扩展 | 需要继续承接更多模板和校验约束 |
| `demo-adaptive-deck.html` | 新参考 | adaptive 视觉基准产物 | 保留为验版参考 | 不应被误当成正式生成入口 |

### 五、导出、验证与实验脚本

| 文件 / 范围 | 所属链路 | 当前职责 | 后续策略 | 风险点 |
|-------------|----------|----------|----------|--------|
| `scripts/validate-generated-preview.js` | 旧 | 基于旧 preview DOM 做校验 | 重写或删除，迁移到 adaptive DOM / deckPlan | 直接沿用会误报 |
| `scripts/validate-premium-preview.js` | 实验 | premium 路径的验版脚本 | 评估是否并入 adaptive 校验体系 | HTML 结构和新链路不一致 |
| `scripts/validate-premium-masters.js` | 实验 | premium master 验版 | 评估是否保留为独立参考 | 可能仍依赖过渡模板资产 |
| `scripts/build-compare-before-after.js` | 实验 | 旧新样式对比页生成 | 后续只保留 adaptive 对 SVG 的 compare 工具 | 对旧 HTML DOM 结构耦合较重 |
| `scripts/build-template-compare-pages.js` | 实验 | 构造模板对比页 | 可改造成 adaptive 模板回归测试工具 | 需要切到新模板注册表 |
| `scripts/export-premium-html.js` | 过渡 | premium 导出路径 | 需要判断是并入 adaptive 还是整体淘汰 | 当前仍依赖 `source-loader.js` |

### 六、文档、技能与分发产物

| 文件 / 范围 | 当前状态 | 后续动作 |
|-------------|----------|----------|
| `README.md` | 已开始标记旧链路为 legacy，但仍保留旧命令示例 | 默认示例切到 adaptive，并附迁移说明 |
| `README.zh-CN.md` | 仍以旧入口为主 | 同步切到 adaptive |
| `SKILL.md` | 仍推荐 `generate-preview.js` 快速生成 | 改为优先 `generate-adaptive-preview.js` |
| `dist/codex/memphis-html-ppt/**` | 仍打包旧入口与旧说明 | 发布前需整体切换 |
| `dist/claude/memphis-html-ppt/**` | 仍打包旧入口与旧说明 | 发布前需整体切换 |
| `references/html-preview-workflow.md` 与相关 skill reference | 仍把旧 preview 作为 first-pass | 文案和示例统一改为 adaptive |

## 新旧链路的“谁替换谁”

| 旧文件 / 旧能力 | 新文件 / 新能力 |
|-----------------|------------------|
| `scripts/generate-preview.js` | `scripts/generate-adaptive-preview.js` |
| `scripts/lib/source-loader.js` | `extractUrlToSourceMarkdown()` + Markdown 直读 |
| `assets/template-library.json` | `scripts/lib/template-registry.js` |
| `assets/memphis-preview.css` | `theme-engine.js` + `render-adaptive.js` 输出的样式体系 |
| `sections[]` 中间结构 | `deckPlan JSON` |
| 旧 preview HTML DOM 校验 | `deckPlan` 结构校验 + adaptive DOM 校验 |

## 哪些文件现在不能直接删

以下文件目前仍有真实引用，不能直接删除，否则会出现功能断裂：

- `scripts/generate-preview.js`
  原因：`package.json` 的 `preview` 命令仍指向它，README / SKILL / dist 也仍在引用。
- `scripts/lib/source-loader.js`
  原因：`generate-preview.js`、`scripts/export-premium-html.js` 仍依赖。
- `assets/memphis-preview.css`
  原因：`generate-preview.js` 启动时直接读取。
- `assets/template-library.json`
  原因：`generate-preview.js` 启动时直接读取。
- `scripts/validate-generated-preview.js`
  原因：`package.json` 的 `validate:preview` 仍指向它。
- `scripts/extract-url-to-ppt-markdown.js`
  原因：`extract:ppt` 命令仍对外暴露旧分页产物。

## 建议的迁移阶段

### Phase 1：冻结旧链路

- `scripts/generate-preview.js` 不再新增任何功能
- 文档中明确标注 legacy
- 新需求全部落到 adaptive 链路

### Phase 2：让新链路补齐“正式可替代”能力

- URL 输入默认可以稳定抽取原文 Markdown
- `adaptive-deck-planner.js` 输出质量稳定
- 支持 plan JSON 落盘与追踪
- 支持 adaptive 验版脚本

### Phase 3：改默认入口与分发

- `package.json` 默认 `preview` 改指向 adaptive
- README / README.zh-CN / SKILL / references 全部替换示例命令
- `dist/codex/**` 与 `dist/claude/**` 重新打包

### Phase 4：清理旧闭环

可删除的第一批文件：

- `scripts/generate-preview.js`
- `scripts/lib/source-loader.js`
- `assets/memphis-preview.css`
- `assets/template-library.json`
- `scripts/validate-generated-preview.js`

可在第一批之后继续清理的第二批文件：

- `scripts/extract-url-to-ppt-markdown.js` 中只服务旧分页 Markdown 的逻辑
- 各类对旧 DOM 结构强耦合的 compare / validate / before-after 工具
- 文档和 dist 中残留的 legacy 命令说明

## 删除旧链路前的验收门槛

只有以下条件同时满足，才适合彻底移除旧链路：

1. URL 输入默认走 `scripts/generate-adaptive-preview.js`
2. 中间层统一成 `deckPlan JSON`
3. 渲染层统一成 `render-adaptive.js`
4. 模板规范统一成 `template-registry.js`
5. 校验脚本能够覆盖 deckPlan 和 adaptive HTML
6. README、SKILL、dist 中不再引用 `generate-preview.js`

## 当前结论

本次迁移已经完成以下收口：

1. `package.json` 只暴露 adaptive 主链相关命令
2. legacy preview、旧分页导出、premium 实验渲染脚本已删除
3. README、README.zh-CN、SKILL 与 workflow reference 已切到 adaptive
4. 发布打包将只复制当前 adaptive 代码与文档

当前仓库的正式主链已经统一为：

`URL / Markdown -> 通用原文抽取 -> source package -> deckPlan JSON -> adaptive renderer -> HTML preview`
