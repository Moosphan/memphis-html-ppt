# HTML-PPT 系统架构与设计策略

> 本文档整合了技术架构、产品设计、PPT 设计专业性的完整方案分析。
> 目标：将当前的 HTML 模板系统从"网页卡片堆叠"升级为"高质量 PPT 级别的演示文稿"。

---

## 一、现状问题诊断

### 1.1 视觉质量问题

| 问题 | 具体表现 | 影响 |
|------|----------|------|
| **排版缺乏呼吸感** | 文字填满卡片，留白不够，行距偏紧 | 看起来像网页不像 PPT |
| **字体层次不够鲜明** | 标题/正文/标签的尺寸梯度不够大 | 视觉焦点模糊 |
| **装饰元素"贴上去"的感觉** | Memphis 装饰（圆点、锯齿、三角）像贴纸而非设计的一部分 | 缺乏整体性 |
| **卡片系统过于统一** | 所有卡片的圆角、阴影、边框完全一样 | 缺乏视觉节奏和层次 |
| **色彩运用过于均匀** | 5 种 accent 颜色机械轮换，没有主色/辅色/点缀色的概念 | 看起来花哨但没有重点 |
| **固定 1600×900 像素画板** | 不适配屏幕，缩放后模糊或溢出 | 用户体验差 |

### 1.2 架构问题

| 问题 | 现状 | 理想状态 |
|------|------|----------|
| **模板选择是轮换制** | legacy 按顺序轮换，premium 固定 6 页 | 应该由内容语义驱动 |
| **源解析太浅** | 只提取 heading + bullets，丢失结构 | 需要保留段落层级、引用、代码块、强调 |
| **内容不做拆分** | 一个 section = 一页 slide | 长内容应该智能拆分 |
| **装饰与模板解耦** | 装饰随机生成或固定在 renderer 里 | 应该绑定到 template spec 的 anchor 上 |
| **没有主题系统** | 颜色、字体硬编码 | 需要 token 化 + 主题切换 |

### 1.3 双管线遗留问题

当前存在两套平行的生成系统：

- **Legacy 管线**: `generate-preview.js` + `memphis-preview.css` + `template-library.json` (23 模板)
- **Premium 管线**: `scripts/lib/` + `premium-masters.css` + `template-specs.js` (6 模板)

两套系统代码重复、风格不统一、维护成本高。需要统一到一套架构下。

---

## 二、技术架构方案

### 2.1 推荐架构：三层分离 + Spec 驱动

```
┌─────────────────────────────────────────────────────────────┐
│                    用户输入层 (Input)                        │
│  Markdown / HTML / URL / 自然语言指令                        │
└──────────────────┬──────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              内容理解层 (Content Intelligence)                │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ Source Parser │→│ Semantic     │→│ Slide Planner     │ │
│  │ (确定性)      │  │ Analyzer     │  │ (模型驱动)        │ │
│  └──────────────┘  │ (模型/规则)  │  │ 输出: SlidePlan[] │ │
│                    └──────────────┘  └───────────────────┘ │
└──────────────────┬──────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              渲染执行层 (Rendering Engine)                    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ Template     │→│ Slot Filler  │→│ HTML Renderer     │ │
│  │ Registry     │  │ (预算感知)   │  │ (确定性)          │ │
│  │ (spec 驱动)  │  └──────────────┘  └───────────────────┘ │
│  └──────────────┘                                           │
└──────────────────┬──────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              质量保障层 (Quality Assurance)                   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ Layout       │→│ Reflow       │→│ Theme Engine      │ │
│  │ Validator    │  │ Engine       │  │ (动态样式注入)     │ │
│  └──────────────┘  └──────────────┘  └───────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Theme Engine — 解决"视觉质量"的核心

```javascript
// themes/memphis-editorial.js
export const THEME = {
  id: "memphis-editorial",

  // 色彩系统：主色 + 辅色 + 点缀色，而非机械轮换
  palette: {
    primary:    { bg: "#FF6B6B", fg: "#FFFFFF" },  // 标题、主卡片
    secondary:  { bg: "#4ECDC4", fg: "#1A1A2E" },  // 辅助卡片
    accent:     { bg: "#FFE66D", fg: "#1A1A2E" },  // 高亮、标签
    neutral:    { bg: "#F7F7F7", fg: "#2D3436" },  // 正文底色
    dark:       { bg: "#1A1A2E", fg: "#F7F7F7" },  // 深色底反白
  },

  // 字体系统：层次分明的尺寸梯度
  typography: {
    heroTitle:    { size: "clamp(48px, 6vw, 80px)", weight: 700, family: "Georgia, serif" },
    slideTitle:   { size: "clamp(32px, 4vw, 52px)", weight: 700, family: "Georgia, serif" },
    sectionTitle: { size: "clamp(24px, 3vw, 36px)", weight: 600, family: "Montserrat" },
    body:         { size: "clamp(14px, 1.4vw, 18px)", weight: 400, family: "Montserrat" },
    caption:      { size: "clamp(11px, 1.1vw, 14px)", weight: 500, family: "Montserrat" },
    metric:       { size: "clamp(40px, 5vw, 72px)", weight: 800, family: "Georgia, serif" },
  },

  // 空间系统：呼吸感的关键
  spacing: {
    slide:      { padding: "6%" },
    cardGap:    { value: "clamp(16px, 2vw, 28px)" },
    cardPad:    { value: "clamp(20px, 2.5vw, 36px)" },
    sectionGap: { value: "clamp(12px, 1.5vw, 20px)" },
  },

  // 卡片风格：不同层次的卡片有不同视觉权重
  cardStyles: {
    hero:      { radius: "32px", border: "5px solid", shadow: "12px 12px 0 rgba(26,26,46,0.14)" },
    primary:   { radius: "24px", border: "4px solid", shadow: "8px 8px 0 rgba(26,26,46,0.12)" },
    secondary: { radius: "20px", border: "3px solid", shadow: "6px 6px 0 rgba(26,26,46,0.10)" },
    subtle:    { radius: "16px", border: "2px solid", shadow: "4px 4px 0 rgba(26,26,46,0.08)" },
  },

  // 装饰系统：模板绑定而非随机
  decorations: {
    density: "moderate",   // minimal | moderate | bold
    style: "geometric",    // geometric | organic | mixed
    placement: "anchored"  // random | anchored | frame
  }
}
```

### 2.3 Template Spec — 热插拔的基础

每个模板是一个自描述的 spec：

```javascript
{
  id: "insight-board-v2",
  intent: "insight-board",
  version: 2,

  // 布局定义：CSS Grid 区域
  layout: {
    type: "grid",
    grid: `
      "title    title    title"   auto
      "metric   bullets  panel"   1fr
      "quote    quote    next"    auto
      / 1fr     1.2fr    1fr
    `,
    gap: "var(--cardGap)",
    padding: "var(--slidePadding)"
  },

  // 内容槽位
  slots: {
    title:    { region: "title",   required: true,  maxLines: 2, maxChars: 30 },
    metric:   { region: "metric",  required: false, maxChars: 12, showLabel: true },
    bullets:  { region: "bullets", required: false, maxItems: 3, maxCharsPerItem: 84 },
    panel:    { region: "panel",   required: false, maxLines: 3, maxChars: 120 },
    quote:    { region: "quote",   required: false, maxLines: 2, maxChars: 72 },
    nextStep: { region: "next",    required: false, maxLines: 2, maxChars: 72 }
  },

  // 溢出策略
  overflow: {
    strategy: "graceful-degradation",
    rules: [
      { slot: "bullets", when: "exceeds", action: "drop-tail-items" },
      { slot: "panel",   when: "exceeds", action: "hide-slot" },
      { slot: "metric",  when: "missing", action: "replace-with-text-card" }
    ]
  },

  // 装饰锚点：绑定到布局区域
  decorations: [
    { type: "dot-grid",    anchor: "top-right",    size: "120×120" },
    { type: "accent-ring", anchor: "metric-corner", size: "80×80" },
    { type: "dashed-line", anchor: "bottom-rail",   orientation: "horizontal" }
  ],

  // 主题适配
  themeSlots: {
    title:    { useToken: "primary", emphasis: "high" },
    metric:   { useToken: "accent",  emphasis: "high" },
    panel:    { useToken: "neutral", emphasis: "low" },
    quote:    { useToken: "secondary", emphasis: "medium" }
  }
}
```

### 2.4 Slide Planner — 模型驱动的核心

```javascript
// SlidePlan 输出 schema
{
  deckMeta: {
    title: "string",
    subtitle: "string",
    theme: "memphis-editorial",
    estimatedSlides: 8,
    narrative: "problem → analysis → solution → next-steps"
  },

  slides: [
    {
      id: "slide-01",
      intent: "hero",
      templateId: "hero-cover-v2",
      reasoning: "开篇需要震撼力，用大标题+配图建立主题",
      content: {
        title: "AI 驱动的设计革命",
        dek: "从工具到思维的范式转变",
        tags: ["设计", "AI", "趋势"],
        visual: { type: "placeholder", aspectRatio: "16:9" }
      },
      themeDirective: {
        bg: "dark",
        titleColor: "accent",
        mood: "dramatic"
      }
    }
  ]
}
```

### 2.5 自然语言动态调整

```javascript
// 用户输入: "把第三页改成深色背景，标题用白色"
export async function applyUserEdit(deckPlan, userInstruction, model) {
  // 1. 把用户指令 + 当前 deck plan 一起发给模型
  const editPlan = await model.chat({
    messages: [
      { role: "system", content: EDIT_SYSTEM_PROMPT },
      { role: "user", content: `
当前 deck plan:
${JSON.stringify(deckPlan, null, 2)}

用户指令: "${userInstruction}"

请输出修改后的 deck plan JSON。只修改用户要求的部分，其余保持不变。
` }
    ],
    response_format: { type: "json_object" }
  });

  // 2. 验证修改后的 plan 仍然合法
  const validated = validateSlidePlan(editPlan);

  // 3. 重新渲染受影响的 slides
  return renderDeck(validated);
}
```

**关键设计决策**：用户的自然语言修改操作的是 `deckPlan`（语义层），而不是直接改 HTML（渲染层）。这样：
- 修改是可逆的（改回就是还原 plan）
- 修改是可组合的（多次修改叠加）
- 修改是可审计的（每步都有 reasoning）

---

## 三、PPT 设计专业性分析

### 3.1 「页面节奏感」

真实的好 PPT 有呼吸节奏：**重 → 轻 → 重 → 轻**。

```
当前: [满文字] [满文字] [满文字] [满文字]  ← 全部一样"重"
理想: [震撼标题] [3 个要点] [全屏图] [数据冲击] [收尾]  ← 有起伏
```

在 Slide Planner 的 intent 系统中加入 `density` 属性：

```javascript
intents: {
  "hero":           { density: "sparse",  visualWeight: "heavy" },   // 大留白+大标题
  "thesis":         { density: "moderate", visualWeight: "medium" },  // 1 个核心观点
  "insight-board":  { density: "rich",    visualWeight: "heavy" },   // 信息密集但有结构
  "image-narrative":{ density: "sparse",  visualWeight: "image" },   // 图片主导
  "metric":         { density: "minimal", visualWeight: "number" },  // 一个数字冲击
  "closing":        { density: "sparse",  visualWeight: "medium" },  // 呼应开篇
}
```

### 3.2 「视觉锚点」

好的 PPT 每页都有一个明确的视觉锚点（Focal Point），让人一眼知道"这页在说什么"。

每个模板的 `slots` 必须声明 `visualWeight: "primary" | "secondary" | "tertiary"`：
- 一个模板最多 1 个 primary、2 个 secondary，其余都是 tertiary
- 渲染器根据 weight 调整卡片大小、颜色饱和度、字体大小

### 3.3 「色彩情绪」匹配

让 Slide Planner 输出 `mood` 指令，而非机械轮换颜色：

```javascript
moods: {
  "confident":   { primary: "blue",    accent: "gold",   decorDensity: "moderate" },
  "urgent":      { primary: "red",     accent: "orange", decorDensity: "bold" },
  "calm":        { primary: "mint",    accent: "navy",   decorDensity: "minimal" },
  "creative":    { primary: "pink",    accent: "yellow", decorDensity: "bold" },
  "analytical":  { primary: "navy",    accent: "teal",   decorDensity: "moderate" }
}
```

### 3.4 「图片/视觉元素融入方式」

```javascript
visualStyles: {
  "full-bleed":      "图片铺满整个 slide 背景，文字叠加在半透明蒙层上",
  "editorial-strip": "图片作为垂直/水平条带穿插在文字之间",
  "card-embed":      "图片嵌入卡片内部，带圆角裁剪",
  "diagonal-clip":   "图片用对角线/曲线裁剪，创造动感",
  "collage":         "多张小图拼贴，带重叠和旋转"
}
```

### 3.5 专业 PPT 设计核心原则

来自 Venngage、Duarte 等专业设计方法论的提炼：

**视觉层次**
- 每页只有一个核心信息点（One major takeaway per slide）
- 用字号、字重、颜色建立焦点："更大、更亮、更粗的元素主导注意力"
- 如果所有内容都被高亮，等于没有高亮

**字体规范**
- Sans-serif 字体（Montserrat, Roboto）更适合屏幕阅读
- 标题和正文的字重差异要明显（Bold vs Regular）
- 避免全大写（降低可读性）
- 文字要通过"6 秒测试"——观众应在 6 秒内理解页面含义

**色彩规范**
- 先建调色板再做设计，全程保持一致
- 使用高对比度色彩方案
- 避免红绿组合（色觉障碍友好）
- 同一图标颜色在 deck 内保持一致

**布局与留白**
- 白色空间给内容结构、平衡和呼吸感
- 在 deck 内变化页面布局（2 栏、3 栏、图文混排等交替）
- 使用左对齐而非居中（更容易追踪阅读）
- 行间距要宽松，减少视觉杂乱

**内容密度**
- 每页不超过约 40 个字（参考 Airbnb pitch deck 模型）
- 演示时长分钟数 ≈ 最少幻灯片数
- 至少 84% 的内容应该是视觉主导的
- 用图表、时间线、图标替代文字

---

## 四、实施路线图

### Phase 1: 视觉质量快速提升（1-2 周）

**目标**：不改架构，只改 CSS + 模板渲染器，立刻提升视觉质量

| 改动 | 影响 | 工作量 |
|------|------|--------|
| 引入 Theme Token 系统 | 统一色彩管理，支持主题切换 | 中 |
| 调整 typography scale | 标题更大更粗，正文更小更精致 | 小 |
| 增加 spacing / 留白 | 卡片内边距、卡片间距增大 | 小 |
| 差异化卡片风格 | hero 卡片 vs 普通卡片 vs 标签卡片 | 中 |
| 装饰元素绑定到模板 anchor | 消除随机感 | 中 |

### Phase 2: 模型驱动规划（2-3 周）

**目标**：用模型替代轮换制，内容匹配合适的模板

| 改动 | 影响 | 工作量 |
|------|------|--------|
| Source Parser 增强 | 保留更多结构信息 | 中 |
| Slide Planner 实现 | 内容语义驱动模板选择 | 大 |
| SlidePlan schema + 验证 | 确保输出合法 | 中 |
| 自然语言编辑接口 | 支持用户动态调整 | 中 |

### Phase 3: 模板扩展 + 热插拔（2-3 周）

**目标**：从 6 个 premium 模板扩展到 12-15 个，支持自定义模板

| 改动 | 影响 | 工作量 |
|------|------|--------|
| Grid-based 布局替代绝对定位 | 响应式 + 可维护 | 大 |
| 模板注册 + 发现机制 | 热插拔基础 | 中 |
| 新增模板 | 覆盖更多内容类型 | 中 |
| Layout Validator + Reflow | 防止文字溢出 | 中 |

### Phase 4: 精细化 + 评估（持续）

| 改动 | 影响 | 工作量 |
|------|------|--------|
| 视觉质量评估 benchmark | 量化改进效果 | 中 |
| A/B 测试框架 | 对比不同模板策略 | 小 |
| 用户反馈收集 | 指导优化方向 | 小 |

---

## 五、核心技术决策

| 决策点 | 建议 | 理由 |
|--------|------|------|
| 布局系统 | **CSS Grid 为主 + 少量 absolute** | Grid 自带响应式，绝对定位维护成本高 |
| 模板尺寸 | **响应式为主，固定比例（16:9）** | `aspect-ratio: 16/9` + `container queries` |
| 装饰系统 | **SVG sprite + CSS custom properties** | 可复用、可主题化、体积小 |
| 模型调用频率 | **一次调用规划整副 deck** | 成本可控，上下文完整 |
| 主题切换 | **CSS Variables + Theme JSON** | 运行时零成本切换 |
| 自然语言编辑 | **操作 SlidePlan 而非 HTML** | 可逆、可组合、可审计 |
| 双管线统一 | **逐步统一到 premium 管线** | 减少维护负担，premium 架构更优 |

---

## 六、SVG-First 设计策略

### 6.1 为什么 SVG-First

基于实际对比测试，基于 SVG 设计稿还原的 HTML 效果明显优于纯 HTML 自由创作：

| 方式 | 效果 | 原因 |
|------|------|------|
| SVG 设计稿 → HTML 还原 | 视觉质量高 | 设计师先在 SVG 中精确控制每个元素的位置、大小、间距 |
| 纯 HTML 自由创作 | 质量不稳定 | 缺少视觉锚点，容易出现比例失调、层次混乱 |

### 6.2 设计流程

```
1. 设计师在 SVG 中完成精确布局 (1600×900 画布)
2. 从 SVG 提取布局信息: { regions, slots, decorations }
3. 生成 Template Spec: { id, intent, layout, slots, decorations, overflow }
4. 生成 HTML Renderer: function renderXxx(slidePlan, theme) → HTML string
5. 生成 CSS: Grid/Flex 布局 + 主题变量 + 装饰元素样式
6. Playwright 验证: 检查溢出、对齐、间距
```

### 6.3 SVG → HTML 映射规则

```javascript
const SVG_TO_HTML = {
  // 布局映射
  "rect with filter+stroke":  → "div.pm-card with border+shadow",
  "g[transform=translate(x)]" → "grid-area: named-region",

  // 排版映射
  ".title (88px Georgia)":    → "h1 (clamp(48px,6vw,88px))",
  ".subtitle (28px)":         → "h2 (clamp(18px,2.4vw,28px))",
  ".body (21px)":             → "p (clamp(14px,1.4vw,21px))",
  ".card-title (26px)":       → "h3 (clamp(18px,2vw,26px))",
  ".big-number (118px)":      → "span.metric (clamp(60px,8vw,118px))",

  // 色彩映射
  "fill=#FF3DA5 (pink)":      → "var(--pm-pink)",
  "fill=#FFF8EE (paper)":     → "var(--pm-paper)",
  "stroke=#1A1A2E (ink)":     → "var(--pm-ink)",
}
```

### 6.4 SVG→HTML 质量损失点与对策

| 损失点 | SVG 表现 | HTML 还原对策 |
|--------|----------|--------------|
| 硬阴影丢失 | feDropShadow dx=10 dy=10 stdDev=0 | `box-shadow: 10px 10px 0` (不能用 blur) |
| 描边粗细不一致 | stroke-width=6 (1600px 画布) | `border: max(3px, 0.375vw)` 响应式描边 |
| 装饰元素位置漂移 | 绝对坐标精确到 px | `position: absolute + top/left/right/bottom` |
| 字体渲染差异 | 字号直接是 px | 确保 `font-display: swap` |
| 卡片间距不精确 | 手工测量的像素间距 | 用 CSS Grid + gap, 不用 margin hack |
