# 内容质量优化与自动化验证方案

本文聚焦当前 adaptive 链路最核心的两个质量问题：

1. `原文 -> PPT 内容` 的提炼质量不够好
2. `提炼后的内容 -> 模板 slot` 的适配质量不够稳

目标不是只减少 overflow，而是提升：

- 主次分明
- 内容压缩合理
- 核心信息不丢
- 非核心噪声被清掉
- 提取结果天然更适配现有 PPT 模板

---

## 一、当前问题拆解

### 1.1 当前链路里真正薄弱的地方

当前主链路大致是：

`URL -> MarkItDown -> cleanMarkItDownMarkdown() -> buildAdaptiveDeckPlan() -> render-adaptive.js`

其中存在三个明显短板：

### A. 原文清洗还太轻

当前 [`scripts/lib/url-to-ppt-markdown.js`](/Users/dorck/self-projects/html-ppt/memphis-html-ppt/scripts/lib/url-to-ppt-markdown.js) 里的 `cleanMarkItDownMarkdown()` 主要只做了：

- 标题元信息剔除
- 文末评论/相关推荐裁剪
- 少量 metadata line 去除

它还没有系统处理这些内容：

- 导航残留
- 多余作者信息 / badge / 平台按钮
- 重复标题 / 重复摘要
- “阅读原文 / 关注 / 点赞 / 收藏 / 分享” 类 CTA
- 链接列表噪声
- 无关图片说明
- 长代码块里的低价值样板代码

### B. 目前 planner 吃到的还是“段落文本”，不是“可用于 PPT 提取的语义包”

当前 [`scripts/lib/adaptive-deck-planner.js`](/Users/dorck/self-projects/html-ppt/memphis-html-ppt/scripts/lib/adaptive-deck-planner.js) 主要基于：

- `sections`
- `paragraphs`
- `bullets`
- 少量 `metrics`

但缺少更适合 PPT 提取的中间结构，例如：

- 核心论点
- supporting evidence
- commands / API / step items
- code intent summary
- named entities
- before / after signals
- risk / action / checklist signals
- section importance score

也就是说，现在 planner 更像是在“从文本堆里取内容”，而不是“从语义包里装 slide”。

### C. 当前自动校验偏重“排版能不能装下”，还没有校验“内容提取得好不好”

目前已有：

- [`scripts/validate-adaptive-preview.js`](/Users/dorck/self-projects/html-ppt/memphis-html-ppt/scripts/validate-adaptive-preview.js)
  主要校验 template fit / slot 结构 / deckPlan 一致性
- [`scripts/validate-adaptive-visual.js`](/Users/dorck/self-projects/html-ppt/memphis-html-ppt/scripts/validate-adaptive-visual.js)
  主要校验 safe area / SVG 对齐 / 视觉产物

还缺少：

- 内容完整性校验
- 重点信息覆盖率校验
- 内容压缩是否过度校验
- 噪声去除质量校验
- “提取结果是否适合当前模板” 的语义校验

---

## 二、建议新增的中间流程

建议明确加入一个新的中间阶段：

`Raw Markdown -> Clean Markdown -> Source Package -> PPT Deck Plan`

而不是直接：

`Raw Markdown -> Deck Plan`

### 推荐新链路

```text
URL / local Markdown
  -> MarkItDown / file read
  -> Stage A. Clean Markdown
  -> Stage B. Source Package Extraction
  -> Stage C. AI Deck Planning
  -> Stage D. Deterministic Rendering
  -> Stage E. Layout / Visual Validation
  -> Stage F. Content Quality Validation
```

### Stage A：Clean Markdown

职责：

- 去噪，不做 PPT 规划
- 保留原文语义，不做大规模改写

输出：

- `cleanedMarkdown`
- `cleaningReport`

### Stage B：Source Package Extraction

职责：

- 把 clean markdown 转成“更适合 PPT 的语义包”
- 这是 planner 的真实输入

输出建议：

```json
{
  "title": "...",
  "summary": "...",
  "sections": [
    {
      "title": "...",
      "importance": 0.86,
      "intentHints": ["process", "checklist"],
      "coreClaim": "...",
      "supportingPoints": ["...", "..."],
      "metrics": ["84%", "3x"],
      "commands": ["npm run build", "juejin login"],
      "codeConcepts": ["CLI entry", "session reuse"],
      "namedEntities": ["Juejin", "GitHub Actions"],
      "noiseFlags": [],
      "sourceSpans": ["..."]
    }
  ]
}
```

### 为什么这一步必要

因为“去噪”和“做 PPT 提炼”是两种不同任务：

- 去噪：判断什么不该进入 PPT
- 提炼：判断什么该成为某一页的主信息

把这两件事混在一个 prompt 里，输出质量通常会更不稳定。

---

## 三、内容质量自动化验证应该怎么做

建议把自动化验证分成三层：

1. 确定性规则校验
2. Source Package 覆盖率校验
3. AI Judge 质量评分

这三层缺一不可。

---

## 四、第一层：确定性规则校验

这层不判断“好不好看”，只判断“有没有明显错误”。

### 4.1 噪声残留率

检查 cleaned markdown / source package / deck plan 中是否还包含：

- 点赞 / 收藏 / 分享 / 评论
- 阅读量
- 关注作者
- 相关推荐
- 原文链接列表
- 平台跳转 CTA
- 明显重复标题 / 重复摘要

输出：

- `noiseHitCount`
- `noiseHitLines`
- `noiseCategories`

### 4.2 长句与长标题超限率

检查：

- slide title 是否过长
- subtitle / body 是否存在过长原句未概括
- bullet 是否仍是整句复制

建议阈值：

- title：`<= 24~30` 中文字符等价
- bullet：`<= 28~40` 中文字符等价
- body：`<= 80~140` 中文字符等价

### 4.3 代码块保留合理性

检查代码相关 section 是否存在：

- 只有大段代码，没有概括
- 命令型内容没有提取命令项
- API / 配置项 / 关键步骤没有被抽出来

这层可做简单规则：

- 原文包含代码 fence，但 slide plan 中没有 `commands / steps / bullets / codeConcepts`
- 原文有 3+ 命令样式行，但 plan 未提取

### 4.4 模板语义适配率

基于模板 registry 检查：

- `process-lane` 是否真的有 steps
- `compare-dual` 是否真的有 before / after
- `metric-board` 是否真的有 metric + supporting facts
- `bullet-grid` 是否只是把长段落硬塞成 bullet

这层是现有 `fit` 的增强版，不只看 slot 是否存在，还看语义是否匹配。

---

## 五、第二层：内容完整性与提取合理性校验

这一层才真正对应你说的“主次分明、内容完整、不丢核心信息”。

建议围绕 `Source Package -> Deck Plan` 做覆盖率统计。

### 5.1 核心实体覆盖率

从 source package 提取：

- named entities
- metrics
- commands
- key phrases

然后检查 deck plan 中被覆盖的比例。

例如：

- 核心实体 12 个，deck 覆盖 9 个，覆盖率 `75%`
- 关键 metric 4 个，覆盖 4 个，覆盖率 `100%`

这能自动发现：

- 重要 item 被漏掉
- 某一类信息完全没有进入 PPT

### 5.2 section importance 覆盖率

对 source package 中的 section 做 importance score 后，检查：

- top 20% 高重要度 section 是否都进入了 deck
- 低重要度 section 是否被过度占用页数

自动规则：

- 高重要度 section 缺失 => fail
- 低重要度 / noise-adjacent section 占用独立 slide => warn

### 5.3 压缩质量

检查 deck plan 是否只是“复制原文”：

- 若 slide title 与 source line 高度相似且过长 => warn
- 若 3 个以上 bullet 直接来自同一段原文、几乎没概括 => warn
- 若代码 section 直接保留代码正文而没有“概括性步骤 / 结论” => warn

这里可以用简单文本相似度：

- longest common subsequence
- token overlap
- Jaccard

目标不是禁止引用，而是禁止“整段照搬”。

### 5.4 信息密度合理性

检查是否存在：

- 某页只有 1 个轻量 bullet，信息过薄
- 某页塞 2 段长文 + 6 bullets，信息过满
- deck 总页数过多但每页都很薄

建议指标：

- `slide_density_score`
- `thin_slide_count`
- `overloaded_slide_count`

---

## 六、第三层：AI Judge 评分

这一层用于判断“提取是否合理”，因为这件事纯规则很难覆盖。

建议对每个 deck 增加一个 judge 流程，输入：

- cleaned markdown
- source package
- final deck plan

让 judge 只评分，不生成内容。

### 6.1 Judge 维度

建议固定为 5 项：

1. `content_completeness`
   是否覆盖了原文最关键的信息
2. `content_prioritization`
   是否区分了主次，是否让次要信息抢占主舞台
3. `compression_quality`
   是否做了概括，而不是照搬长句
4. `template_fitness`
   内容是否真的适合对应模板
5. `noise_removal`
   非核心杂质是否被清除

### 6.2 Judge 输出建议

```json
{
  "score": {
    "content_completeness": 4,
    "content_prioritization": 3,
    "compression_quality": 2,
    "template_fitness": 3,
    "noise_removal": 4
  },
  "blockingIssues": [
    "The deck keeps several long source sentences almost verbatim.",
    "Command-related sections were not abstracted into steps or command items."
  ],
  "slideFindings": [
    {
      "slideId": "slide-03",
      "issue": "important command items missing"
    }
  ]
}
```

Judge 的作用不是替代主流程，而是：

- 做回归评分
- 给 prompt 调整提供依据
- 给自动化测试生成趋势数据

---

## 七、建议新增的测试集

为了让自动化有意义，需要一套固定评测集。

### 7.1 测试集类型

至少覆盖这 6 类：

1. 长篇技术文章
   特征：代码、命令、配置项多
2. 教程型文章
   特征：步骤强，适合 process 模板
3. 趋势分析文章
   特征：观点 + 数据 + conclusion
4. 产品发布文章
   特征：feature / benefit / metric
5. 风险 / checklist 文章
   特征：注意事项、边界、限制
6. 混合型平台文章
   特征：平台噪声多，最适合测“杂质去除”

### 7.2 每个 case 需要的标注

建议配一个 `fixture.json`：

```json
{
  "source": "article.md",
  "expectedCorePoints": [
    "session reuse",
    "draft first",
    "image upload replacement"
  ],
  "expectedCommands": [
    "login",
    "publish",
    "update"
  ],
  "expectedNoise": [
    "点赞",
    "相关推荐"
  ],
  "preferredTemplates": ["process-lane", "command-board", "metric-board"],
  "mustKeepSections": [
    "登录交给浏览器，会话交给本地文件"
  ]
}
```

这能让自动测试不只看“能不能生成”，而是看“是否提到了应该提到的内容”。

---

## 八、建议新增的脚本与模块

### 8.1 新模块

- `scripts/lib/clean-source-markdown.js`
  负责 deterministic 去噪
- `scripts/lib/build-source-package.js`
  负责从 cleaned markdown 提取结构化语义包
- `scripts/lib/content-quality-rules.js`
  负责 coverage / noise / density / compression 规则检查

### 8.2 新脚本

- `scripts/validate-content-quality.js`
  输入：
  - `--source <clean.md>`
  - `--package <source-package.json>`
  - `--plan <deck.plan.json>`
  - `--fixture <fixture.json>`
  输出：
  - JSON 分数
  - fail / warn 明细

- `scripts/eval-adaptive-deck.js`
  批量跑整套评测集，输出趋势报告

---

## 九、建议的自动化门槛

可以把自动化门槛分三档：

### 阶段一：必须通过

- template fit 通过
- visual safe area 通过
- noise 残留率低于阈值
- 核心实体覆盖率高于阈值

### 阶段二：建议通过

- 高重要度 section 全覆盖
- 压缩质量评分不低于 3/5
- 模板适配评分不低于 3/5

### 阶段三：趋势监控

- 平均 slide 数
- thin slide rate
- code abstraction coverage
- average judge score

这样做的好处是：

- 不会因为 judge 偶然波动阻塞所有生成
- 但也不会完全放任“虽然能渲染，但内容越来越差”

---

## 十、我对“是否需要先做一轮杂质去除”的结论

结论是：**非常有必要，而且应该独立成一层。**

原因很简单：

- 不做 clean stage，planner 永远会吃到平台噪声
- planner 一边做去噪、一边做内容提炼，任务耦合太重
- 自动化验证也无法区分“抽取差”还是“源太脏”

所以最合理的链路不是：

`原文 Markdown -> 直接做 PPT 提取`

而是：

`原文 Markdown -> 去噪 clean markdown -> source package -> PPT 提取`

---

## 十一、推荐的下一步实现顺序

建议不要同时大改所有环节，而是按这个顺序推进：

1. 先新增 `clean-source-markdown.js`
   先把噪声问题从链路里剥离
2. 再新增 `build-source-package.js`
   把“语义提取”独立出来
3. 再做 `validate-content-quality.js`
   先让问题可量化
4. 最后再调 planner prompt
   否则 prompt 改了也难判断到底有没有变好

---

## 十二、当前最关键的判断标准

后面如果我们要判断“内容质量是否真的提升”，不应只看：

- 有没有 overflow
- PPT 看起来像不像模板

更应该看：

1. deck 是否覆盖了原文最重要的信息
2. deck 是否把原文压成了更适合 PPT 的表达
3. deck 是否清除了平台噪声
4. deck 是否把内容放进了正确模板

只有这四件事都能被自动化验证，后续迭代才会稳定。

---

## 十三、代码片段 / 命令内容的判断流程

这是当前链路里一个非常关键、但最容易被做粗糙的点：

不是所有代码片段都应该进入 PPT。

真正应该由 AI 判断的是：

1. 这段代码 / 命令是否值得展示
2. 如果值得展示，应该以什么形式展示
3. 现有模板是否支持这种展示方式
4. 如果模板不支持，应该改成概括文本，而不是硬塞原文

### 13.1 总原则

对代码相关内容，优先级应当是：

`结论 / 步骤 / 命令 / 结构概念 > 原始代码正文`

也就是说：

- PPT 优先展示“这段代码说明了什么”
- 其次展示“用户该执行什么命令”
- 再其次展示“流程或结构”
- 最后才考虑直接展示代码片段本身

除非代码片段本身就是核心信息，否则不要把大段代码直接带进 slide。

### 13.2 建议的判断树

可以把 AI 的判断流程固定成下面这套：

#### Step 1：先判断代码内容类型

对每个 code block / inline code / command-like list，先分类：

- `command-sequence`
  例如：`npm run build`、`git tag v0.1.0`
- `config-snippet`
  例如：JSON / YAML / env 配置
- `api-example`
  例如：HTTP 请求、函数调用样例
- `implementation-detail`
  例如：业务函数代码、类实现、内部逻辑
- `conceptual-structure`
  例如：目录结构、模块分层、执行流程

只有先分类，后面才能决定适不适合进 PPT。

#### Step 2：判断“是否值得展示原文”

建议 AI 只在以下情况下保留原始片段：

- 该片段非常短
- 该片段本身就是核心结论
- 该片段对理解原文至关重要
- 该片段是操作入口，而不是实现细节

适合保留原文的典型情况：

- CLI 命令
- 关键 API 路径
- 配置键名
- 极短的目录结构
- 极短的伪代码骨架

不适合保留原文的典型情况：

- 大段实现代码
- 辅助函数
- 样板代码
- 多层嵌套配置
- 可从语义概括中获得同样信息的代码

#### Step 3：决定展示形式

AI 不应只有“保留 / 不保留”两种选择，而应在下面几种形式中挑一种：

1. `command-board`
   适合：命令列表、CLI 操作、终端工作流

2. `process-lane`
   适合：代码块本质上表达的是执行步骤，而不是代码本身

3. `bullet-grid`
   适合：把代码或配置总结成 4-8 条操作要点 / 注意事项

4. `layer-stack`
   适合：代码内容本质是模块分层、职责分层、架构栈

5. `narrative-split`
   适合：只保留“这段代码想说明的结论”，不展示代码原文

6. `data-table`
   适合：配置项 / 参数项 / 字段映射

7. `不展示代码正文，仅做概括`
   适合：实现细节或篇幅太长、不适合出现在 slide 中的代码

### 13.3 一个更实用的规则

可以把“代码是否进入 PPT”简化成下面这个可执行原则：

#### Rule A：命令优先保留

如果内容里是：

- shell 命令
- CLI 子命令
- 一组安装 / 登录 / 发布 / 更新命令

则优先转成：

- `command-board`
- 或 `process-lane`

而不是把它当段落描述。

#### Rule B：实现代码默认不直接保留

如果内容里是：

- JS / TS / Python / Go 等实现代码
- 函数体 / 类定义 / 中间逻辑

则默认策略是：

- 先抽取“代码要表达的核心意图”
- 再转成 bullets / steps / layers / risks

只有当代码极短且具有标识性时，才允许保留原文片段。

#### Rule C：配置片段优先转结构化信息

如果内容里是：

- JSON
- YAML
- env
- 参数列表

则优先转成：

- `data-table`
- `bullet-grid`
- `checklist-board`

而不是原样贴配置。

#### Rule D：目录 / 架构优先转分层

如果内容里是：

- 文件树
- 模块结构
- “CLI -> core -> session -> publish” 这种链路

则优先转成：

- `layer-stack`
- `hierarchy-tree`
- 或 `process-lane`

### 13.4 planner 需要的中间字段

为了支持这套判断，`source package` 里建议为代码相关内容补这些字段：

```json
{
  "codeAssets": [
    {
      "kind": "command-sequence",
      "raw": ["juejin login", "juejin publish post.md"],
      "importance": 0.84,
      "showRaw": true,
      "preferredPresentation": "command-board",
      "summary": "登录后可直接发布本地 Markdown。",
      "commands": [
        {
          "command": "juejin login",
          "description": "复用浏览器登录态"
        },
        {
          "command": "juejin publish post.md",
          "description": "发布本地 Markdown 草稿"
        }
      ]
    }
  ]
}
```

关键不是只存 `raw code`，而是要存：

- `kind`
- `importance`
- `showRaw`
- `preferredPresentation`
- `summary`

这样 planner 才能真的做“判断”，而不是盲提。

### 13.5 AI 的具体决策协议

建议让 planner 对每个代码相关片段都输出一个决策结果：

```json
{
  "codeDecision": {
    "shouldShow": true,
    "showMode": "command-board",
    "reason": "The source contains executable CLI commands that are more useful as terminal actions than as prose.",
    "compression": "keep-raw-commands",
    "dropRawImplementation": true
  }
}
```

或者：

```json
{
  "codeDecision": {
    "shouldShow": false,
    "showMode": "narrative-summary",
    "reason": "The code is implementation detail and should be abstracted into its functional takeaway.",
    "compression": "summarize-to-bullets",
    "dropRawImplementation": true
  }
}
```

这会带来两个好处：

- 后续可以自动验证 AI 是否做了合理决策
- 可以做 case review，看为什么某段代码被保留或被压缩

### 13.6 自动化如何验证这件事

可以补一组专门的规则：

#### A. 命令召回率

若原文里存在高重要度命令，则检查：

- 是否进入了 `commands`
- 或是否进入了 `steps`
- 或是否进入了明确的 action bullets

否则判为漏提取。

#### B. 实现代码压缩率

若原文代码块长度超过阈值，例如 `> 12` 行，则检查：

- 最终 slide 中是否仍保留大段 raw code
- 若保留，则 warn / fail

#### C. 展示模式合理性

若 `kind = command-sequence`，而最终模板是纯 narrative 且没有命令项：

- warn：命令未被结构化呈现

若 `kind = implementation-detail`，但最终 plan 仍保留 raw code：

- warn：实现细节不应直接进 PPT

#### D. 代码语义完整性

如果原文代码段其实表达的是：

- 安装流程
- 登录流程
- 发布流程
- 更新流程

则检查是否被保留为：

- action / step / command / checklist

而不是只剩一句抽象口号。

### 13.7 最终结论

所以这块不应该是：

- “代码能不能展示”

而应该是：

- “这段代码属于哪一类信息”
- “该类信息最适合哪种 PPT 表达方式”
- “现有模板是否支持这种表达”
- “若不支持，是否应抽象成步骤 / 要点 / 结构 / 指标”

真正需要落地的不是一个 if/else，而是一套：

`代码类型识别 -> 展示价值判断 -> 表达方式选择 -> 模板映射 -> 自动化回归校验`

这才是后面让 AI 稳定判断“代码该不该上 PPT、该怎么上”的核心流程。
