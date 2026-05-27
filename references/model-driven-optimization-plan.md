# Model-Driven Optimization Plan

## Goal

Upgrade the current generator from a "section-to-template formatter" into a model-driven presentation system that can reliably produce high-quality Memphis-style HTML slides closer to the visual standard of:

- `assets/svg/memphis-template-hero.svg`
- `assets/svg/memphis-template-board.svg`

The target is not just "more templates". The target is:

- stronger visual hierarchy
- better content-to-layout fit
- fewer overloaded slides
- more art-directed results
- stable generation quality across webpage and Markdown inputs

## Why The Current Output Underperforms

The current pipeline in `scripts/generate-preview.js` is still too mechanical for premium PPT output.

### 1. Source parsing is too shallow

Current HTML parsing:

- collects all `h1-h3`
- collects all `p/li`
- slices body content in order

This loses:

- real section ownership
- semantic grouping
- argument structure
- local emphasis
- image / quote / metric relationships

As a result, the generated slides feel like article fragments placed into layouts rather than presentation scenes.

### 2. Template selection is not content-directed enough

`buildSlides()` currently rotates across template ids rather than making a strong semantic decision per slide.

This causes:

- mismatch between content and layout
- unnecessary template variety
- weak narrative pacing
- low consistency in art direction

### 3. Section-to-slide mapping is too coarse

The current implementation explicitly keeps one section on one slide whenever possible.

That is the opposite of premium presentation design.

Premium slide systems:

- split aggressively
- reduce payload per slide
- preserve a single visual thesis per page
- create rhythm through intentional continuation

### 4. Templates are renderer-driven, not master-driven

The current renderers are mostly component layouts.

They are not yet based on:

- fixed master composition
- explicit content slots
- strict text budgets
- predesigned decorative anchors
- visual focal hierarchy

This is the biggest gap between the HTML output and the SVG quality bar.

### 5. Decorative logic is too random

Memphis decoration is currently generated algorithmically per page.

That is fast, but it creates a "styled webpage" feeling instead of a "designed presentation" feeling.

High-quality slides need:

- template-bound decoration
- layout-aware visual anchors
- consistent motif placement
- controlled asymmetry

## Core Direction

Do not optimize this system further as a rule-first article formatter.

Reframe it as:

`source extraction -> model planning -> template slotting -> deterministic rendering -> layout validation -> reflow`

The key change requested here is important:

- do not treat model planning as an optional enhancement
- do not start with a rules-first planner
- use the model as the primary planner from the start

Rules can remain only as fallback guards, not as the main decision engine.

## Target Architecture

### Stage 1. Source Normalization

Input types:

- local Markdown
- local HTML
- remote webpage

Output:

- normalized document structure
- section tree
- paragraph groups
- lists
- quotes
- code blocks
- tables
- image candidates
- strong phrases / metrics / named entities

This stage should be deterministic.

The job here is not to decide layout. The job is to produce a clean source package for the planner.

### Stage 2. Model-Driven Slide Planning

This becomes the heart of the system.

The model should receive:

- normalized source structure
- deck objective
- desired tone
- available template masters
- strict per-template content budgets
- anti-overflow constraints
- style rules from `references/memphis-style.md`

The model should output a structured slide plan, not HTML.

The planner is responsible for:

- identifying deck narrative
- deciding slide boundaries
- choosing slide intent
- selecting template ids
- extracting slot-ready text
- deciding which content becomes hero text vs support vs bullet vs metric
- deciding when a section should split into multiple slides
- deciding when a page should become visual-first instead of text-first

### Stage 3. Deterministic Template Rendering

Rendering should become intentionally dumb.

The renderer should not infer narrative.

It should only:

- take a `slidePlan`
- look up a `templateSpec`
- fill slots
- render a fixed master composition
- attach template-bound decorative anchors

This is the only way to approach the quality of the SVG masters consistently.

### Stage 4. Layout Validation And Reflow

After rendering, the system should validate real layout in browser context.

Validation should check:

- title overflow
- body overflow
- bullet overflow
- overlapping blocks
- unreadable line count
- broken image crop
- focal balance failure

If validation fails:

1. try a sibling template with larger capacity
2. split the slide
3. compress support text while preserving source meaning
4. downgrade to a safer layout

This stage is essential for actual production reliability.

## Model-Driven Planner Design

## Planner Responsibilities

The planner must decide each slide's:

- `intent`
- `templateId`
- `sectionSource`
- `continuationOf`
- `priorityMessage`
- `supportingPoints`
- `visualRole`
- `metricPayload`
- `slotAssignments`

The planner is not allowed to:

- invent unsupported claims
- merge unrelated sections casually
- repeat the same sentence across multiple slots in one slide
- exceed template slot budgets

## Slide Intents

The planner should explicitly classify slides into a finite intent set:

- `hero`
- `section-intro`
- `thesis`
- `insight-board`
- `metric-highlight`
- `comparison`
- `process`
- `timeline`
- `quote`
- `image-narrative`
- `checklist`
- `faq`
- `closing`

This intent layer is much more important than the raw template id.

Templates become visual realizations of intents.

## Planner Output Contract

Recommended shape:

```json
{
  "deckTitle": "string",
  "theme": "memphis-editorial",
  "slides": [
    {
      "id": "slide-01",
      "intent": "hero",
      "templateId": "hero-cover-premium",
      "sectionRef": "sec-1",
      "continuationOf": null,
      "reasoning": "First slide should state thesis and establish deck identity.",
      "slots": {
        "eyebrow": "string",
        "title": "string",
        "dek": "string",
        "tags": ["string", "string"],
        "metric": null,
        "bullets": [],
        "quote": null,
        "imagePrompt": null,
        "imageRef": null
      }
    }
  ]
}
```

The `reasoning` field should be retained in dev mode for debugging, but can be stripped in release mode.

## Planner Prompt Strategy

The planner prompt should include:

- source summary
- full section tree
- available masters and slot budgets
- hard constraints
- examples of good slide decomposition

The prompt should explicitly ask the model to optimize for:

- one dominant message per slide
- strong visual pacing
- minimal text overload
- premium editorial composition
- predictable slot filling

Recommended prompt structure:

1. system role:
   `You are a presentation editor and creative director.`
2. deck mission:
   `Convert source material into a premium Memphis-style HTML slide deck.`
3. hard constraints
4. available templates and budgets
5. source structure
6. required JSON schema

## Why Model-First Planning Is The Right Choice Here

This project's failure mode is not "wrong color" or "missing shape".

The real failure mode is:

- wrong abstraction level
- weak slide boundaries
- poor content hierarchy
- low visual intention

Those are planning problems, not rendering problems.

A rules-first system can help classify easy cases, but it will struggle with:

- mixed prose + bullets
- soft transitions
- nested argument structure
- pages that should be split by rhetorical weight rather than raw length
- deciding which sentence deserves headline treatment

A model-first planner is much better suited to that problem.

## Template System Refactor

## Recommended Immediate Template Set

Reduce the current broad catalog to a premium starter set:

- `hero-cover-premium`
- `section-intro-premium`
- `insight-board-premium`
- `metric-highlight-premium`
- `comparison-premium`
- `process-premium`
- `image-narrative-premium`
- `closing-premium`

This smaller set should be refined to high quality before expanding.

## Template Spec Contract

Each template should have a formal spec:

```json
{
  "id": "insight-board-premium",
  "intent": "insight-board",
  "master": "board",
  "slots": {
    "title": { "maxChars": 42, "maxLines": 2, "required": true },
    "dek": { "maxChars": 100, "maxLines": 3, "required": false },
    "heroMetric": { "maxChars": 12, "required": false },
    "heroMetricLabel": { "maxChars": 28, "required": false },
    "bullets": { "maxItems": 3, "maxCharsPerItem": 84, "required": false },
    "supportCard": { "maxChars": 120, "required": false },
    "visual": { "type": "chart-or-image", "required": false }
  },
  "decorativeAnchors": ["top-right-dot-grid", "bottom-dashed-guide", "accent-circle"],
  "capacityScore": 0.72
}
```

This gives the planner something concrete to target.

## SVG-To-HTML Master Translation

The two SVG files should become the first two premium masters:

- `memphis-template-hero.svg`
- `memphis-template-board.svg`

They should not remain just static assets.

They should be translated into HTML masters with:

- fixed composition regions
- named slot boxes
- fixed decorative anchors
- precise spacing scale
- controlled media masks

This is the shortest path to achieving matching visual quality.

## Rendering Strategy

Do not rely on generic flexbox flow for premium templates.

Recommended approach:

- outer slide remains fixed 16:9
- master uses CSS grid plus absolute anchors
- content slots are bounded boxes
- text uses line clamp and budget-aware typography
- decorative elements are template-specific

This is much closer to how designed slides actually work.

## Content Budgeting

Every template must define hard content budgets.

Examples:

- hero:
  - title max 2 lines
  - dek max 3 lines
  - tags max 3
- metric:
  - one metric
  - one label
  - up to 3 support bullets
- process:
  - max 5 steps
- comparison:
  - max 3 points per side

When the planner cannot fit content within budget:

- it must split
- not shrink indiscriminately
- not silently dump overflow into body text

## Visual System Upgrades

To match the SVG quality, the HTML system should also add:

- image masks beyond plain rectangles
- stronger asymmetrical composition
- larger headline scale range
- more deliberate empty space
- template-bound icon / sticker usage
- reduced decorative randomness

Recommended media shapes:

- quarter-circle crop
- L-cut crop
- vertical editorial strip
- stacked framed cards

## Proposed Codebase Refactor

Current:

- `scripts/generate-preview.js` handles too many responsibilities

Recommended split:

- `scripts/generate-preview.js`
  entry point only
- `scripts/lib/load-source.js`
  source acquisition
- `scripts/lib/normalize-source.js`
  deterministic structure extraction
- `scripts/lib/plan-slides.js`
  model call + planner prompt + schema validation
- `scripts/lib/template-specs.js`
  premium template registry
- `scripts/lib/render-slide.js`
  deterministic HTML rendering
- `scripts/lib/validate-layout.js`
  headless layout checks
- `scripts/lib/reflow-slides.js`
  overflow recovery

This split is necessary if the system is going to mature.

## Rollout Plan

## Phase 1. Planner + Premium Masters

Deliverables:

- source normalization module
- model-driven planner
- JSON slide plan schema
- HTML masters for:
  - hero
  - board
- remove random template rotation for these intents

Success criteria:

- first slide and core insight slides visibly improve
- fewer overloaded pages
- stronger narrative pacing

## Phase 2. Auto Split + Validation

Deliverables:

- continuation slide support
- text budget enforcement
- headless overflow checks
- reflow logic

Success criteria:

- no obvious text overflow
- less layout breakage on long sources

## Phase 3. Expand Premium Template Set

Deliverables:

- comparison
- process
- metric
- closing
- image-narrative

Success criteria:

- most article structures can map to a high-quality deck without fallback ugliness

## Phase 4. Evaluation And Tuning

Build an evaluation set from real source documents, including:

- long-form technical article
- product launch article
- tutorial
- trend analysis
- narrative case study

Score outputs on:

- layout quality
- narrative clarity
- overflow rate
- visual consistency
- Memphis identity strength
- editability

## Practical Notes

## Model Choice

Use a model that is strong at:

- structured output
- summarization with hierarchy
- rhetorical decomposition
- content compression without hallucination

The planner must support strict schema validation and retry on malformed JSON.

## Planner Cost Control

Model-first planning does not mean full freeform generation for every page.

To keep cost practical:

- use the model once per deck, not once per slide
- pass normalized structure, not raw noisy HTML
- ask for a full `slidePlan` in one structured response
- use deterministic rendering afterwards

This preserves quality without exploding cost.

## Fallback Behavior

If the planner fails:

- retry once with a simplified prompt
- if still failing, use a minimal safe planner
- fallback should preserve deck usability, not premium quality

But the system should still be designed around planner-first, not fallback-first.

## Recommended Immediate Next Step

The best next implementation move is:

1. freeze the current broad template rotation path
2. introduce a `slidePlan` schema
3. build a model-driven planner for `hero`, `board`, and `closing`
4. translate the two SVG templates into HTML masters
5. add overflow validation before expanding template count

This will create the strongest quality jump with the least wasted effort.

## Bottom Line

If the goal is to reach the visual quality implied by the SVG masters, the project must stop thinking in terms of:

- "pick a template for each section"

and start thinking in terms of:

- "plan the deck like an editor, then render it like a master-based design system"

That is the actual path from "styled HTML cards" to "high-quality HTML PPT".
