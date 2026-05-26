# Memphis PPT 免费商用字体调研报告

## 问题背景

当前 PPT 模板使用系统字体：标题用 `Impact`（英文），正文用 `Arial`，中文回退到 `Microsoft YaHei` / `PingFang SC`。问题在于：

- **Impact 是纯英文字体**，中文字符会回退到微软雅黑，粗细和风格完全不匹配
- **Arial 和雅黑**视觉差异大，中英文混排时节奏感不一致
- 缺乏 Memphis 风格需要的**粗壮、几何感、活泼**的字体特征

## 核心需求

| 需求 | 说明 |
|------|------|
| 中英文统一 | 同一字体家族同时覆盖中英文，或视觉高度匹配的两个字体 |
| 粗壮字重 | 至少提供 Bold(700) / Black(900)，用于 Memphis 标题 |
| 几何感 | 无衬线、笔画均匀、结构清晰，符合 Memphis 几何美学 |
| 免费商用 | OFL / Apache / 明确免费商用声明 |
| CDN 可用 | 优先选择 Google Fonts 或有 CDN 的字体，避免本地文件依赖 |

## 调研结果：推荐字体方案

### 方案一：Noto Sans SC + Montserrat（推荐）

**最稳妥的选择，Google Fonts 官方支持，CDN 直接可用。**

| 项目 | Noto Sans SC | Montserrat |
|------|-------------|------------|
| 开发者 | Google + Adobe | Julieta Ulanovsky |
| 许可证 | OFL (免费商用) | OFL (免费商用) |
| 字重 | Thin~Black (9档) | Thin~Black (9档) |
| 风格 | 几何无衬线，笔画均匀 | 几何无衬线，圆润友好 |
| CDN | Google Fonts | Google Fonts |
| 中文覆盖 | 简繁中文 + 日韩 | 仅英文 |

**搭配逻辑：** Noto Sans SC 和 Montserrat 都是几何无衬线，笔画粗细和 x-height 接近。标题用 Black(900)，正文用 Regular(400)。

**CDN 引入：**
```html
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Noto+Sans+SC:wght@400;700;900&display=swap" rel="stylesheet">
```

**CSS 使用：**
```css
--font-title: 'Montserrat', 'Noto Sans SC', sans-serif;
--font-body: 'Noto Sans SC', 'Montserrat', sans-serif;
```

---

### 方案二：思源黑体 + Space Grotesk

**更现代、更有科技感的搭配。**

| 项目 | 思源黑体 (Source Han Sans) | Space Grotesk |
|------|--------------------------|---------------|
| 开发者 | Google + Adobe | Florian Karsten |
| 许可证 | OFL | OFL |
| 字重 | ExtraLight~Heavy (7档) | Light~Bold (5档) |
| 风格 | 中性几何，专业感强 | 几何等宽感，科技气质 |
| CDN | Google Fonts (Noto Sans SC) | Google Fonts |

**搭配逻辑：** Space Grotesk 的字母间距和笔画末端处理更"技术向"，适合命令行、代码相关内容。思源黑体 Heavy 对应英文 Bold。

**CDN 引入：**
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Noto+Sans+SC:wght@400;700;900&display=swap" rel="stylesheet">
```

---

### 方案三：阿里巴巴普惠体 + Outfit

**更有温度、更友好的风格。**

| 项目 | 阿里巴巴普惠体 (Alibaba PuHuiTi) | Outfit |
|------|--------------------------------|--------|
| 开发者 | 阿里巴巴 | Rodrigo Fuenzalida |
| 许可证 | 免费商用（阿里官方声明） | OFL |
| 字重 | Light~Black (9档) | Thin~Black (9档) |
| 风格 | 圆润友好，笔画略带弧度 | 几何圆润，现代感 |
| CDN | 需自托管或使用阿里 CDN | Google Fonts |

**搭配逻辑：** 普惠体的笔画末端有微妙的圆角处理，和 Outfit 的圆润几何风格天然匹配。适合偏"温暖"的 Memphis 风格。

**注意：** 普惠体不在 Google Fonts 上，需要自行托管或使用阿里 CDN。文件较大（完整版约 10MB+），建议按需裁剪。

---

### 方案四：得意黑 + Bebas Neue

**最 Memphis、最大胆的搭配，但适用场景较窄。**

| 项目 | 得意黑 (Smiley Sans) | Bebas Neue |
|------|---------------------|------------|
| 开发者 | 设计师 iDestin | Ryoichi Tsunekawa |
| 许可证 | OFL | OFL |
| 字重 | Regular (1档) | Regular (1档) |
| 风格 | 扭曲活泼，手绘感 | 窄体大写，冲击力强 |
| CDN | 需自托管 | Google Fonts |

**搭配逻辑：** 得意黑是目前最有"性格"的免费中文字体，笔画有微妙的扭曲和不规则感，非常适合 Memphis 的活泼气质。Bebas Neue 是经典窄体大写英文。两者组合冲击力极强。

**局限：** 得意黑只有 Regular 一个字重，不适合正文长文；字形偏艺术化，小尺寸可读性一般。

---

### 方案五：站酷高端黑 + Oswald

**粗壮有力，适合大标题场景。**

| 项目 | 站酷高端黑 | Oswald |
|------|-----------|--------|
| 开发者 | 站酷 | Vernon Adams |
| 许可证 | 免费商用 | OFL |
| 字重 | Regular (1档) | Light~Bold (3档) |
| 风格 | 粗壮有力，黑体风格 | 窄体压缩，适合标题 |
| CDN | 需自托管 | Google Fonts |

**搭配逻辑：** 站酷高端黑本身就是粗体风格，和 Oswald 的窄体压缩形成对比。适合需要强烈视觉冲击的封面和标题页。

**局限：** 站酷高端黑只有单一字重，正文需要用其他字体。

---

## 综合对比

| 方案 | Memphis 适配度 | 中英统一性 | CDN 便利性 | 字重丰富度 | 推荐场景 |
|------|:---:|:---:|:---:|:---:|------|
| **Noto Sans SC + Montserrat** | ★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | 通用首选 |
| 思源黑体 + Space Grotesk | ★★★★ | ★★★★★ | ★★★★★ | ★★★★ | 科技/技术主题 |
| 阿里巴巴普惠体 + Outfit | ★★★★ | ★★★★★ | ★★★ | ★★★★★ | 温暖友好风格 |
| 得意黑 + Bebas Neue | ★★★★★ | ★★★ | ★★ | ★★ | 创意大标题 |
| 站酷高端黑 + Oswald | ★★★★ | ★★★ | ★★ | ★★ | 冲击力标题 |

## 最终推荐

**采用方案一：Noto Sans SC + Montserrat**

理由：
1. **Google Fonts 官方 CDN**，零配置即可使用
2. **9 个字重全覆盖**，从 Thin 到 Black，满足 Memphis 各层级需求
3. **中英文同为几何无衬线**，混排时视觉节奏一致
4. **OFL 许可证**，无任何商用限制
5. **字库完整**，覆盖简繁中文 + 日韩 + 西里尔文
6. **社区活跃**，持续维护更新

补充：在封面和关键标题页，可额外引入 **Bebas Neue** 作为英文展示字体，增强 Memphis 的冲击力。

## 引入方式

```html
<!-- Google Fonts CDN -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;700;900&family=Noto+Sans+SC:wght@400;700;900&display=swap" rel="stylesheet">
```

```css
/* CSS 变量 */
:root {
  --font-title: 'Montserrat', 'Noto Sans SC', sans-serif;
  --font-title-display: 'Bebas Neue', 'Montserrat', 'Noto Sans SC', sans-serif;
  --font-body: 'Noto Sans SC', 'Montserrat', sans-serif;
}

/* 标题 */
.slide-title {
  font-family: var(--font-title);
  font-weight: 900;
}

/* 封面大标题 */
.hero-title {
  font-family: var(--font-title-display);
  font-weight: 400; /* Bebas Neue 只有 400 */
}

/* 正文 */
.slide-body, .bullet-item {
  font-family: var(--font-body);
  font-weight: 400;
}
```
