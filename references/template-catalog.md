# Template Catalog

26 templates total. Do not invent ad-hoc layouts outside this catalog.

---

## Part A: Base Templates (11)

| Id | Fit | Capacity | Use |
|---|---|---|---|
| `hero-cover` | Opening / title section | 1 lead + 2 text cards + 4 bullets | Title slide and intro |
| `narrative-split` | Explanatory prose | 2 paragraphs + 2 bullet cards | Why / core idea sections |
| `bullet-grid` | Dense bullet lists | 6 bullets + 1 note | Lists and feature inventories |
| `command-board` | Commands / code / paths | 2 paragraphs + 6 bullets | CLI, paths, commands, code |
| `process-lane` | Steps / sequence / flow | 1 paragraph + 4 steps | Process, workflow, order |
| `compare-dual` | Contrast / comparison | 2 paragraphs + 4 bullets | Compare, contrast, difference |
| `warning-callout` | Constraints / risks / cautions | 2 paragraphs + 4 bullets | Safety, guardrails, defaults |
| `metric-board` | Numbers / counts / stats | 1 note + 4 metric tiles | Numeric or data-heavy sections |
| `stack-note` | Principle / concept stack | 3 paragraphs + 3 bullets | Design principles and rules |
| `essay-panel` | Longer exposition | 3 paragraphs + 2 bullets | Dense explanatory sections |
| `closing-card` | Conclusion / final emphasis | 1 paragraph + 4 bullets | Final section only |

### Base Layout Rules

- `hero-cover`: large title block top-left, supporting cards on the right.
- `narrative-split`: one wide text card plus two support cards.
- `bullet-grid`: two-by-two or three-by-two card grid; every bullet appears once only.
- `command-board`: commands and paths in roomy cards with monospaced emphasis.
- `process-lane`: ordered steps with stable numbering on a vertical track.
- `compare-dual`: left and right cards carry distinct source content.
- `warning-callout`: emphasize constraints, defaults, or risks with readable spacing.
- `metric-board`: source-derived counts or clearly labeled structural metrics.
- `stack-note`: related paragraphs and bullets in layered cards with rotation.
- `essay-panel`: reserve the largest card for the densest paragraph.
- `closing-card`: only for the actual concluding section of the source.

---

## Part B: Extended Templates (15)

### 12. `quote-insight` - 引言洞察

**Design Intent:** Present a key insight, expert quote, or memorable statement with visual emphasis. Creates a single focal point with large quote and attribution.

**Core Layout:**
```
┌─────────────────────────────────────────────────────┐
│ [Section Chip]                          [Page Chip] │
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │         "Quote text goes here"              │   │
│   │         in large italic type                │   │
│   │    — Attribution Name, Title                │   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│   │ Context  │  │ Context  │  │ Context  │         │
│   │ Card 1   │  │ Card 2   │  │ Card 3   │         │
│   └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────┘
```

**Capacity:** 1 quote (180 chars) + 1 attribution (60 chars) + 2-3 context bullets (80 chars each)
**Use Cases:** Expert quotes, key insights, thesis statements, memorable stakeholder statements

---

### 13. `icon-grid` - 图标网格

**Design Intent:** Present multiple related items where each needs equal visual weight and a quick icon identifier. Leads with icons, keeps descriptions minimal.

**Core Layout:**
```
┌─────────────────────────────────────────────────────┐
│   Title                                     [icon]  │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│   │  [ico]  │ │  [ico]  │ │  [ico]  │ │  [ico]  │  │
│   │  Label  │ │  Label  │ │  Label  │ │  Label  │  │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│   │  [ico]  │ │  [ico]  │ │  [ico]  │ │  [ico]  │  │
│   │  Label  │ │  Label  │ │  Label  │ │  Label  │  │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────────────────┘
```

**Capacity:** 1 title + 1 subtitle + 6-8 icon tiles (label 20 chars + desc 60 chars each)
**Use Cases:** Product features, service categories, tech stack, team capabilities, integrations

---

### 14. `faq-panel` - 问答面板

**Design Intent:** Present Q&A in a scannable format with visual distinction between questions and answers.

**Core Layout:**
```
┌─────────────────────────────────────────────────────┐
│   Title                                     [icon]  │
│   ┌─────────────────────────────────────────────┐   │
│   │ ? Question text                             │   │
│   │ ─────────────────────────────────────────── │   │
│   │   Answer text with explanation              │   │
│   └─────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────┐   │
│   │ ? Question 2                                │   │
│   │ ─────────────────────────────────────────── │   │
│   │   Answer 2                                  │   │
│   └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Capacity:** 1 title + 3-4 Q&A pairs (question 80 chars + answer 150 chars each)
**Use Cases:** FAQ sections, objection handling, common misconceptions, interview prep

---

### 15. `agenda-overview` - 议程概览

**Design Intent:** Present a table of contents, agenda, or roadmap overview showing the structure of a presentation or project.

**Core Layout:**
```
┌─────────────────────────────────────────────────────┐
│   Title                                     [icon]  │
│   ┌──────┐ ┌────────────────────────────────────┐   │
│   │  01  │ │ Topic 1 Title                      │   │
│   └──────┘ └────────────────────────────────────┘   │
│   ┌──────┐ ┌────────────────────────────────────┐   │
│   │  02  │ │ Topic 2 Title                      │   │
│   └──────┘ └────────────────────────────────────┘   │
│   ┌──────┐ ┌────────────────────────────────────┐   │
│   │  03  │ │ Topic 3 Title                      │   │
│   └──────┘ └────────────────────────────────────┘   │
│   ┌──────┐ ┌────────────────────────────────────┐   │
│   │  04  │ │ Topic 4 Title                      │   │
│   └──────┘ └────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Capacity:** 1 title + 1 subtitle + 4-6 agenda items (number + title 50 chars + desc 80 chars)
**Use Cases:** Presentation agenda, project roadmap, workshop schedule, training curriculum

---

### 16. `image-showcase` - 图片展示

**Design Intent:** Make a visual the primary element with minimal supporting text. For product screenshots, diagrams, photos.

**Core Layout:**
```
┌─────────────────────────────────────────────────────┐
│   Title                                     [icon]  │
│   ┌─────────────────────────────────────────────┐   │
│   │                                             │   │
│   │           [IMAGE / DIAGRAM]                 │   │
│   │                                             │   │
│   └─────────────────────────────────────────────┘   │
│   ┌──────────────────┐  ┌──────────────────┐        │
│   │ Caption 1        │  │ Caption 2        │        │
│   └──────────────────┘  └──────────────────┘        │
└─────────────────────────────────────────────────────┘
```

**Capacity:** 1 title + 1 image area + 1-2 caption cards (100 chars each)
**Use Cases:** Product screenshots, architecture diagrams, flowcharts, photos, UI mockups

---

### 17. `checklist-board` - 清单面板

**Design Intent:** Present requirements, prerequisites, or action items in checkbox format with visual completion status.

**Core Layout:**
```
┌─────────────────────────────────────────────────────┐
│   Title                                     [icon]  │
│   ┌─────────────────────────────────────────────┐   │
│   │ ☑ Item 1: Description text here             │   │
│   │ ☑ Item 2: Description text here             │   │
│   │ ☐ Item 3: Description text here             │   │
│   │ ☐ Item 4: Description text here             │   │
│   └─────────────────────────────────────────────┘   │
│   ┌──────────────────┐  ┌──────────────────┐        │
│   │ Note 1           │  │ Note 2           │        │
│   └──────────────────┘  └──────────────────┘        │
└─────────────────────────────────────────────────────┘
```

**Capacity:** 1 title + 1 subtitle + 5-8 checklist items (80 chars each) + 1-2 notes
**Use Cases:** Prerequisites, action items, feature lists, quality checklists, launch readiness

---

### 18. `horizontal-timeline` - 水平时间线

**Design Intent:** Present timelines where horizontal layout is more natural. Better for time-based progressions and roadmaps than vertical `process-lane`.

**Core Layout:**
```
┌─────────────────────────────────────────────────────┐
│   Title                                     [icon]  │
│   ┌─────────────────────────────────────────────┐   │
│   │  ●────────●────────●────────●────────●      │   │
│   │ Phase 1  Phase 2  Phase 3  Phase 4  Phase 5 │   │
│   │ Desc     Desc     Desc     Desc     Desc    │   │
│   └─────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────┐   │
│   │ Supporting context or notes                 │   │
│   └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Capacity:** 1 title + 1 subtitle + 4-6 phases (label 20 chars + desc 60 chars) + 1 note
**Use Cases:** Project timelines, product roadmaps, historical progressions, quarterly plans

---

### 19. `stat-highlight` - 数据亮点

**Design Intent:** Focus all attention on a single key statistic with maximum visual impact. Unlike `metric-board` which shows multiple metrics.

**Core Layout:**
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                    [STAT NUMBER]                     │
│                    Label text                       │
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │ Context paragraph explaining the stat       │   │
│   └─────────────────────────────────────────────┘   │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│   │ Detail 1 │  │ Detail 2 │  │ Detail 3 │         │
│   └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────┘
```

**Capacity:** 1 hero number (15 chars) + 1 label (40 chars) + 1 context paragraph (180 chars) + 2-3 details
**Use Cases:** KPI highlights, headline stats, before/after metrics, goal achievement, market size

---

### 20. `hierarchy-tree` - 层级树

**Design Intent:** Present organizational structures, system architectures, or hierarchical relationships with parent-child branching.

**Core Layout:**
```
┌─────────────────────────────────────────────────────┐
│   Title                                     [icon]  │
│                    ┌─────────┐                      │
│                    │ Root    │                      │
│                    └────┬────┘                      │
│            ┌────────┼────────┐                      │
│       ┌────┴────┐ ┌──┴──┐ ┌──┴──┐                  │
│       │ Child 1 │ │  2  │ │  3  │                  │
│       └────┬────┘ └─────┘ └─────┘                  │
│       ┌────┼────┐                                   │
│  ┌────┴──┐ ┌┴────┐                                 │
│  │Leaf 1 │ │Leaf 2│                                 │
│  └───────┘ └─────┘                                 │
│   ┌─────────────────────────────────────────────┐   │
│   │ Description or context                      │   │
│   └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Capacity:** 1 title + 1 root (30 chars) + 3-5 children (25 chars) + 2-4 leaves (25 chars) + 1 description
**Use Cases:** Org charts, system architecture, decision trees, category hierarchies, menu structures

---

### 21. `swim-lane` - 泳道图

**Design Intent:** Present parallel processes or workflows happening simultaneously across different teams or systems.

**Core Layout:**
```
┌─────────────────────────────────────────────────────┐
│   Title                                     [icon]  │
│   ┌──────────┬──────────┬──────────┬──────────┐     │
│   │ Phase 1  │ Phase 2  │ Phase 3  │ Phase 4  │     │
│   ├──────────┼──────────┼──────────┼──────────┤     │
│   │ Lane A   │ Task A1  │ Task A2  │ Task A3  │     │
│   ├──────────┼──────────┼──────────┼──────────┤     │
│   │ Lane B   │ Task B1  │ Task B2  │          │     │
│   ├──────────┼──────────┼──────────┼──────────┤     │
│   │ Lane C   │ Task C1  │ Task C2  │ Task C3  │     │
│   └──────────┴──────────┴──────────┴──────────┘     │
└─────────────────────────────────────────────────────┘
```

**Capacity:** 1 title + 3-4 phase headers + 3-4 lane labels + 6-10 task items (40 chars each)
**Use Cases:** Cross-functional workflows, parallel development, multi-team coordination, release processes

---

### 22. `data-table` - 数据表格

**Design Intent:** Present structured data in tabular format with headers and rows. Better for comparisons and specs than card-based layouts.

**Core Layout:**
```
┌─────────────────────────────────────────────────────┐
│   Title                                     [icon]  │
│   ┌──────────┬──────────┬──────────┬──────────┐     │
│   │ Header 1 │ Header 2 │ Header 3 │ Header 4 │     │
│   ├──────────┼──────────┼──────────┼──────────┤     │
│   │ Row 1    │ Data     │ Data     │ Data     │     │
│   ├──────────┼──────────┼──────────┼──────────┤     │
│   │ Row 2    │ Data     │ Data     │ Data     │     │
│   ├──────────┼──────────┼──────────┼──────────┤     │
│   │ Row 3    │ Data     │ Data     │ Data     │     │
│   └──────────┴──────────┴──────────┴──────────┘     │
│   ┌─────────────────────────────────────────────┐   │
│   │ Note or footnote                            │   │
│   └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Capacity:** 1 title + 1 subtitle + 3-4 column headers (20 chars) + 4-6 rows (30 chars/cell) + 1 note
**Use Cases:** Feature comparisons, pricing tables, specifications, reference data, survey results

---

### 23. `feature-benefit` - 功能收益

**Design Intent:** Pair each feature with its corresponding benefit in a structured format, making the value proposition explicit.

**Core Layout:**
```
┌─────────────────────────────────────────────────────┐
│   Title                                     [icon]  │
│   ┌─────────────────────────────────────────────┐   │
│   │ ┌─────────────────┐ ┌─────────────────┐    │   │
│   │ │ [ico] Feature   │ │ [ico] Benefit   │    │   │
│   │ │ Description     │ │ Description     │    │   │
│   │ └─────────────────┘ └─────────────────┘    │   │
│   └─────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────┐   │
│   │ ┌─────────────────┐ ┌─────────────────┐    │   │
│   │ │ [ico] Feature   │ │ [ico] Benefit   │    │   │
│   │ │ Description     │ │ Description     │    │   │
│   │ └─────────────────┘ └─────────────────┘    │   │
│   └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Capacity:** 1 title + 1 subtitle + 3-4 feature-benefit pairs (label 25 chars + desc 60 chars each)
**Use Cases:** Product value propositions, sales presentations, feature announcements, competitive advantages

---

### 24. `contact-cta` - 联系行动

**Design Intent:** Present contact information and calls to action in a clear, actionable format. Focused on specific actions the audience should take.

**Core Layout:**
```
┌─────────────────────────────────────────────────────┐
│              [LARGE ICON]                           │
│              Title / CTA Text                       │
│              Supporting message                     │
│   ┌─────────────────────────────────────────────┐   │
│   │  [icon]  action@example.com                 │   │
│   │  [icon]  +1 (555) 123-4567                  │   │
│   │  [icon]  https://example.com                │   │
│   └─────────────────────────────────────────────┘   │
│   ┌──────────────────┐  ┌──────────────────┐        │
│   │ Next Step 1      │  │ Next Step 2      │        │
│   └──────────────────┘  └──────────────────┘        │
└─────────────────────────────────────────────────────┘
```

**Capacity:** 1 title + 1 subtitle + 2-3 contact items (50 chars) + 1-2 next step cards (80 chars)
**Use Cases:** Contact slides, CTAs, next steps after meetings, support channels, sign-up prompts

---

### 25. `before-after` - 前后对比

**Design Intent:** Show transformations or improvements in a clear side-by-side format with a visual transformation arrow.

**Core Layout:**
```
┌─────────────────────────────────────────────────────┐
│   Title                                     [icon]  │
│   ┌─────────────────────────────────────────────┐   │
│   │  ┌─────────────────┐  ┌─────────────────┐  │   │
│   │  │    BEFORE       │  │     AFTER       │  │   │
│   │  │  [Content]      │  │  [Content]      │  │   │
│   │  └─────────────────┘  └─────────────────┘  │   │
│   │           ────────► TRANSFORMATION ────────►│   │
│   └─────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────┐   │
│   │ Key improvement metrics or summary          │   │
│   └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Capacity:** 1 title + 1 subtitle + 1 before block (150 chars) + 1 after block (150 chars) + 2-3 improvements
**Use Cases:** Case study results, redesign showcases, process improvements, performance optimizations

---

### 26. `layer-stack` - 层叠堆栈

**Design Intent:** Present layered or stacked concepts (tech stacks, abstraction layers, priority tiers) with visual depth through overlapping layers.

**Core Layout:**
```
┌─────────────────────────────────────────────────────┐
│   Title                                     [icon]  │
│   ┌─────────────────────────────────────────────┐   │
│   │  Layer 3 (Top)                              │   │
│   │  Description text                           │   │
│   ├─────────────────────────────────────────────┤   │
│   │  Layer 2 (Middle)                           │   │
│   │  Description text                           │   │
│   ├─────────────────────────────────────────────┤   │
│   │  Layer 1 (Bottom)                           │   │
│   │  Description text                           │   │
│   └─────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────┐   │
│   │ Additional context or notes                 │   │
│   └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Capacity:** 1 title + 3-5 stacked layers (label 30 chars + desc 80 chars) + 1 note
**Use Cases:** Technology stacks, abstraction layers, priority tiers, security layers, data architecture

---

## Template Selection Order

1. First section → `hero-cover`
2. Final section → `closing-card`
3. Commands/code → `command-board`
4. Workflow/steps → `process-lane`
5. Comparison → `compare-dual`
6. Warning/constraints → `warning-callout`
7. Numbers/stats → `metric-board`
8. Dense prose → `essay-panel`
9. Dense bullets → `bullet-grid`
10. Principles/concepts → `stack-note`
11. Quote/insight → `quote-insight`
12. Icon-based features → `icon-grid`
13. Q&A format → `faq-panel`
14. Agenda/overview → `agenda-overview`
15. Visual showcase → `image-showcase`
16. Checklist items → `checklist-board`
17. Horizontal timeline → `horizontal-timeline`
18. Single key stat → `stat-highlight`
19. Hierarchical structure → `hierarchy-tree`
20. Parallel processes → `swim-lane`
21. Tabular data → `data-table`
22. Feature-benefit pairs → `feature-benefit`
23. Contact/CTA → `contact-cta`
24. Before/after → `before-after`
25. Layered architecture → `layer-stack`
26. Default → `narrative-split`

## Capacity Summary

| Template | Paragraphs | Bullets | Special Elements |
|----------|-----------|---------|------------------|
| `hero-cover` | 1 | 4 | title, subtitle |
| `narrative-split` | 2 | 2 | — |
| `bullet-grid` | 1 | 6 | — |
| `command-board` | 2 | 6 | monospace |
| `process-lane` | 1 | 4 | timeline track |
| `compare-dual` | 2 | 4 | 2 columns |
| `warning-callout` | 2 | 4 | callout box |
| `metric-board` | 1 | 4 | metric tiles |
| `stack-note` | 3 | 3 | rotated cards |
| `essay-panel` | 3 | 2 | wide panel |
| `closing-card` | 1 | 4 | centered |
| `quote-insight` | 2 | 3 | quote + attribution |
| `icon-grid` | 1 | 0 | 6-8 icon tiles |
| `faq-panel` | 0 | 0 | 3-4 Q&A pairs |
| `agenda-overview` | 1 | 0 | 4-6 agenda items |
| `image-showcase` | 1 | 0 | 1 image, 2 captions |
| `checklist-board` | 1 | 6-8 | checkboxes |
| `horizontal-timeline` | 1 | 0 | 4-6 phases |
| `stat-highlight` | 1 | 3 | 1 hero number |
| `hierarchy-tree` | 1 | 0 | 8-12 nodes |
| `swim-lane` | 0 | 0 | 6-10 tasks in grid |
| `data-table` | 1 | 0 | 4-6 rows, 3-4 cols |
| `feature-benefit` | 1 | 0 | 3-4 pairs |
| `contact-cta` | 1 | 0 | 2-3 contact items |
| `before-after` | 1 | 3 | 2 content blocks |
| `layer-stack` | 0 | 0 | 3-5 stacked layers |
