# Template Selection

## Hard Rules

- Never remove source content to fit a target page count.
- Never invent new text to fill empty space.
- Never repeat the same source sentence in more than one region of the same slide.
- Keep section title placement fixed at the top-left of every slide.
- Keep page marker placement fixed at the bottom-right of every slide.

## Signals

- `hasCommands`: backticks, command names, file paths, flags, code-like fragments.
- `hasProcess`: sequence words, workflow language, ordered action verbs.
- `hasCompare`: compare / contrast framing.
- `hasWarning`: safety, boundary, default, guardrail, must, should, never.
- `hasNumbers`: digits, quantities, counts, versions.
- `hasDenseProse`: long paragraphs with few bullets.
- `hasBulletDensity`: many bullets or short bullet items.
- `hasQuote`: quotation marks, attribution, said/stated/according to.
- `hasIconList`: feature lists, categories, services, components.
- `hasQuestions`: question marks, Q&A format, FAQ, how/what/why.
- `hasAgenda`: agenda, outline, overview, table of contents, roadmap.
- `hasImage`: image references, screenshots, diagrams, photos.
- `hasChecklist`: checkboxes, prerequisites, requirements, action items.
- `hasHorizontalTimeline`: timeline, roadmap, quarterly, phases, milestones.
- `hasSingleStat`: single key number, headline statistic, KPI highlight.
- `hasHierarchy`: org chart, architecture, tree structure, parent-child.
- `hasParallelProcess`: parallel tracks, concurrent, swim lane, cross-functional.
- `hasTableData`: table, matrix, grid data, rows and columns.
- `hasFeaturePairs`: feature-benefit pairs, value proposition, advantages.
- `hasContact`: contact info, email, phone, URL, call to action, next steps.
- `hasTransformation`: before/after, improvement, redesign, optimization.
- `hasLayers`: stack, layers, tiers, levels, architecture layers.

## Matching Order

1. First section: `hero-cover`
2. Final section: `closing-card`
3. Commands or code: `command-board`
4. Workflow or steps: `process-lane`
5. Comparison: `compare-dual`
6. Warning or guardrails: `warning-callout`
7. Number-heavy: `metric-board`
8. Dense prose: `essay-panel`
9. Bullets-heavy: `bullet-grid`
10. Conceptual rules: `stack-note`
11. Quote or insight: `quote-insight`
12. Icon-based features: `icon-grid`
13. Q&A format: `faq-panel`
14. Agenda/overview: `agenda-overview`
15. Visual showcase: `image-showcase`
16. Checklist items: `checklist-board`
17. Horizontal timeline: `horizontal-timeline`
18. Single key stat: `stat-highlight`
19. Hierarchical structure: `hierarchy-tree`
20. Parallel processes: `swim-lane`
21. Tabular data: `data-table`
22. Feature-benefit pairs: `feature-benefit`
23. Contact/CTA: `contact-cta`
24. Before/after transformation: `before-after`
25. Layered architecture: `layer-stack`
26. Default: `narrative-split`

## Overflow

- If a section does not fit the selected template, emit continuation slides for that same section.
- Continuation slides keep the section title stable and append only a continuation marker.
- Split content in source order; do not reorder bullets or paragraphs.
