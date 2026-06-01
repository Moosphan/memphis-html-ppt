#!/usr/bin/env node
/**
 * Demo: Generate a test deck using the adaptive renderer
 * Content matches SVG template reference designs
 */

import { renderDeck } from './lib/render-adaptive.js';
import { writeFileSync } from 'fs';

const deckPlan = {
  deckMeta: {
    title: 'Memphis HTML PPT — Design System',
    subtitle: 'Premium slide design framework',
    theme: 'memphis-editorial',
  },
  slides: [
    // ── Slide 1: Hero Cover ──
    {
      id: 'slide-01',
      templateId: 'hero-cover',
      content: {
        headerTitle: 'DESIGN THE FUTURE',
        headerSubtitle: 'PREMIUM SLIDE DESIGN SYSTEMS',
        title: 'Design\nThe Future.',
        body: 'Clean geometry, intentional whitespace, and disciplined color — not decoration for its own sake.',
        bullets: [
          '**One message per slide** — never overload the audience',
          '**Strong visual pacing** — dense sections then breathing room',
          '**Typography as structure** — not decoration for its own sake',
          '**Whitespace is active** — it creates focus and hierarchy',
        ],
        tags: ['Design', 'System', '2025'],
        footerText: 'Memphis-HTML-PPT · 极简设计框架 · 自 2025 年起',
      },
    },

    // ── Slide 2: Narrative Split ──
    {
      id: 'slide-02',
      templateId: 'narrative-split',
      content: {
        headerTitle: 'WHY THIS MATTERS',
        headerSubtitle: '核心观点 · CORE INSIGHT',
        title: 'Why This Matters',
        body: 'Great presentations don\'t happen by accident. They are planned like editorial stories — with a clear narrative arc, intentional pacing, and visual hierarchy that guides the audience through every slide.',
        bullets: [
          '**One message per slide** — never overload the audience with competing ideas',
          '**Strong visual pacing** — alternate between dense and sparse sections',
          '**Typography as structure** — use size and weight to create hierarchy, not decoration',
          '**Color with purpose** — every color choice should communicate meaning',
          '**Whitespace is active** — empty space creates focus and directs the eye',
        ],
        metric: '84%',
        metricLabel: 'of speakers say visual-heavy decks perform better',
        insight: 'The best decks say less per slide but make each slide count more.',
        nextStep: 'Audit your current deck — apply the one-message rule to every slide.',
        footerText: '核心观点 · 论点+论据的经典叙事结构',
      },
    },

    // ── Slide 3: Bullet Grid ──
    {
      id: 'slide-03',
      templateId: 'bullet-grid',
      content: {
        headerTitle: 'SIX CORE PRINCIPLES',
        headerSubtitle: '设计准则 · DESIGN PILLARS',
        title: 'Six Core Principles',
        subtitle: 'Design pillars for every slide',
        bullets: [
          '**Hierarchy first** — size matters, use scale to guide the eye through your content',
          '**Whitespace works** — let it breathe, empty space creates focus and reduces noise',
          '**Color with intent** — one primary accent, one secondary, every choice means something',
          '**Grid alignment** — snap everything to an invisible structure, consistency beats cleverness',
          '**One idea per slide** — split rather than overload, 40 words max per slide',
          '**Test with strangers** — 6-second rule, if they can\'t get it, confusion = design failure',
        ],
        footerText: '6 条设计准则 · 适用于所有类型演示文稿',
      },
    },

    // ── Slide 4: Process Lane ──
    {
      id: 'slide-04',
      templateId: 'process-lane',
      content: {
        headerTitle: 'THE DESIGN PROCESS',
        headerSubtitle: '三步流程 · FROM IDEA TO SLIDE',
        title: 'The Design Process',
        steps: [
          {
            title: 'Plan',
            description: 'Define the narrative — what\'s the one message? Choose template intent: hero, board, flow, grid. Set mood: confident, calm, urgent, creative.',
          },
          {
            title: 'Extract',
            description: 'Pull key content — title, bullets, metrics. Respect slot budgets: max chars, max items. Compress without losing the core idea.',
          },
          {
            title: 'Render',
            description: 'Fill the master template — slot by slot. Apply theme tokens: color, type, spacing. Each template has its own structure.',
          },
        ],
        footerText: '设计流程 · 从想法到成品的三步法',
      },
    },

    // ── Slide 5: Metric Board ──
    {
      id: 'slide-05',
      templateId: 'metric-board',
      content: {
        headerTitle: 'BY THE NUMBERS',
        headerSubtitle: '数据概览 · KEY METRICS',
        title: 'By The Numbers',
        metric: '84%',
        metricLabel: 'of presentations use visual-heavy layouts',
        metricDelta: '+12% vs last year',
        bullets: [
          'Based on survey of 2,400+ presenters across 12 industries, 2024-2025',
          'Validation checks: overflow, contrast, alignment, spacing, hierarchy',
          'Remaining 5.3% auto-fixed by reflow engine in v2 pipeline',
        ],
        subMetrics: [
          { value: '24', label: 'slides avg' },
          { value: '~2min', label: 'per slide' },
          { value: '96%', label: 'pass rate' },
          { value: '0', label: 'overflow' },
        ],
        footerText: '数据面板 · 关键指标一览',
      },
    },

    // ── Slide 6: Quote Insight ──
    {
      id: 'slide-06',
      templateId: 'quote-insight',
      content: {
        headerTitle: 'WORDS THAT MATTER',
        headerSubtitle: '关键引言 · QUOTABLE INSIGHTS',
        title: 'Words That Matter',
        quote: 'The secret of being boring is to say everything.',
        attribution: 'Voltaire, French Enlightenment Writer, 1778',
        tags: ['Brevity', 'Clarity', 'Impact'],
        contextCards: [
          { title: 'CONTEXT', description: 'Said during a debate on the nature of expression and artistic economy. Voltaire argued for restraint over exhaustiveness.' },
          { title: 'RELEVANCE', description: 'Applies directly to slide design: say less, show more. Every word on screen must earn its place — 40 words max per slide.' },
          { title: 'APPLICATION', description: 'Use as a guiding principle for content extraction. When in doubt, cut. If it doesn\'t serve the core message, remove it.' },
        ],
        footerText: '引言洞察 · 关键语录与上下文',
      },
    },

    // ── Slide 7: Compare Dual ──
    {
      id: 'slide-07',
      templateId: 'compare-dual',
      content: {
        headerTitle: 'BEFORE VS AFTER',
        headerSubtitle: '对比分析 · SIDE BY SIDE',
        title: 'Before vs After',
        beforeLabel: 'BEFORE',
        afterLabel: 'AFTER',
        beforeBullets: [
          '**Manual slide creation** — 10-15 minutes per slide, every time',
          '**Inconsistent visual style** — each slide looks different, no system',
          '**Text-heavy slides** — no hierarchy, walls of bullet points',
          '**Random color choices** — no design tokens, no palette discipline',
          '**Overflow and breakage** — content spills beyond card boundaries',
        ],
        afterBullets: [
          '**Template-driven** — 2 minutes per slide, once the system is set up',
          '**Consistent design system** — every slide uses the same tokens and rules',
          '**Clear visual hierarchy** — auto-applied through card weight and typography',
          '**Theme tokens** — one JSON file controls all colors, fonts, spacing',
          '**Overflow validation** — reflow engine catches and fixes issues automatically',
        ],
        takeaway: 'RESULT: 87% TIME SAVED · CONSISTENT QUALITY · ZERO OVERFLOW',
        footerText: '前后对比 · 效率与质量的双重提升',
      },
    },

    // ── Slide 8: Closing Card ──
    {
      id: 'slide-08',
      templateId: 'closing-card',
      content: {
        headerTitle: 'THANK YOU',
        headerSubtitle: '结束语 · CLOSING THOUGHTS',
        title: 'Design\nThe Future.',
        subtitle: 'Build presentations that move people.',
        points: [
          { title: '01', description: 'One message per slide' },
          { title: '02', description: 'Whitespace is your friend' },
          { title: '03', description: 'Color with purpose' },
          { title: '04', description: 'Test with strangers' },
        ],
        footerText: 'Memphis-HTML-PPT · Premium Slide Design Framework · 2025',
      },
    },
  ],
};

const html = renderDeck(deckPlan);
const outPath = 'demo-adaptive-deck.html';
writeFileSync(outPath, html);
console.log(`✅ Generated ${outPath} with ${deckPlan.slides.length} slides`);
console.log(`   Templates: ${[...new Set(deckPlan.slides.map(s => s.templateId))].join(', ')}`);
