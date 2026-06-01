/**
 * Template Registry — Spec-driven template definitions
 *
 * Each template declares its slots, constraints, and overflow rules.
 * The renderer uses these specs to adaptively fill content.
 * SVG files serve as design language reference, not pixel blueprints.
 */

export const SLOT_TYPES = {
  TITLE: 'title',
  SUBTITLE: 'subtitle',
  BODY: 'body',
  BULLETS: 'bullets',
  METRIC: 'metric',
  QUOTE: 'quote',
  TAGS: 'tags',
  IMAGE: 'image',
  STEPS: 'steps',
  TABLE: 'table',
  ICONS: 'icons',
};

/**
 * @typedef {Object} SlotSpec
 * @property {boolean} required
 * @property {number} [maxLines]
 * @property {number} [maxChars]
 * @property {number} [maxItems] - for array slots (bullets, tags, steps)
 * @property {number} [minItems]
 * @property {number} [maxCharsPerItem]
 * @property {'primary'|'secondary'|'tertiary'} [visualWeight]
 * @property {string} [overflow] - 'truncate' | 'hide' | 'shrink-font' | 'split-slide'
 */

/**
 * @typedef {Object} TemplateSpec
 * @property {string} id
 * @property {string} intent - semantic intent (hero, narrative, grid, flow, etc.)
 * @property {string} description
 * @property {Object.<string, SlotSpec>} slots
 * @property {Object} layout
 * @property {Object} decoration
 * @property {Object} overflow
 */

export const TEMPLATE_REGISTRY = [

  // ═══════════════════════════════════════
  //  HERO / COVER
  // ═══════════════════════════════════════

  {
    id: 'hero-cover',
    intent: 'hero',
    group: 'cover',
    description: 'Opening slide with big title and visual area',
    svgRef: 'assets/svg/memphis-template-hero-v2.svg',

    slots: {
      title:    { required: true,  maxLines: 3, maxChars: 42, visualWeight: 'primary' },
      subtitle: { required: false, maxLines: 2, maxChars: 60, visualWeight: 'secondary' },
      body:     { required: false, maxLines: 4, maxChars: 180, visualWeight: 'tertiary' },
      tags:     { required: false, maxItems: 3, maxCharsPerItem: 14, visualWeight: 'tertiary' },
      image:    { required: false, kind: 'placeholder', visualWeight: 'secondary' },
      visual:   { required: false, kind: 'image-or-diagram', visualWeight: 'secondary' },
      insight:  { required: false, maxLines: 3, maxChars: 100, visualWeight: 'tertiary' },
      evidence: { required: false, maxLines: 3, maxChars: 100, visualWeight: 'tertiary' },
    },

    layout: {
      type: 'split',
      columns: '45% 55%',
      areas: `
        "title-card  visual-card"
        "title-card  bottom-cards"
      `,
      responsive: {
        narrow: { columns: '100%', areas: '"title-card" "visual-card" "bottom-cards"' }
      }
    },

    decoration: {
      anchors: ['top-right-dots', 'bottom-wave', 'top-left-triangle'],
      density: 'moderate',
    },

    overflow: {
      title: 'shrink-font',
      body: 'truncate',
      tags: 'drop-tail',
    }
  },

  {
    id: 'hero-centered',
    intent: 'hero',
    group: 'cover',
    description: 'Centered hero with Memphis art above title',
    svgRef: 'assets/svg/memphis-template-hero-alt-a.svg',

    slots: {
      title:    { required: true,  maxLines: 2, maxChars: 20, visualWeight: 'primary' },
      subtitle: { required: false, maxLines: 1, maxChars: 50, visualWeight: 'secondary' },
      tags:     { required: false, maxItems: 3, maxCharsPerItem: 12, visualWeight: 'tertiary' },
    },

    layout: {
      type: 'centered',
      areas: '"art" "title" "subtitle" "tags"',
    },

    decoration: {
      anchors: ['center-art-cluster'],
      density: 'bold',
    }
  },

  {
    id: 'hero-split-block',
    intent: 'hero',
    group: 'cover',
    description: 'Left color block + right title, magazine feel',
    svgRef: 'assets/svg/memphis-template-hero-alt-b.svg',

    slots: {
      title:    { required: true,  maxLines: 3, maxChars: 18, visualWeight: 'primary' },
      subtitle: { required: false, maxLines: 2, maxChars: 60, visualWeight: 'secondary' },
    },

    layout: {
      type: 'split',
      columns: '44% 56%',
      areas: '"color-block title-area"',
    },

    decoration: {
      anchors: ['left-block-pattern'],
      density: 'moderate',
    }
  },

  // ═══════════════════════════════════════
  //  NARRATIVE / CONTENT
  // ═══════════════════════════════════════

  {
    id: 'narrative-split',
    intent: 'narrative',
    group: 'content',
    description: 'Left main argument + right evidence/next-step cards',
    svgRef: 'assets/svg/memphis-template-narrative-split.svg',

    slots: {
      title:     { required: true,  maxLines: 2, maxChars: 40, visualWeight: 'primary' },
      subtitle:  { required: false, maxLines: 1, maxChars: 50, visualWeight: 'tertiary' },
      body:      { required: true,  maxLines: 6, maxChars: 260, visualWeight: 'secondary' },
      bullets:   { required: false, minItems: 2, maxItems: 5, maxCharsPerItem: 180, visualWeight: 'secondary' },
      metric:    { required: false, maxChars: 12, visualWeight: 'primary' },
      metricLabel:{ required: false, maxChars: 72, visualWeight: 'tertiary' },
      quote:     { required: false, maxLines: 2, maxChars: 100, visualWeight: 'tertiary' },
      insight:   { required: false, maxLines: 4, maxChars: 160, visualWeight: 'tertiary' },
      evidence:  { required: false, maxLines: 4, maxChars: 160, visualWeight: 'tertiary' },
      nextStep:  { required: false, maxLines: 4, maxChars: 160, visualWeight: 'tertiary' },
    },

    layout: {
      type: 'split',
      columns: '48% 52%',
      areas: '"main-card top-right" "main-card bottom-right"',
    },

    decoration: {
      anchors: ['top-right-dots', 'bottom-left-dots'],
      density: 'moderate',
    }
  },

  // ═══════════════════════════════════════
  //  GRID / LIST
  // ═══════════════════════════════════════

  {
    id: 'bullet-grid',
    intent: 'grid',
    group: 'content',
    description: '2×3 or 2×N grid of bullet cards',
    svgRef: 'assets/svg/memphis-template-bullet-grid.svg',

    slots: {
      title:   { required: true, maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      subtitle:{ required: false, maxLines: 2, maxChars: 100, visualWeight: 'tertiary' },
      bullets: { required: true, minItems: 2, maxItems: 8, maxCharsPerItem: 40, visualWeight: 'secondary' },
    },

    layout: {
      type: 'grid',
      columns: 'repeat(auto-fit, minmax(280px, 1fr))',
      rows: 'auto',
      maxColumns: 3,
      responsive: {
        narrow: { columns: '1fr', maxColumns: 1 }
      }
    },

    decoration: {
      anchors: ['card-dots', 'corner-triangle'],
      density: 'light',
    }
  },

  {
    id: 'icon-grid',
    intent: 'grid',
    group: 'content',
    description: 'Icon + label grid for features/capabilities',
    svgRef: 'assets/svg/memphis-template-icon-grid.svg',

    slots: {
      title:   { required: true,  maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      subtitle:{ required: false, maxLines: 1, maxChars: 50, visualWeight: 'tertiary' },
      items:   { required: true,  minItems: 3, maxItems: 8, maxCharsPerItem: 20, maxDescPerItem: 40, visualWeight: 'secondary' },
    },

    layout: {
      type: 'grid',
      columns: 'repeat(auto-fit, minmax(240px, 1fr))',
      maxColumns: 4,
    },

    decoration: {
      anchors: ['corner-squares'],
      density: 'light',
    }
  },

  // ═══════════════════════════════════════
  //  DATA / METRICS
  // ═══════════════════════════════════════

  {
    id: 'metric-board',
    intent: 'metric',
    group: 'data',
    description: 'Hero metric + supporting data cards',
    svgRef: 'assets/svg/memphis-template-metric-board.svg',

    slots: {
      title:       { required: true,  maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      metric:      { required: true,  maxChars: 8, visualWeight: 'primary' },
      metricLabel: { required: true,  maxChars: 40, visualWeight: 'secondary' },
      metricDelta: { required: false, maxChars: 12, visualWeight: 'tertiary' },
      bullets:     { required: false, maxItems: 3, maxCharsPerItem: 50, visualWeight: 'secondary' },
      subMetrics:  { required: false, maxItems: 4, maxCharsPerItem: 8, maxLabelPerItem: 20, visualWeight: 'tertiary' },
    },

    layout: {
      type: 'split',
      columns: '42% 58%',
      areas: '"hero-metric data-cards"',
    },

    decoration: {
      anchors: ['top-right-dots'],
      density: 'light',
    }
  },

  {
    id: 'stat-highlight',
    intent: 'stat',
    group: 'data',
    description: 'Single massive number with context',
    svgRef: 'assets/svg/memphis-template-stat-highlight.svg',

    slots: {
      title:       { required: false, maxLines: 1, maxChars: 20, visualWeight: 'tertiary' },
      metric:      { required: true,  maxChars: 8, visualWeight: 'primary' },
      metricLabel: { required: true,  maxChars: 40, visualWeight: 'secondary' },
      body:        { required: false, maxLines: 3, maxChars: 150, visualWeight: 'tertiary' },
      bullets:     { required: false, maxItems: 3, maxCharsPerItem: 50, visualWeight: 'tertiary' },
    },

    layout: {
      type: 'centered',
      areas: '"metric" "label" "context"',
    },

    decoration: {
      anchors: ['accent-underline'],
      density: 'minimal',
    }
  },

  // ═══════════════════════════════════════
  //  COMPARISON / TRANSFORMATION
  // ═══════════════════════════════════════

  {
    id: 'compare-dual',
    intent: 'comparison',
    group: 'content',
    description: 'Side-by-side before/after or option A/B',
    svgRef: 'assets/svg/memphis-template-compare-dual.svg',

    slots: {
      title:       { required: true,  maxLines: 2, maxChars: 40, visualWeight: 'primary' },
      beforeLabel: { required: true,  maxChars: 20, visualWeight: 'secondary' },
      afterLabel:  { required: true,  maxChars: 20, visualWeight: 'secondary' },
      beforeBullets:{ required: true, minItems: 2, maxItems: 5, maxCharsPerItem: 72, visualWeight: 'secondary' },
      afterBullets: { required: true, minItems: 2, maxItems: 5, maxCharsPerItem: 72, visualWeight: 'secondary' },
      beforeMetric: { required: false, maxChars: 12, visualWeight: 'tertiary' },
      afterMetric:  { required: false, maxChars: 12, visualWeight: 'tertiary' },
      takeaway:    { required: false, maxLines: 2, maxChars: 120, visualWeight: 'tertiary' },
    },

    layout: {
      type: 'split',
      columns: '46% 8% 46%',
      areas: '"before-card arrow after-card" "takeaway takeaway takeaway"',
    },

    decoration: {
      anchors: ['center-arrow'],
      density: 'light',
    }
  },

  {
    id: 'before-after',
    intent: 'transformation',
    group: 'content',
    description: 'Before/after with improvement metrics',
    svgRef: 'assets/svg/memphis-template-before-after.svg',

    slots: {
      title:       { required: true,  maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      beforeBullets:{ required: true, minItems: 3, maxItems: 5, maxCharsPerItem: 45, visualWeight: 'secondary' },
      afterBullets: { required: true, minItems: 3, maxItems: 5, maxCharsPerItem: 45, visualWeight: 'secondary' },
      metrics:     { required: false, maxItems: 4, maxCharsPerItem: 8, maxLabelPerItem: 15, visualWeight: 'tertiary' },
      takeaway:    { required: false, maxLines: 1, maxChars: 80, visualWeight: 'tertiary' },
    },

    layout: {
      type: 'split',
      columns: '1fr auto 1fr',
      areas: '"before arrow after" "takeaway takeaway takeaway" "metrics metrics metrics"',
    },

    decoration: {
      anchors: ['center-arrow'],
      density: 'light',
    }
  },

  // ═══════════════════════════════════════
  //  FLOW / PROCESS
  // ═══════════════════════════════════════

  {
    id: 'process-lane',
    intent: 'process',
    group: 'flow',
    description: 'Vertical process with numbered steps',
    svgRef: 'assets/svg/memphis-template-process-lane.svg',

    slots: {
      title: { required: true, maxLines: 2, maxChars: 40, visualWeight: 'primary' },
      steps: { required: true, minItems: 2, maxItems: 5, maxCharsPerItem: 90, maxTitlePerItem: 28, visualWeight: 'secondary' },
    },

    layout: {
      type: 'vertical-flow',
      spinePosition: 'left',
      stepHeight: 'auto',
    },

    decoration: {
      anchors: ['spine-dots'],
      density: 'light',
    }
  },

  {
    id: 'horizontal-timeline',
    intent: 'timeline',
    group: 'flow',
    description: 'Horizontal timeline with nodes',
    svgRef: 'assets/svg/memphis-template-horizontal-timeline.svg',

    slots: {
      title: { required: true,  maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      phases:{ required: true,  minItems: 3, maxItems: 6, maxCharsPerItem: 40, maxTitlePerItem: 16, visualWeight: 'secondary' },
    },

    layout: {
      type: 'horizontal-flow',
      trackPosition: 'center',
      nodeSpacing: 'equal',
    },

    decoration: {
      anchors: ['track-nodes'],
      density: 'light',
    }
  },

  // ═══════════════════════════════════════
  //  QUOTE / INSIGHT
  // ═══════════════════════════════════════

  {
    id: 'quote-insight',
    intent: 'quote',
    group: 'content',
    description: 'Featured quote with context cards',
    svgRef: 'assets/svg/memphis-template-quote-insight.svg',

    slots: {
      title:       { required: false, maxLines: 1, maxChars: 30, visualWeight: 'tertiary' },
      quote:       { required: true,  maxLines: 3, maxChars: 100, visualWeight: 'primary' },
      attribution: { required: false, maxChars: 40, visualWeight: 'tertiary' },
      tags:        { required: false, maxItems: 3, maxCharsPerItem: 12, visualWeight: 'tertiary' },
      contextCards:{ required: false, minItems: 2, maxItems: 3, maxCharsPerItem: 60, maxTitlePerItem: 16, visualWeight: 'secondary' },
    },

    layout: {
      type: 'stacked',
      areas: '"quote-card" "context-row"',
      contextColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    },

    decoration: {
      anchors: ['quote-mark'],
      density: 'minimal',
    }
  },

  // ═══════════════════════════════════════
  //  WARNING / RISK
  // ═══════════════════════════════════════

  {
    id: 'warning-callout',
    intent: 'warning',
    group: 'content',
    description: 'Primary warning + secondary risk cards',
    svgRef: 'assets/svg/memphis-template-warning-callout.svg',

    slots: {
      title:       { required: true,  maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      warningTitle:{ required: true,  maxLines: 3, maxChars: 60, visualWeight: 'primary' },
      body:        { required: true,  maxLines: 4, maxChars: 160, visualWeight: 'secondary' },
      bullets:     { required: false, maxItems: 3, maxCharsPerItem: 40, visualWeight: 'tertiary' },
      riskCards:   { required: false, maxItems: 2, maxCharsPerItem: 60, maxTitlePerItem: 20, visualWeight: 'secondary' },
    },

    layout: {
      type: 'split',
      columns: '46% 54%',
      areas: '"warning-main risk-stack"',
    },

    decoration: {
      anchors: ['warning-icon'],
      density: 'light',
    }
  },

  // ═══════════════════════════════════════
  //  TABLE / STRUCTURED
  // ═══════════════════════════════════════

  {
    id: 'data-table',
    intent: 'table',
    group: 'structured',
    description: 'Comparison table with headers and rows',
    svgRef: 'assets/svg/memphis-template-data-table.svg',

    slots: {
      title:   { required: true,  maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      subtitle:{ required: false, maxLines: 1, maxChars: 50, visualWeight: 'tertiary' },
      headers: { required: true,  minItems: 2, maxItems: 5, maxCharsPerItem: 20, visualWeight: 'secondary' },
      rows:    { required: true,  minItems: 2, maxItems: 8, maxCharsPerCell: 25, visualWeight: 'secondary' },
      footNote:{ required: false, maxChars: 60, visualWeight: 'tertiary' },
    },

    layout: {
      type: 'table',
      headerHeight: 'auto',
      rowHeight: 'auto',
    },

    decoration: {
      density: 'minimal',
    }
  },

  // ═══════════════════════════════════════
  //  STRUCTURAL
  // ═══════════════════════════════════════

  {
    id: 'hierarchy-tree',
    intent: 'hierarchy',
    group: 'structural',
    description: 'Tree/org chart with connected nodes',
    svgRef: 'assets/svg/memphis-template-hierarchy-tree.svg',

    slots: {
      title:   { required: true, maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      root:    { required: true, maxChars: 20, visualWeight: 'primary' },
      children:{ required: true, minItems: 2, maxItems: 5, maxCharsPerItem: 20, visualWeight: 'secondary' },
      leaves:  { required: false, maxItems: 8, maxCharsPerItem: 16, visualWeight: 'tertiary' },
      output:  { required: false, maxChars: 20, visualWeight: 'tertiary' },
    },

    layout: {
      type: 'tree',
      orientation: 'top-down',
    },

    decoration: {
      density: 'minimal',
    }
  },

  {
    id: 'layer-stack',
    intent: 'layers',
    group: 'structural',
    description: 'Stacked layers (tech stack, abstraction layers)',
    svgRef: 'assets/svg/memphis-template-layer-stack.svg',

    slots: {
      title:  { required: true,  maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      layers: { required: true,  minItems: 3, maxItems: 5, maxCharsPerItem: 80, maxTitlePerItem: 16, visualWeight: 'secondary' },
    },

    layout: {
      type: 'vertical-stack',
      layerHeight: 'auto',
    },

    decoration: {
      density: 'minimal',
    }
  },

  {
    id: 'swim-lane',
    intent: 'workflow',
    group: 'structural',
    description: 'Cross-functional workflow grid',
    svgRef: 'assets/svg/memphis-template-swim-lane.svg',

    slots: {
      title:    { required: true,  maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      columns:  { required: true,  minItems: 3, maxItems: 6, maxCharsPerItem: 16, visualWeight: 'secondary' },
      rows:     { required: true,  minItems: 2, maxItems: 4, maxCharsPerItem: 16, visualWeight: 'secondary' },
      cells:    { required: true,  maxCharsPerCell: 20, visualWeight: 'tertiary' },
    },

    layout: {
      type: 'grid',
      columns: 'auto repeat(N, 1fr)',
    },

    decoration: {
      density: 'minimal',
    }
  },

  {
    id: 'feature-benefit',
    intent: 'feature-benefit',
    group: 'content',
    description: 'Feature → Benefit pairing',
    svgRef: 'assets/svg/memphis-template-feature-benefit.svg',

    slots: {
      title:   { required: true,  maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      pairs:   { required: true,  minItems: 2, maxItems: 4, maxFeatureChars: 40, maxBenefitChars: 40, visualWeight: 'secondary' },
    },

    layout: {
      type: 'vertical-pairs',
      pairHeight: 'auto',
    },

    decoration: {
      density: 'light',
    }
  },

  // ═══════════════════════════════════════
  //  CHECKLIST / FAQ / AGENDA
  // ═══════════════════════════════════════

  {
    id: 'checklist-board',
    intent: 'checklist',
    group: 'content',
    description: 'Checklist with done/pending status',
    svgRef: 'assets/svg/memphis-template-checklist-board.svg',

    slots: {
      title:    { required: true,  maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      items:    { required: true,  minItems: 3, maxItems: 10, maxCharsPerItem: 50, visualWeight: 'secondary' },
      notes:    { required: false, maxItems: 2, maxCharsPerItem: 40, visualWeight: 'tertiary' },
      milestones:{ required: false, maxItems: 3, maxCharsPerItem: 40, maxLabelPerItem: 16, visualWeight: 'tertiary' },
      progress: { required: false, maxChars: 20, visualWeight: 'tertiary' },
    },

    layout: {
      type: 'split',
      columns: '60% 40%',
      areas: '"checklist side-notes"',
    },

    decoration: {
      density: 'light',
    }
  },

  {
    id: 'faq-panel',
    intent: 'faq',
    group: 'content',
    description: 'Q&A pairs with colored tags',
    svgRef: 'assets/svg/memphis-template-faq-panel.svg',

    slots: {
      title: { required: true,  maxLines: 2, maxChars: 20, visualWeight: 'primary' },
      qaPairs:{ required: true, minItems: 2, maxItems: 4, maxQuestionChars: 60, maxAnswerChars: 100, visualWeight: 'secondary' },
    },

    layout: {
      type: 'vertical-stack',
      pairHeight: 'auto',
    },

    decoration: {
      density: 'light',
    }
  },

  {
    id: 'agenda-overview',
    intent: 'agenda',
    group: 'content',
    description: 'Numbered agenda/roadmap items',
    svgRef: 'assets/svg/memphis-template-agenda-overview.svg',

    slots: {
      title: { required: true,  maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      subtitle:{ required: false, maxLines: 1, maxChars: 50, visualWeight: 'tertiary' },
      items: { required: true,  minItems: 3, maxItems: 8, maxTitleChars: 30, maxDescChars: 60, visualWeight: 'secondary' },
    },

    layout: {
      type: 'vertical-list',
      itemHeight: 'auto',
    },

    decoration: {
      density: 'light',
    }
  },

  // ═══════════════════════════════════════
  //  IMAGE / VISUAL
  // ═══════════════════════════════════════

  {
    id: 'image-showcase',
    intent: 'image',
    group: 'visual',
    description: 'Large image area with captions',
    svgRef: 'assets/svg/memphis-template-image-showcase.svg',

    slots: {
      title:   { required: true,  maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      image:   { required: true,  kind: 'image-or-diagram', visualWeight: 'primary' },
      captions:{ required: false, maxItems: 2, maxCharsPerItem: 40, visualWeight: 'tertiary' },
    },

    layout: {
      type: 'stacked',
      areas: '"title" "image" "captions"',
      imageAspectRatio: '16/9',
    },

    decoration: {
      density: 'light',
    }
  },

  {
    id: 'command-board',
    intent: 'command',
    group: 'content',
    description: 'Code/command blocks with dark background',
    svgRef: 'assets/svg/memphis-template-command-board.svg',

    slots: {
      title:   { required: true,  maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      commands:{ required: true,  minItems: 1, maxItems: 6, maxCommandChars: 100, maxDescChars: 120, maxResultChars: 60, visualWeight: 'secondary' },
    },

    layout: {
      type: 'vertical-stack',
      blockHeight: 'auto',
    },

    decoration: {
      density: 'minimal',
    }
  },

  // ═══════════════════════════════════════
  //  CLOSING / CTA
  // ═══════════════════════════════════════

  {
    id: 'closing-card',
    intent: 'closing',
    group: 'closing',
    description: 'Closing slide with summary points',
    svgRef: 'assets/svg/memphis-template-closing-card.svg',

    slots: {
      title:   { required: true,  maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      subtitle:{ required: false, maxLines: 2, maxChars: 120, visualWeight: 'secondary' },
      points:  { required: false, minItems: 2, maxItems: 4, maxCharsPerItem: 24, maxDescPerItem: 28, visualWeight: 'tertiary' },
    },

    layout: {
      type: 'centered',
      areas: '"title" "subtitle" "points-row"',
    },

    decoration: {
      density: 'moderate',
    }
  },

  {
    id: 'contact-cta',
    intent: 'cta',
    group: 'closing',
    description: 'Contact info and call-to-action',
    svgRef: 'assets/svg/memphis-template-contact-cta.svg',

    slots: {
      title:    { required: true,  maxLines: 2, maxChars: 30, visualWeight: 'primary' },
      subtitle: { required: false, maxLines: 1, maxChars: 40, visualWeight: 'secondary' },
      contacts: { required: true,  minItems: 1, maxItems: 3, maxCharsPerItem: 30, visualWeight: 'secondary' },
      actions:  { required: false, maxItems: 2, maxCharsPerItem: 16, visualWeight: 'tertiary' },
    },

    layout: {
      type: 'centered',
      areas: '"icon" "title" "contacts" "actions"',
    },

    decoration: {
      density: 'moderate',
    }
  },
];

// ═══════════════════════════════════════
//  Registry API
// ═══════════════════════════════════════

/**
 * Get template spec by id
 */
export function getTemplate(id) {
  return TEMPLATE_REGISTRY.find(t => t.id === id) || null;
}

/**
 * Get all templates matching an intent
 */
export function getTemplatesByIntent(intent) {
  return TEMPLATE_REGISTRY.filter(t => t.intent === intent);
}

/**
 * Get all templates in a group
 */
export function getTemplatesByGroup(group) {
  return TEMPLATE_REGISTRY.filter(t => t.group === group);
}

/**
 * Get all available template ids
 */
export function getAllTemplateIds() {
  return TEMPLATE_REGISTRY.map(t => t.id);
}

/**
 * Get all available intents
 */
export function getAllIntents() {
  return [...new Set(TEMPLATE_REGISTRY.map(t => t.intent))];
}

/**
 * Check if content fits a template's slot constraints
 */
export function checkContentFit(templateId, content) {
  const spec = getTemplate(templateId);
  if (!spec) return { fit: false, reason: 'Template not found' };

  const violations = [];

  for (const [slotName, slotSpec] of Object.entries(spec.slots)) {
    const value = content[slotName];

    if (slotSpec.required && !value) {
      violations.push({ slot: slotName, issue: 'missing-required' });
      continue;
    }

    if (!value) continue;

    // Check string slots
    if (typeof value === 'string') {
      if (slotSpec.maxChars && value.length > slotSpec.maxChars) {
        violations.push({
          slot: slotName,
          issue: 'overflow',
          actual: value.length,
          max: slotSpec.maxChars,
          strategy: spec.overflow?.[slotName] || 'truncate'
        });
      }
    }

    // Check array slots
    if (Array.isArray(value)) {
      if (slotSpec.maxItems && value.length > slotSpec.maxItems) {
        violations.push({
          slot: slotName,
          issue: 'too-many-items',
          actual: value.length,
          max: slotSpec.maxItems,
          strategy: spec.overflow?.[slotName] || 'drop-tail'
        });
      }
      if (slotSpec.minItems && value.length < slotSpec.minItems) {
        violations.push({
          slot: slotName,
          issue: 'too-few-items',
          actual: value.length,
          min: slotSpec.minItems
        });
      }
    }
  }

  return {
    fit: violations.length === 0,
    violations,
    score: 1 - (violations.length / Object.keys(spec.slots).length)
  };
}
