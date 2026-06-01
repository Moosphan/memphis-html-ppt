/**
 * Adaptive HTML Renderer v2
 *
 * Renders slides from SlidePlan + TemplateSpec.
 * SVG templates serve as design language reference, NOT pixel blueprints.
 * Layout adapts to actual content (variable bullets, text lengths, etc.)
 *
 * Design language (from SVG masters):
 *   - Georgia/Serif for headings (magazine feel)
 *   - Montserrat/Sans for body text
 *   - Hard shadows (no blur)
 *   - Thick borders (3-5px)
 *   - Colored top bars on cards
 *   - Memphis decorations (dots, triangles, waves) in corners
 *   - Section chip (top-left) + Page counter (bottom-right)
 */

import { getTemplate } from './template-registry.js';
import { MEMPHIS_THEME, generateThemeCSS, generateBaseCSS, getAccentColor, accentCycler } from './theme-engine.js';

// ═══════════════════════════════════════
//  Main Render Function
// ═══════════════════════════════════════

export function renderDeck(deckPlan, theme = MEMPHIS_THEME) {
  const themeCSS = generateThemeCSS(theme);
  const baseCSS = generateBaseCSS();
  const accents = accentCycler();
  const sourceLabel = escHTML(deckPlan.deckMeta?.sourceUrl || "");
  const themeLabel = escHTML(deckPlan.deckMeta?.theme || theme.id || "memphis-editorial");
  const titleLabel = escHTML(deckPlan.deckMeta?.title || "Presentation");

  const slidesHTML = deckPlan.slides.map((slide, i) => {
    const fallbackAccent = accents.next().value;
    const accent = slide.accent || getTemplateAccent(slide.templateId, fallbackAccent);
    return renderSlide(slide, {
      index: i,
      total: deckPlan.slides.length,
      accent,
      theme,
    });
  }).join('\n\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleLabel}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    ${themeCSS}
    ${baseCSS}

    /* Slide container: fixed 1280×720, auto-scaled to fit viewport */
    .mp-stage {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1A1A2E;
      overflow: hidden;
    }
    .mp-stage .mp-deck {
      display: none;
      transform-origin: center center;
    }
    .mp-stage .mp-deck.active {
      display: block;
    }

    .mp-nav {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      z-index: 100;
      background: rgba(26,26,46,0.88);
      backdrop-filter: blur(12px);
      padding: 8px 20px;
      border-radius: 999px;
      border: 2px solid rgba(255,248,238,0.12);
    }
    .mp-nav button {
      background: none;
      border: none;
      color: #FFF8EE;
      font-size: 18px;
      cursor: pointer;
      padding: 4px 12px;
      border-radius: 6px;
      font-family: "Montserrat", sans-serif;
      font-weight: 700;
      line-height: 1;
    }
    .mp-nav button:hover { background: rgba(255,255,255,0.12); }
    .mp-nav__counter {
      color: #FFF8EE;
      font-family: "Montserrat", sans-serif;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.12em;
      display: flex;
      align-items: center;
    }
    .mp-progress {
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background: var(--t-coral);
      transition: width 0.3s ease;
      z-index: 100;
    }
  </style>
</head>
<body style="margin:0;background:#1A1A2E;overflow:hidden;">
  <!-- source: ${sourceLabel} -->
  <!-- theme: ${themeLabel} -->
  <div class="mp-progress" id="progress"></div>

  <div class="mp-stage slide-deck" id="stage" data-theme="${themeLabel}">
    ${slidesHTML}
  </div>

  <nav class="mp-nav">
    <button id="prev" onclick="prev()">←</button>
    <span class="mp-nav__counter" id="counter">01 / ${String(deckPlan.slides.length).padStart(2, '0')}</span>
    <button id="next" onclick="next()">→</button>
  </nav>

  <script>
    let current = 0;
    const slides = document.querySelectorAll('.mp-deck');
    const counter = document.getElementById('counter');
    const progress = document.getElementById('progress');
    const stage = document.getElementById('stage');

    function fitSlides() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min(vw / 1280, vh / 720, 1);
      slides.forEach(s => {
        s.style.transform = 'scale(' + scale + ')';
      });
    }

    function show(n) {
      slides[current].classList.remove('active');
      current = Math.max(0, Math.min(n, slides.length - 1));
      slides[current].classList.add('active');
      counter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
      progress.style.width = ((current + 1) / slides.length * 100) + '%';
    }
    function next() { show(current + 1); }
    function prev() { show(current - 1); }

    window.addEventListener('resize', fitSlides);
    fitSlides();

    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      if (e.key === 'ArrowLeft') prev();
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.mp-nav')) next();
    });

    show(0);
  </script>
</body>
</html>`;
}

// ═══════════════════════════════════════
//  Single Slide Renderer
// ═══════════════════════════════════════

export function renderSlide(slidePlan, ctx) {
  const spec = getTemplate(slidePlan.templateId);
  if (!spec) return renderFallbackSlide(slidePlan, ctx);

  const content = slidePlan.content || {};
  const renderer = TEMPLATE_RENDERERS[spec.id] || RENDERERS[spec.layout.type];
  if (!renderer) return renderFallbackSlide(slidePlan, ctx);

  const isActive = ctx.index === 0 ? ' active' : '';
  const bodyHTML = renderer(spec, content, ctx);
  const footerHTML = buildFooter(ctx, content.footerText);
  const decoHTML = buildDecorations(ctx);

  // Wrap in fixed 1280×720 slide
  return `<div class="mp-deck${isActive}" data-slide="${ctx.index + 1}" data-slide-id="${escHTML(slidePlan.id || `slide-${ctx.index + 1}`)}" data-template="${escHTML(spec.id)}" data-intent="${escHTML(slidePlan.intent || spec.intent || "")}" style="width:1280px;height:720px;position:relative;overflow:hidden;background:var(--t-paper);">
  <div class="mp-slide" style="width:100%;height:100%;position:relative;overflow:hidden;box-sizing:border-box;">
    ${bodyHTML}
    ${footerHTML}
  </div>
  ${decoHTML}
</div>`;
}

// ═══════════════════════════════════════
//  Layout Renderers
// ═══════════════════════════════════════

const TEMPLATE_RENDERERS = {
  'hero-cover': renderHeroCoverTemplate,
  'narrative-split': renderNarrativeSplitTemplate,
  'bullet-grid': renderBulletGridTemplate,
  'process-lane': renderProcessLaneTemplate,
  'metric-board': renderMetricBoardTemplate,
  'quote-insight': renderQuoteInsightTemplate,
  'compare-dual': renderCompareDualTemplate,
  'closing-card': renderClosingCardTemplate,
};

const RENDERERS = {

  // ── Split Layout ──
  'split': (spec, content, ctx) => {
    // Map percentage columns to fixed px (content area = 1160px)
    const colPercents = spec.layout.columns || '48% 52%';
    const parts = colPercents.split(/\s+/).map(p => parseFloat(p) / 100);
    const gap = 24;
    const totalWidth = 1160;
    const colWidths = parts.map(p => Math.floor((totalWidth - gap * (parts.length - 1)) * p));
    const cols = colWidths.map(w => w + 'px').join(' ');

    // Compare-dual: map before/after fields to left/right
    let leftContent, rightContent;
    if (spec.id === 'compare-dual' && content.beforeBullets) {
      const leftData = {
        title: content.beforeLabel || 'BEFORE',
        bullets: content.beforeBullets,
        metric: content.beforeMetric,
      };
      const rightData = {
        title: content.afterLabel || 'AFTER',
        bullets: content.afterBullets,
        metric: content.afterMetric,
      };
      leftContent = buildCompareSide(spec, leftData, ctx, 'gray');
      rightContent = buildCompareSide(spec, rightData, ctx, 'mint');
    } else {
      leftContent = buildLeftSplit(spec, content, ctx);
      rightContent = buildRightSplit(spec, content, ctx);
    }

    return `
<div style="display:flex;flex-direction:column;height:600px;">
  ${buildSlideHeader(spec, content, ctx)}
  <div style="display:grid;grid-template-columns:${cols};gap:${gap}px;flex:1;min-height:0;">
    ${leftContent}
    ${rightContent}
  </div>
  ${content.takeaway ? `<div style="margin-top:16px;flex-shrink:0;"><div style="background:var(--t-yellow);border:3px solid var(--t-ink);border-radius:8px;padding:12px 24px;text-align:center;"><span class="mp-h4">${escHTML(content.takeaway)}</span></div></div>` : ''}
</div>`;
  },

  // ── Grid Layout ──
  'grid': (spec, content, ctx) => {
    const items = content.bullets || content.items || [];
    const accent = ctx.accent;
    const maxCols = spec.layout.maxColumns || 3;
    const numCols = Math.min(items.length, maxCols);
    const gap = 20;
    const totalWidth = 1160;
    const colWidth = Math.floor((totalWidth - gap * (numCols - 1)) / numCols);

    const cards = items.map((item, i) => {
      const itemAccent = getNextAccent(accent, i);
      if (typeof item === 'string') return buildBulletCard(item, i, itemAccent, spec);
      return buildItemCard(item, i, itemAccent, spec);
    }).join('\n');

    return `
<div style="display:flex;flex-direction:column;height:600px;">
  ${buildSlideHeader(spec, content, ctx)}
  <div style="display:grid;grid-template-columns:repeat(${numCols}, ${colWidth}px);gap:${gap}px;flex:1;">
    ${cards}
  </div>
</div>`;
  },

  // ── Centered Layout ──
  'centered': (spec, content, ctx) => {
    const accent = ctx.accent;
    const sections = [];

    if (content.metric) {
      sections.push(`<div class="mp-metric" style="text-align:center;color:var(--t-${accent});">${nl2br(content.metric)}</div>`);
    }
    if (content.title) {
      sections.push(`<div class="mp-h1" style="text-align:center;">${nl2br(content.title)}</div>`);
    }
    if (content.subtitle) {
      sections.push(`<div class="mp-body-muted" style="text-align:center;margin-top:16px;">${nl2br(content.subtitle)}</div>`);
    }
    if (content.metricLabel) {
      sections.push(`<div class="mp-body-muted" style="text-align:center;">${nl2br(content.metricLabel)}</div>`);
    }
    if (content.body) {
      sections.push(`<div class="mp-body" style="text-align:center;max-width:700px;margin:0 auto;">${nl2br(content.body)}</div>`);
    }
    if (content.tags && content.tags.length) {
      sections.push(buildTags(content.tags, accent));
    }
    if (content.points && content.points.length) {
      const gap = 20;
      const colWidth = Math.floor((1160 - gap * (content.points.length - 1)) / content.points.length);
      const pts = content.points.map((p, i) => {
        const pAccent = getNextAccent(accent, i);
        return `<div class="mp-card mp-card--subtle" style="padding:24px;text-align:center;">
          <div class="mp-h3" style="color:var(--t-${pAccent});">${escHTML(p.title || p[0] || '')}</div>
          <div class="mp-small" style="margin-top:6px;">${escHTML(p.description || p[1] || '')}</div>
        </div>`;
      }).join('');
      sections.push(`<div style="display:grid;grid-template-columns:repeat(${content.points.length}, ${colWidth}px);gap:${gap}px;margin-top:24px;">${pts}</div>`);
    }

    return `
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:600px;">
  ${buildSlideHeader(spec, content, ctx)}
  ${sections.join('\n')}
</div>`;
  },

  // ── Vertical Flow (process steps) ──
  'vertical-flow': (spec, content, ctx) => {
    const steps = content.steps || [];
    const stepAccents = ['coral', 'teal', 'yellow', 'mint', 'pink'];

    const stepCards = steps.map((step, i) => {
      const sAccent = stepAccents[i % stepAccents.length];
      const title = typeof step === 'string' ? step : step.title;
      const desc = typeof step === 'object' ? step.description : '';
      const num = String(i + 1).padStart(2, '0');

      return `
<div style="display:flex;gap:20px;align-items:flex-start;position:relative;z-index:1;">
  <div style="flex-shrink:0;width:48px;height:48px;border-radius:50%;background:var(--t-${sAccent});border:4px solid var(--t-ink);display:flex;align-items:center;justify-content:center;">
    <span style="font-family:var(--t-font-heading);font-size:18px;font-weight:900;color:var(--t-ink);">${num}</span>
  </div>
  <div class="mp-card mp-card--primary" style="flex:1;">
    <div class="mp-card__topbar mp-card__topbar--${sAccent}">
      <span class="mp-label" style="color:var(--t-ink);">STEP ${num}</span>
    </div>
    <div class="mp-h4">${escHTML(title)}</div>
    ${desc ? `<div class="mp-body-muted" style="margin-top:8px;">${escHTML(desc)}</div>` : ''}
  </div>
</div>`;
    }).join('\n');

    return `
<div style="display:flex;flex-direction:column;height:600px;">
  ${buildSlideHeader(spec, content, ctx)}
  <div style="position:relative;display:flex;flex-direction:column;gap:20px;flex:1;padding-left:40px;">
    <div style="position:absolute;left:24px;top:0;bottom:0;width:3px;border-left:3px dashed var(--t-ink);opacity:0.15;"></div>
    ${stepCards}
  </div>
</div>`;
  },

  // ── Horizontal Flow (timeline) ──
  'horizontal-flow': (spec, content, ctx) => {
    const phases = content.phases || content.items || [];
    const nodeAccents = ['coral', 'teal', 'yellow', 'mint', 'pink'];
    const gap = 16;
    const nodeWidth = Math.floor((1160 - gap * (phases.length - 1)) / phases.length);

    const nodes = phases.map((phase, i) => {
      const nAccent = nodeAccents[i % nodeAccents.length];
      const title = typeof phase === 'string' ? phase : phase.title;
      const desc = typeof phase === 'object' ? phase.description : '';

      return `
<div style="display:flex;flex-direction:column;align-items:center;">
  <div class="mp-card mp-card--subtle" style="padding:20px;text-align:center;margin-bottom:16px;">
    <div class="mp-h4">${escHTML(title)}</div>
    ${desc ? `<div class="mp-small" style="margin-top:6px;">${escHTML(desc)}</div>` : ''}
  </div>
  <div style="width:28px;height:28px;border-radius:50%;background:var(--t-${nAccent});border:3px solid var(--t-ink);"></div>
</div>`;
    }).join('\n');

    return `
<div style="display:flex;flex-direction:column;height:600px;">
  ${buildSlideHeader(spec, content, ctx)}
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    <div style="display:grid;grid-template-columns:repeat(${phases.length}, ${nodeWidth}px);gap:${gap}px;">
      ${nodes}
    </div>
    <div style="height:3px;background:var(--t-ink);opacity:0.2;margin:0 60px;position:relative;top:-14px;z-index:0;"></div>
  </div>
</div>`;
  },

  // ── Stacked Layout (quote, image) ──
  'stacked': (spec, content, ctx) => {
    const accent = ctx.accent;
    const sections = [];

    if (content.quote) {
      sections.push(`
<div class="mp-card mp-card--hero" style="padding:36px;">
  <div style="font-size:72px;line-height:1;color:var(--t-${accent});opacity:0.2;font-family:Georgia,serif;">"</div>
  <div style="font-family:Georgia,serif;font-size:32px;font-weight:700;font-style:italic;line-height:1.4;color:var(--t-ink);margin-top:-30px;">
    ${nl2br(content.quote)}
  </div>
  ${content.attribution ? `<div class="mp-body-muted" style="margin-top:16px;">— ${escHTML(content.attribution)}</div>` : ''}
</div>`);
    }

    if (content.contextCards && content.contextCards.length) {
      const gap = 20;
      const colWidth = Math.floor((1160 - gap * (content.contextCards.length - 1)) / content.contextCards.length);
      const cards = content.contextCards.map((card, i) => {
        const cAccent = getNextAccent(accent, i);
        return `
<div class="mp-card mp-card--secondary" style="padding:24px;">
  <div class="mp-card__topbar mp-card__topbar--${cAccent}">
    <span class="mp-label" style="color:var(--t-ink);">${escHTML(card.title || 'CONTEXT')}</span>
  </div>
  <div class="mp-body">${escHTML(card.description || card)}</div>
</div>`;
      }).join('');
      sections.push(`<div style="display:grid;grid-template-columns:repeat(${content.contextCards.length}, ${colWidth}px);gap:${gap}px;margin-top:24px;">${cards}</div>`);
    }

    return `
<div style="display:flex;flex-direction:column;justify-content:center;height:600px;">
  ${buildSlideHeader(spec, content, ctx)}
  ${sections.join('\n')}
</div>`;
  },

  // ── Vertical Pairs (feature-benefit) ──
  'vertical-pairs': (spec, content, ctx) => {
    const pairs = content.pairs || [];
    const accent = ctx.accent;

    const rows = pairs.map((pair, i) => {
      const feature = pair.feature || pair[0] || '';
      const benefit = pair.benefit || pair[1] || '';
      return `
<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center;">
  <div class="mp-card mp-card--secondary" style="padding:24px;">
    <div class="mp-h4">${escHTML(feature)}</div>
  </div>
  <div class="mp-h2" style="color:var(--t-${accent});">→</div>
  <div class="mp-card mp-card--secondary" style="padding:24px;">
    <div class="mp-h4">${escHTML(benefit)}</div>
  </div>
</div>`;
    }).join('\n');

    return `
<div style="display:flex;flex-direction:column;height:600px;">
  ${buildSlideHeader(spec, content, ctx)}
  <div style="display:flex;flex-direction:column;gap:20px;flex:1;">
    ${rows}
  </div>
</div>`;
  },

  // ── Vertical Stack (faq, commands, layers) ──
  'vertical-stack': (spec, content, ctx) => {
    const accent = ctx.accent;
    const items = content.commands || content.layers || content.qaPairs || content.items || [];
    const isCommandBoard = spec.id === 'command-board';
    const compactCommands = isCommandBoard && items.length >= 5;

    const blocks = items.map((item, i) => {
      const bAccent = getNextAccent(accent, i);

      if (item.command) {
        return `
<div class="mp-card mp-card--dark" style="padding:${compactCommands ? "18px 20px" : "24px"};">
  <div style="font-family:var(--t-font-mono);font-size:${compactCommands ? "18px" : "var(--t-size-body)"};color:var(--t-mint);line-height:1.25;">$ ${escHTML(item.command)}</div>
  ${item.description ? `<div class="mp-body-muted" style="margin-top:${compactCommands ? 6 : 8}px;font-size:${compactCommands ? "13px" : "15px"};line-height:${compactCommands ? 1.3 : 1.4};">${escHTML(item.description)}</div>` : ''}
  ${item.result ? `<div class="mp-small" style="margin-top:6px;color:var(--t-mint);">✓ ${escHTML(item.result)}</div>` : ''}
</div>`;
      }

      if (item.question) {
        return `
<div class="mp-card mp-card--primary" style="padding:24px;">
  <div style="display:flex;gap:12px;align-items:flex-start;">
    <div style="flex-shrink:0;width:32px;height:32px;border-radius:6px;background:var(--t-${bAccent});border:2.5px solid var(--t-ink);display:flex;align-items:center;justify-content:center;">
      <span class="mp-label" style="color:var(--t-white);">Q</span>
    </div>
    <div>
      <div class="mp-h4">${escHTML(item.question)}</div>
      <div class="mp-body-muted" style="margin-top:8px;">${escHTML(item.answer)}</div>
    </div>
  </div>
</div>`;
      }

      if (item.label) {
        return `
<div class="mp-card mp-card--secondary" style="padding:24px;display:flex;gap:16px;align-items:center;">
  <div style="flex-shrink:0;width:160px;padding:10px 16px;background:var(--t-${bAccent});border-radius:8px;text-align:center;">
    <span class="mp-label" style="color:var(--t-white);">${escHTML(item.label)}</span>
  </div>
  <div class="mp-body">${escHTML(item.description || '')}</div>
</div>`;
      }

      return '';
    }).filter(Boolean).join('\n');

    const layoutStyle = compactCommands
      ? "display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:14px 16px;align-content:start;"
      : "display:flex;flex-direction:column;gap:20px;flex:1;";

    return `
<div style="display:flex;flex-direction:column;height:600px;">
  ${buildSlideHeader(spec, content, ctx)}
  <div style="${layoutStyle}min-height:0;flex:1;">
    ${blocks}
  </div>
</div>`;
  },

  // ── Tree Layout ──
  'tree': (spec, content, ctx) => {
    const accent = ctx.accent;
    const root = content.root || 'Root';
    const children = content.children || [];
    const output = content.output;

    const gap = 20;
    const colWidth = Math.floor((1160 - gap * (children.length - 1)) / children.length);

    const childCards = children.map((child, i) => {
      const cAccent = getNextAccent(accent, i);
      const label = typeof child === 'string' ? child : child.label;
      const desc = typeof child === 'object' ? child.description : '';
      return `
<div class="mp-card mp-card--secondary" style="text-align:center;padding:20px;">
  <div class="mp-card__topbar mp-card__topbar--${cAccent}">
    <span class="mp-label" style="color:var(--t-ink);">${escHTML(label)}</span>
  </div>
  ${desc ? `<div class="mp-small" style="margin-top:8px;">${escHTML(desc)}</div>` : ''}
</div>`;
    }).join('\n');

    return `
<div style="display:flex;flex-direction:column;align-items:center;height:600px;">
  ${buildSlideHeader(spec, content, ctx)}
  <div class="mp-card mp-card--hero" style="padding:24px;background:var(--t-${accent});text-align:center;margin-bottom:32px;">
    <span class="mp-h3" style="color:var(--t-white);">${escHTML(root)}</span>
  </div>
  <div style="width:3px;height:24px;background:var(--t-ink);opacity:0.2;"></div>
  <div style="display:grid;grid-template-columns:repeat(${children.length}, ${colWidth}px);gap:${gap}px;margin-top:24px;width:100%;">
    ${childCards}
  </div>
  ${output ? `<div class="mp-card mp-card--dark" style="padding:20px;margin-top:32px;text-align:center;"><span class="mp-h4" style="color:var(--t-white);">${escHTML(output)}</span></div>` : ''}
</div>`;
  },

  // ── Table Layout ──
  'table': (spec, content, ctx) => {
    const headers = content.headers || [];
    const rows = content.rows || [];
    const accent = ctx.accent;

    const headerCells = headers.map(h =>
      `<th style="padding:12px 16px;background:var(--t-${accent});border:2px solid var(--t-ink);text-align:center;">
        <span class="mp-label" style="color:var(--t-white);">${escHTML(h)}</span>
      </th>`
    ).join('');

    const bodyRows = rows.map((row, i) => {
      const bg = i % 2 === 0 ? 'var(--t-paper)' : 'var(--t-paper-alt)';
      const cells = (Array.isArray(row) ? row : [row]).map(cell =>
        `<td style="padding:10px 16px;background:${bg};border:2px solid var(--t-ink);">
          <span class="mp-body">${escHTML(cell)}</span>
        </td>`
      ).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `
<div style="display:flex;flex-direction:column;height:600px;">
  ${buildSlideHeader(spec, content, ctx)}
  <div class="mp-card mp-card--primary" style="flex:1;overflow:hidden;">
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>
  ${content.footNote ? `<div class="mp-small" style="margin-top:12px;">${escHTML(content.footNote)}</div>` : ''}
</div>`;
  },
};

function getTemplateAccent(templateId, fallback = "coral") {
  const preferred = {
    "hero-cover": "coral",
    "narrative-split": "teal",
    "bullet-grid": "yellow",
    "process-lane": "mint",
    "metric-board": "yellow",
    "quote-insight": "teal",
    "compare-dual": "coral",
    "closing-card": "mint",
  };
  return preferred[templateId] || fallback;
}

function visibleLength(text) {
  return String(text || "").replace(/\*\*/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().length;
}

function truncateText(text, maxChars) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!maxChars || value.length <= maxChars) return value;
  return value.slice(0, Math.max(0, maxChars - 1)).trimEnd() + "…";
}

function textList(value, maxItems = Infinity, maxChars = Infinity) {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  return items
    .map((item) => {
      if (typeof item === "string") return truncateText(item, maxChars);
      if (item && typeof item === "object") return truncateText(item.text || item.description || item.label || item.title || "", maxChars);
      return "";
    })
    .filter(Boolean)
    .slice(0, maxItems);
}

function cardItems(value, maxItems = Infinity) {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  return items.filter(Boolean).slice(0, maxItems).map((item) => (typeof item === "object" ? item : { title: String(item), description: "" }));
}

function adaptiveFontSize(text, { large = 72, medium = 64, small = 56, tiny = 48, thresholds = [18, 28, 42] } = {}) {
  const len = visibleLength(text);
  let size = large;
  if (len > thresholds[2]) size = tiny;
  else if (len > thresholds[1]) size = small;
  else if (len > thresholds[0]) size = medium;
  return `${size}px`;
}

function renderBulletList(items, accent, opts = {}) {
  const count = items.length;
  const dense = opts.dense || count > 4;
  const columns = opts.columns || (count > 5 ? 2 : 1);
  const rowsStyle = columns > 1 ? `display:grid;grid-template-columns:repeat(${columns}, minmax(0, 1fr));gap:12px;` : "";
  const itemGap = opts.itemGap || (dense ? 10 : 12);
  const fontSize = opts.fontSize || (dense ? 15 : 16);
  return `<ul class="mp-bullets" style="${rowsStyle}">${items.map((item, i) => `
<li class="mp-bullet" style="gap:${itemGap}px;">
  <div class="mp-bullet__dot" style="background:var(--t-${accent});"></div>
  <span class="mp-bullet__text" style="font-size:${fontSize}px;">${highlightKeywords(escHTML(item))}</span>
</li>`).join("")}</ul>`;
}

function renderBandCard({
  title,
  titleHTML = "",
  accent = "coral",
  body,
  icon,
  bg = "var(--t-paper)",
  titleColor = "#1A1A2E",
  headerBg,
  variant = "secondary",
  cardStyle = "",
  bodyPadding = "18px 20px 20px",
  bodyStyle = "",
  headerSuffix = "",
  contentAlign = "flex-start",
}) {
  const bandBg = headerBg || `var(--t-${accent})`;
  return `
<div class="mp-card mp-card--${variant}" style="padding:0;overflow:hidden;background:${bg};display:flex;flex-direction:column;${cardStyle}">
  <div style="padding:14px 20px 12px;background:${bandBg};display:flex;align-items:center;justify-content:space-between;gap:12px;">
    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
      ${icon ? renderIcon(icon, titleColor, 22) : ""}
      ${titleHTML || `<span class="mp-label" style="color:${titleColor};">${escHTML(title)}</span>`}
    </div>
    ${headerSuffix}
  </div>
  <div style="padding:${bodyPadding};display:flex;flex-direction:column;justify-content:${contentAlign};flex:1;min-height:0;${bodyStyle}">${body}</div>
</div>`;
}

function renderSupportCard({
  title,
  titleHTML = "",
  accent,
  body,
  icon,
  bg = "var(--t-paper)",
  titleColor = "#1A1A2E",
  variant = "secondary",
  cardStyle = "",
  bodyPadding = "18px 20px 20px",
  bodyStyle = "",
  headerBg,
  headerSuffix = "",
  contentAlign = "flex-start",
}) {
  return renderBandCard({
    title,
    accent,
    body,
    icon,
    bg,
    titleColor,
    variant,
    titleHTML,
    cardStyle,
    bodyPadding,
    bodyStyle,
    headerBg,
    headerSuffix,
    contentAlign,
  });
}

function renderMetricTile({ title, value, label, accent, variant = "tile", compact = false, cardStyle = "" }) {
  const valueSize = variant === "hero"
    ? (compact ? "clamp(64px, 7vw, 96px)" : "clamp(72px, 8vw, 120px)")
    : (compact ? "clamp(36px, 5vw, 64px)" : "clamp(42px, 6vw, 82px)");
  return renderBandCard({
    title,
    accent,
    icon: "chart-bar",
    variant: variant === "hero" ? "primary" : "secondary",
    cardStyle,
    bodyPadding: compact ? "14px 18px 16px" : "18px 20px 20px",
    body: `
<div style="font-family:var(--t-font-heading);font-size:${valueSize};font-weight:900;line-height:0.95;color:var(--t-${accent});letter-spacing:-0.04em;">${escHTML(value)}</div>
${label ? `<div class="mp-body-muted" style="margin-top:${compact ? 6 : 8}px;font-size:${compact ? 15 : 16}px;">${highlightKeywords(escHTML(label))}</div>` : ""}`,
  });
}

function buildMetricCards(subMetrics = []) {
  const items = cardItems(subMetrics, 4);
  if (items.length === 0) return [];
  return items.map((item, index) => {
    const value = truncateText(item.value || item.title || item.label || item.description || "", index === 0 ? 18 : 12);
    const label = truncateText(item.label || item.description || item.title || "", 32);
    return { value, label };
  });
}

function getComparisonBullets(content, key, maxItems = 5) {
  if (content[key]) return textList(content[key], maxItems, 96);
  const source = Array.isArray(content.bullets) ? content.bullets : [];
  if (!source.length) return [];
  const half = Math.ceil(source.length / 2);
  return textList(key === "beforeBullets" ? source.slice(0, half) : source.slice(half), maxItems, 96);
}

function getSupportText(content, key, fallback = "") {
  return truncateText(content[key] || fallback, 120);
}

function renderHeroCoverTemplate(spec, content, ctx) {
  const bullets = textList(content.bullets, 4, 80);
  const tags = textList(content.tags, 3, 16);
  const insight = getSupportText(content, "insight", bullets[0] || "Brief observation that frames the narrative");
  const evidence = getSupportText(content, "evidence", bullets[1] || "Key metric, hook, or quick data point");
  const badge = truncateText(content.badge || content.sectionTag || "STRATEGY", 16);
  const visualLabel = truncateText(content.visual?.label || content.visualLabel || "IMAGE / DIAGRAM", 28);
  const visualCopy = truncateText(content.visual?.copy || content.visualCopy || "Product shot, chart, or illustration", 64);
  const visualSrc = content.visual?.src || content.visual?.image || content.image?.src || content.image?.url || "";
  const dense = bullets.length >= 4 || visibleLength(content.body) > 80 || visibleLength(content.title) > 18;
  const heroTitleSize = dense
    ? adaptiveFontSize(content.title || "", { large: 64, medium: 56, small: 50, tiny: 44, thresholds: [12, 18, 26] })
    : adaptiveFontSize(content.title || "", { large: 76, medium: 68, small: 60, tiny: 52 });
  const heroTags = dense ? tags.slice(0, 1) : tags;
  const mainGap = dense ? 20 : 24;

  return `
<div style="display:flex;flex-direction:column;height:600px;">
  ${buildSlideHeader(spec, content, { ...ctx, accent: getTemplateAccent(spec.id, ctx.accent) })}
  <div style="display:grid;grid-template-columns:minmax(0, 1.02fr) minmax(0, 1fr);gap:${mainGap}px;flex:1;min-height:0;">
    <div class="mp-card mp-card--hero" style="display:flex;flex-direction:column;min-height:0;">
      <div class="mp-card__topbar mp-card__topbar--coral">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            ${renderIcon("crown", "#1A1A2E", 24)}
            <span class="mp-label" style="color:#1A1A2E;">HERO COVER</span>
          </div>
          <div class="mp-tag" style="padding:4px 12px;background:var(--t-paper);">${badge}</div>
        </div>
      </div>
      <div class="mp-h1" style="font-size:${heroTitleSize};">${nl2br(content.title || "Design\nThe Future.")}</div>
      <div class="mp-divider" style="margin:${dense ? "14px 0" : "var(--t-section-gap) 0"};"></div>
      ${content.body ? `<div class="mp-body" style="margin-top:0;font-size:${dense ? 13 : 16}px;line-height:${dense ? 1.34 : 1.5};">${highlightKeywords(nl2br(content.body))}</div>` : ""}
      ${bullets.length ? `<div style="margin-top:${dense ? 6 : 16}px;">${renderBulletList(bullets, "coral", { columns: 1, dense: true, fontSize: dense ? 12.5 : 15, itemGap: dense ? 4 : 10 })}</div>` : ""}
      ${heroTags.length ? `<div style="display:flex;gap:10px;margin-top:${dense ? 10 : "auto"};flex-wrap:wrap;">${heroTags.map((tag, index) => `<span class="mp-tag" style="background:var(--t-${["coral","teal","mint"][index % 3]});color:var(--t-ink);">${escHTML(tag)}</span>`).join("")}</div>` : ""}
    </div>
    <div style="display:flex;flex-direction:column;gap:${dense ? 12 : 16}px;min-height:0;">
      ${renderBandCard({
        title: "VISUAL AREA",
        accent: "teal",
        icon: "camera",
        variant: "primary",
        bg: "var(--t-paper-alt)",
        cardStyle: `flex:1;min-height:${dense ? 216 : 240}px;`,
        contentAlign: "center",
        body: visualSrc ? `
<div style="width:100%;height:100%;min-height:${dense ? 188 : 212}px;display:flex;align-items:center;justify-content:center;">
  <img src="${escHTML(visualSrc)}" alt="${escHTML(content.visual?.alt || visualLabel)}" style="width:100%;height:100%;object-fit:cover;border:3px solid var(--t-ink);border-radius:14px;background:var(--t-paper);box-shadow:8px 8px 0 rgba(26,26,46,0.12);" />
</div>` : `
<div style="display:grid;grid-template-columns:1fr;gap:12px;align-items:center;justify-items:center;text-align:center;opacity:0.72;min-height:${dense ? 188 : 212}px;">
  <div style="width:100%;height:120px;border:3px dashed rgba(26,26,46,0.18);border-radius:14px;background:linear-gradient(135deg, rgba(255,97,0,0.12), rgba(0,201,167,0.12));display:flex;align-items:center;justify-content:center;">
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
      <div class="mp-h4">${escHTML(visualLabel)}</div>
      <div class="mp-small" style="max-width:24ch;">${escHTML(visualCopy)}</div>
    </div>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
    ${[...new Set([visualLabel, ...tags].filter(Boolean))].slice(0, 3).map((tag, index) => `<span class="mp-tag" style="background:var(--t-${["coral","teal","mint"][index % 3]});color:var(--t-ink);">${escHTML(tag)}</span>`).join("")}
  </div>
</div>`,
      })}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:${dense ? 12 : 16}px;">
        ${renderSupportCard({ title: "INSIGHT", accent: "pink", icon: "eye", bodyPadding: dense ? "12px 16px 14px" : "14px 18px 16px", body: `<div class="mp-body" style="font-size:${dense ? 14 : 15}px;line-height:1.36;">${highlightKeywords(escHTML(insight))}</div>` })}
        ${renderSupportCard({ title: "SIGNAL", accent: "yellow", icon: "chart-bar", bodyPadding: dense ? "12px 16px 14px" : "14px 18px 16px", body: `<div class="mp-body" style="font-size:${dense ? 14 : 15}px;line-height:1.36;">${highlightKeywords(escHTML(evidence))}</div>` })}
      </div>
    </div>
  </div>
</div>`;
}

function renderNarrativeSplitTemplate(spec, content, ctx) {
  const { headerTitle, headerSubtitle } = splitNarrativeHeader(content.headerTitle || content.title || "Why This Matters", content.headerSubtitle || content.subtitle || "");
  const lead = truncateText(content.body || content.subtitle || content.insight || "", 220);
  const bullets = textList(content.bullets, 5, 240);
  const metric = truncateText(content.metric || "", 12);
  const metricLabel = truncateText(content.metricLabel || "", 70);
  const insight = truncateText(content.insight || "", 120);
  const nextStep = truncateText(content.nextStep || "", 120);
  const evidence = truncateText(content.evidence || "", 120);
  const dense = bullets.length > 4 || visibleLength(lead) > 170 || visibleLength(headerTitle) > 18 || [metric, insight, nextStep, evidence].filter(Boolean).length >= 3;
  const metricSize = dense ? "clamp(52px, 6vw, 88px)" : "clamp(64px, 8vw, 110px)";
  const supportBodyPadding = dense ? "14px 18px 16px" : "18px 20px 20px";
  const supportGap = dense ? 16 : 18;
  const supportCards = [
    metric ? {
      title: "KEY METRIC",
      accent: "teal",
      icon: "chart-bar",
      body: `<div style="font-family:var(--t-font-heading);font-size:${metricSize};font-weight:900;line-height:0.95;color:var(--t-teal);letter-spacing:-0.04em;">${escHTML(metric)}</div>${metricLabel ? `<div class="mp-body-muted" style="margin-top:6px;font-size:${dense ? 15 : 16}px;">${highlightKeywords(escHTML(metricLabel))}</div>` : ""}`,
      bodyPadding: supportBodyPadding,
      contentAlign: "center",
      cardStyle: "min-height:0;",
    } : null,
    insight ? { title: "INSIGHT", accent: "mint", icon: "eye", body: `<div class="mp-body-muted" style="font-size:${dense ? 15 : 16}px;">${highlightKeywords(escHTML(insight))}</div>`, bodyPadding: supportBodyPadding, cardStyle: "min-height:0;" } : null,
    nextStep ? { title: "NEXT STEP", accent: "mint", icon: "arrow-right", body: `<div class="mp-body-muted" style="font-size:${dense ? 15 : 16}px;">${highlightKeywords(escHTML(nextStep))}</div>`, bodyPadding: supportBodyPadding, cardStyle: "min-height:0;" } : null,
    !metric && evidence ? { title: "EVIDENCE", accent: "mint", icon: "chart-bar", body: `<div class="mp-body-muted" style="font-size:${dense ? 15 : 16}px;">${highlightKeywords(escHTML(evidence))}</div>`, bodyPadding: supportBodyPadding, cardStyle: "min-height:0;" } : null
  ].filter(Boolean);

  return `
<div style="display:flex;flex-direction:column;height:600px;">
  ${buildSlideHeader(spec, {
    ...content,
    headerTitle,
    headerSubtitle,
  }, { ...ctx, accent: getTemplateAccent(spec.id, ctx.accent) })}
  <div style="display:grid;grid-template-columns:minmax(0, 0.98fr) minmax(0, 1.02fr);gap:24px;flex:1;min-height:0;">
    <div class="mp-card mp-card--hero" style="display:flex;flex-direction:column;min-height:0;">
      <div class="mp-card__topbar mp-card__topbar--teal">
        <div style="display:flex;align-items:center;gap:10px;">
          ${renderIcon("lightbulb-filament", "#1A1A2E", 22)}
          <span class="mp-label" style="color:#1A1A2E;">MAIN ARGUMENT</span>
        </div>
      </div>
      ${lead ? `<div class="mp-body" style="font-size:${dense ? 14 : 16}px;line-height:${dense ? 1.42 : 1.5};">${highlightKeywords(nl2br(lead))}</div>` : ""}
      ${bullets.length ? `<div style="margin-top:${dense ? 12 : 16}px;flex:1;min-height:0;">${renderBulletList(bullets, "teal", { columns: bullets.length > 4 ? 2 : 1, dense: true, fontSize: dense ? 14 : 15, itemGap: dense ? 8 : 10 })}</div>` : ""}
    </div>
    <div style="display:flex;flex-direction:column;gap:${supportGap}px;min-height:0;justify-content:flex-start;">
      ${supportCards.map((card, index) => renderSupportCard({
        ...card,
        cardStyle: `${card.cardStyle || ""} ${supportCards.length === 1 ? "flex:1;" : ""} min-height:0;`,
        bodyPadding: card.bodyPadding || (index === 0 ? supportBodyPadding : (dense ? "12px 18px 14px" : "14px 20px 16px")),
      })).join("")}
    </div>
  </div>
</div>`;
}

function splitNarrativeHeader(title, subtitle = "") {
  const raw = stripSectionPrefix(title);
  const compact = String(raw || "").replace(/\s+/g, " ").trim();
  if (!compact) {
    return {
      headerTitle: "Why This Matters",
      headerSubtitle: truncateText(subtitle, 64),
    };
  }

  const parts = compact.split(/[，,。！？!?；;：:]/).map((part) => part.trim()).filter(Boolean);
  const headline = parts[0] || compact;
  const tail = parts.slice(1).join("，");

  return {
    headerTitle: truncateText(headline, 20),
    headerSubtitle: truncateText(subtitle || tail, 64),
  };
}

function stripSectionPrefix(value) {
  return String(value || "").replace(/^\s*[一二三四五六七八九十0-9]+[、.．:：\s]+/, "");
}

function renderBulletGridTemplate(spec, content, ctx) {
  const bullets = textList(content.bullets || content.items, 8, 92);
  const columns = bullets.length <= 2 ? bullets.length : bullets.length <= 4 ? 2 : bullets.length <= 6 ? 3 : 4;
  const icons = ["lightning", "circle", "sparkle", "heart", "pen-nib", "target", "star", "lightning"];

  return `
<div style="display:flex;flex-direction:column;height:600px;">
  ${buildSlideHeader(spec, content, { ...ctx, accent: getTemplateAccent(spec.id, ctx.accent) })}
  <div style="display:grid;grid-template-columns:repeat(${columns}, minmax(0, 1fr));gap:20px;flex:1;min-height:0;align-content:start;">
    ${bullets.map((bullet, index) => {
      const accent = ["pink", "teal", "yellow", "mint", "coral"][index % 5];
      return renderBandCard({
        title: String(index + 1).padStart(2, "0"),
        accent,
        icon: icons[index % icons.length],
        variant: "primary",
        cardStyle: "min-height:170px;",
        bodyPadding: "18px 18px 20px",
        body: `<div class="mp-body" style="font-size:${bullet.length > 80 ? 14 : 16}px;line-height:1.45;">${highlightKeywords(escHTML(bullet))}</div>`,
      });
    }).join("")}
  </div>
</div>`;
}

function renderProcessLaneTemplate(spec, content, ctx) {
  const steps = cardItems(content.steps || content.bullets, 5).map((step) => {
    if (typeof step === "string") return { title: step, description: "" };
    return { title: step.title || step.label || "", description: step.description || step.body || "" };
  }).filter((step) => step.title || step.description);
  const palette = ["coral", "teal", "yellow", "mint", "pink"];
  const nodeIcons = ["lightning", "flag", "compass", "trophy", "star"];
  const maxDescLength = Math.max(0, ...steps.map((step) => visibleLength(step.description || "")));
  const stepGap = steps.length > 3 ? 14 : 20;
  const descSize = steps.length > 4 ? 13 : steps.length > 3 ? 14 : 15;
  const compactGrid = steps.length >= 5 || (
    steps.length >= 4 && (
      visibleLength(content.title) > 20 ||
      maxDescLength > 88
    )
  );

  if (compactGrid) {
    return `
<div style="display:flex;flex-direction:column;height:600px;">
  ${buildSlideHeader(spec, content, { ...ctx, accent: getTemplateAccent(spec.id, ctx.accent) })}
  <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:14px 16px;flex:1;min-height:0;align-content:start;">
    ${steps.map((step, index) => renderBandCard({
      title: step.title || `ITEM ${String(index + 1).padStart(2, "0")}`,
      accent: palette[index % palette.length],
      icon: nodeIcons[index % nodeIcons.length],
      variant: "primary",
      cardStyle: "min-height:0;",
      bodyPadding: "11px 15px 13px",
      body: `${step.description ? `<div class="mp-body-muted" style="font-size:12.5px;line-height:1.28;">${highlightKeywords(escHTML(step.description))}</div>` : ""}`,
    })).join("")}
  </div>
</div>`;
  }

  return `
<div style="display:flex;flex-direction:column;height:600px;">
  ${buildSlideHeader(spec, content, { ...ctx, accent: getTemplateAccent(spec.id, ctx.accent) })}
  <div style="position:relative;display:flex;flex-direction:column;gap:${stepGap}px;flex:1;padding-left:36px;min-height:0;">
  <div style="position:absolute;left:18px;top:0;bottom:0;width:4px;border-left:4px dashed var(--t-ink);opacity:0.15;"></div>
    ${steps.map((step, index) => `
<div style="display:flex;gap:18px;align-items:flex-start;position:relative;z-index:1;">
  <div style="flex-shrink:0;width:${steps.length > 3 ? 40 : 44}px;height:${steps.length > 3 ? 40 : 44}px;border-radius:50%;background:var(--t-${palette[index % palette.length]});border:4px solid var(--t-ink);display:flex;align-items:center;justify-content:center;">
    ${renderIcon(nodeIcons[index % nodeIcons.length], "#1A1A2E", steps.length > 3 ? 20 : 22)}
  </div>
  ${renderBandCard({
    title: step.title || `ITEM ${String(index + 1).padStart(2, "0")}`,
    accent: palette[index % palette.length],
    variant: "primary",
    cardStyle: "flex:1;min-height:0;",
    bodyPadding: steps.length > 4 ? "12px 18px 14px" : steps.length > 3 ? "12px 18px 14px" : "16px 24px 20px",
    body: `${step.description ? `<div class="mp-body-muted" style="font-size:${descSize}px;line-height:${steps.length > 3 ? 1.32 : 1.4};">${highlightKeywords(escHTML(step.description))}</div>` : ""}`,
  })}
</div>`).join("")}
  </div>
</div>`;
}

function renderMetricBoardTemplate(spec, content, ctx) {
  const bullets = textList(content.bullets, 3, 96);
  const subMetrics = buildMetricCards(content.subMetrics || []);
  const heroMetric = truncateText(content.metric || subMetrics[0]?.value || extractMetricFromText(bullets[0]) || "", 16);
  const heroLabel = truncateText(content.metricLabel || content.body || bullets[0] || "", 120);
  const delta = truncateText(content.metricDelta || "", 18);
  const compact = bullets.length >= 3 || subMetrics.length >= 3 || visibleLength(heroLabel) > 52 || visibleLength(content.title) > 18;
  const heroMetricSize = compact
    ? adaptiveFontSize(heroMetric, { large: 92, medium: 84, small: 74, tiny: 64, thresholds: [8, 12, 16] })
    : adaptiveFontSize(heroMetric, { large: 104, medium: 96, small: 84, tiny: 72, thresholds: [8, 12, 16] });
  const topTile = subMetrics[0] || null;
  const tileA = subMetrics[1] || null;
  const tileB = subMetrics[2] || null;
  const takeaway = truncateText(content.takeaway || content.summary || bullets[2] || "", 120);
  const smallTileCompact = compact || visibleLength(tileA?.label || "") > 18 || visibleLength(tileB?.label || "") > 18;
  const hasSecondaryMetrics = Boolean(topTile || tileA || tileB);

  return `
<div style="display:flex;flex-direction:column;height:600px;">
  ${buildSlideHeader(spec, content, { ...ctx, accent: getTemplateAccent(spec.id, ctx.accent) })}
  <div style="display:grid;grid-template-columns:minmax(0, 0.98fr) minmax(0, 1fr);gap:24px;flex:1;min-height:0;">
    <div class="mp-card mp-card--hero" style="display:flex;flex-direction:column;min-height:0;">
      <div class="mp-card__topbar mp-card__topbar--coral" style="margin:calc(-1 * var(--t-card-pad)) calc(-1 * var(--t-card-pad)) 18px;padding:16px 24px 14px;border-radius:24px 24px 0 0;">
        <div style="display:flex;align-items:center;gap:10px;">
          ${renderIcon("chart-bar", "#1A1A2E", 22)}
          <span class="mp-label" style="color:#1A1A2E;">HERO METRIC</span>
        </div>
      </div>
      <div style="font-family:var(--t-font-heading);font-size:${heroMetricSize};font-weight:900;line-height:0.95;color:var(--t-coral);letter-spacing:-0.04em;">${escHTML(heroMetric)}</div>
      <div class="mp-body" style="margin-top:10px;font-size:${compact ? "clamp(16px, 1.8vw, 20px)" : "clamp(18px, 2.1vw, 24px)"};max-width:18ch;">${highlightKeywords(escHTML(heroLabel))}</div>
      ${delta ? `<div class="mp-tag" style="display:inline-flex;background:var(--t-mint);color:var(--t-ink);margin-top:14px;align-self:flex-start;">${escHTML(delta)}</div>` : ""}
      ${bullets.length ? `<div class="mp-divider" style="margin:${compact ? "18px 0 14px" : "var(--t-section-gap) 0"};"></div>${renderBulletList(bullets, "coral", { dense: true, fontSize: compact ? 14 : 15, itemGap: compact ? 8 : 10 })}` : ""}
    </div>
    <div style="display:grid;grid-template-rows:${hasSecondaryMetrics ? `minmax(${compact ? 116 : 132}px, auto) auto auto` : "1fr auto"};gap:14px;min-height:0;align-content:start;">
      ${topTile ? renderBandCard({
        title: topTile.label ? topTile.label.toUpperCase() : "DETAIL",
        accent: "teal",
        icon: "chart-bar",
        variant: "primary",
        cardStyle: "min-height:0;",
        bodyPadding: compact ? "14px 18px 16px" : "16px 20px 18px",
        contentAlign: "flex-end",
        body: `
<div style="font-family:var(--t-font-heading);font-size:${adaptiveFontSize(topTile.value, { large: compact ? 64 : 72, medium: compact ? 56 : 64, small: compact ? 50 : 56, tiny: 44, thresholds: [8, 12, 16] })};font-weight:900;line-height:0.95;color:var(--t-teal);">${escHTML(topTile.value)}</div>
<div class="mp-body-muted" style="margin-top:4px;font-size:${compact ? 14 : 15}px;">${highlightKeywords(escHTML(topTile.label || "supporting metric"))}</div>`,
      }) : renderBandCard({
        title: "DETAILS",
        accent: "teal",
        icon: "eye",
        variant: "primary",
        cardStyle: "min-height:0;",
        bodyPadding: "16px 20px 18px",
        body: `<div class="mp-body" style="font-size:${compact ? 14 : 15}px;line-height:1.45;">${highlightKeywords(escHTML(bullets[0] || content.body || ""))}</div>`
      })}
      ${hasSecondaryMetrics && tileA && tileB ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;min-height:0;">
        ${renderMetricTile({ title: "DETAIL 2", value: tileA.value, label: tileA.label, accent: "pink", compact: smallTileCompact, cardStyle: "min-height:0;" })}
        ${renderMetricTile({ title: "DETAIL 3", value: tileB.value, label: tileB.label, accent: "mint", compact: smallTileCompact, cardStyle: "min-height:0;" })}
      </div>` : ""}
      ${renderBandCard({
        title: "KEY TAKEAWAY",
        accent: "yellow",
        icon: "lightbulb-filament",
        variant: "primary",
        cardStyle: "min-height:0;",
        bodyPadding: compact ? "12px 18px 16px" : "14px 20px 18px",
        body: `<div class="mp-body" style="font-size:${compact ? 14 : 15}px;line-height:1.45;">${highlightKeywords(escHTML(takeaway || bullets[0] || ""))}</div>`,
      })}
    </div>
  </div>
</div>`;
}

function renderQuoteInsightTemplate(spec, content, ctx) {
  const quote = truncateText(content.quote || content.body || content.subtitle || content.bullets?.[0] || "", 160);
  const attribution = truncateText(content.attribution || content.author || "", 60);
  const tags = textList(content.tags, 3, 12);
  const cards = cardItems(content.contextCards || content.bullets?.slice(1), 3);
  const cardTitles = ["CONTEXT", "RELEVANCE", "APPLICATION"];
  const renderedCards = (cards.length ? cards : cardTitles.map((title) => ({ title, description: quote }))).slice(0, 3);
  const cardColumns = Math.max(1, Math.min(renderedCards.length, 3));

  return `
<div style="display:flex;flex-direction:column;height:600px;">
  ${buildSlideHeader(spec, content, { ...ctx, accent: getTemplateAccent(spec.id, ctx.accent) })}
  ${renderBandCard({
    title: "FEATURED QUOTE",
    accent: "teal",
    icon: "chat-circle",
    variant: "hero",
    cardStyle: "min-height:220px;",
    bodyPadding: "22px 28px 24px",
    body: `
<div style="display:grid;grid-template-columns:minmax(0, 1fr) auto;gap:20px;align-items:start;">
  <div>
    <div style="font-size:72px;line-height:0.8;color:var(--t-coral);opacity:0.2;font-family:Georgia,serif;">"</div>
    <div style="font-family:Georgia,serif;font-size:clamp(26px, 3vw, 40px);font-weight:700;font-style:italic;line-height:1.32;color:var(--t-ink);margin-top:-30px;max-width:19ch;">${escHTML(quote)}</div>
    ${attribution ? `<div class="mp-body-muted" style="margin-top:16px;">— ${escHTML(attribution)}</div>` : ""}
  </div>
  <div style="display:flex;gap:12px;align-items:center;justify-content:flex-end;justify-self:end;flex-wrap:wrap;max-width:330px;padding-top:32px;">
    ${tags.map((tag, index) => `<span class="mp-tag" style="background:var(--t-${["pink","yellow","mint"][index % 3]});color:var(--t-ink);">${escHTML(tag)}</span>`).join("")}
  </div>
</div>`,
  })}
      <div style="display:grid;grid-template-columns:repeat(${cardColumns}, minmax(0, 1fr));gap:20px;margin-top:20px;flex:1;min-height:0;">
    ${renderedCards.map((card, index) => renderBandCard({
      title: card.title || card.label || cardTitles[index],
      accent: ["pink", "teal", "yellow"][index % 3],
      icon: ["eye", "circle", "lightbulb-filament"][index % 3],
      variant: "secondary",
      cardStyle: "min-height:0;",
      bodyPadding: "16px 18px 18px",
      body: `<div class="mp-body" style="font-size:15px;line-height:1.42;">${highlightKeywords(escHTML(card.description || card.body || card.text || card.title || ""))}</div>`,
    })).join("")}
  </div>
</div>`;
}

function renderCompareDualTemplate(spec, content, ctx) {
  const beforeLabel = truncateText(content.beforeLabel || "BEFORE", 16);
  const afterLabel = truncateText(content.afterLabel || "AFTER", 16);
  const beforeBullets = getComparisonBullets(content, "beforeBullets", 5);
  const afterBullets = getComparisonBullets(content, "afterBullets", 5);
  const takeaway = truncateText(content.takeaway || "", 120);

  return `
<div style="display:flex;flex-direction:column;height:600px;">
  ${buildSlideHeader(spec, content, { ...ctx, accent: getTemplateAccent(spec.id, ctx.accent) })}
  <div style="display:grid;grid-template-columns:minmax(0, 1fr) 88px minmax(0, 1fr);gap:24px;flex:1;min-height:0;align-items:stretch;">
    <div class="mp-card mp-card--primary" style="display:flex;flex-direction:column;padding:0;overflow:hidden;">
      <div style="margin:0;padding:14px 24px;background:var(--t-ink-muted);">
        <span class="mp-label" style="color:var(--t-white);">${escHTML(beforeLabel)}</span>
      </div>
      <div style="padding:18px 24px 20px;flex:1;display:flex;flex-direction:column;">
        ${renderBulletList(beforeBullets, "ink-muted", { dense: beforeBullets.length > 4, columns: beforeBullets.length > 4 ? 1 : 1 })}
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;">
      <div style="width:60px;height:60px;border-radius:50%;border:4px solid var(--t-ink);background:var(--t-coral);display:flex;align-items:center;justify-content:center;box-shadow:6px 6px 0 rgba(26,26,46,0.15);">
        ${renderIcon("arrow-right", "#FFFFFF", 28)}
      </div>
    </div>
    <div class="mp-card mp-card--primary" style="display:flex;flex-direction:column;padding:0;overflow:hidden;">
      <div style="margin:0;padding:14px 24px;background:var(--t-mint);">
        <span class="mp-label" style="color:var(--t-white);">${escHTML(afterLabel)}</span>
      </div>
      <div style="padding:18px 24px 20px;flex:1;display:flex;flex-direction:column;">
        ${renderBulletList(afterBullets, "mint", { dense: afterBullets.length > 4, columns: afterBullets.length > 4 ? 1 : 1 })}
      </div>
    </div>
  </div>
  ${takeaway ? `<div style="margin-top:16px;flex-shrink:0;"><div style="background:var(--t-yellow);border:3px solid var(--t-ink);border-radius:8px;padding:12px 24px;text-align:center;"><span class="mp-h4">${highlightKeywords(escHTML(takeaway))}</span></div></div>` : ""}
</div>`;
}

function renderClosingCardTemplate(spec, content, ctx) {
  const points = cardItems(content.points, 4).map((point, index) => ({
    value: truncateText(point.title || point.value || String(index + 1).padStart(2, "0"), 8),
    label: truncateText(point.description || point.label || "", 48)
  }));
  const pointColors = ["pink", "teal", "yellow", "mint"];
  const pointCount = Math.max(2, points.length || 4);
  const pointCardPadding = pointCount > 3 ? "14px 14px 16px" : "16px 16px 18px";

  return `
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:600px;">
  ${buildSlideHeader(spec, content, { ...ctx, accent: getTemplateAccent(spec.id, ctx.accent) })}
  <div class="mp-h1" style="text-align:center;font-size:${adaptiveFontSize(content.title || "", { large: 74, medium: 66, small: 58, tiny: 52 })};">${nl2br(content.title || "Design\nThe Future.")}</div>
  ${content.subtitle ? `<div class="mp-body-muted" style="text-align:center;margin-top:16px;max-width:32ch;">${highlightKeywords(escHTML(content.subtitle))}</div>` : ""}
  <div style="display:grid;grid-template-columns:repeat(${pointCount}, minmax(0, 1fr));gap:20px;margin-top:28px;width:100%;">
    ${(points.length ? points : [1, 2, 3, 4].map((n) => ({ value: String(n).padStart(2, "0"), label: `Key point ${n}` }))).slice(0, 4).map((point, index) => renderBandCard({
      title: point.value,
      titleHTML: `<span class="mp-h3" style="color:#1A1A2E;font-size:32px;line-height:1;">${escHTML(point.value)}</span>`,
      accent: pointColors[index % pointColors.length],
      variant: "subtle",
      bodyPadding: pointCardPadding,
      body: `<div class="mp-small" style="font-size:15px;line-height:1.45;text-align:center;">${highlightKeywords(escHTML(point.label))}</div>`,
      bodyStyle: "text-align:center;",
      headerSuffix: "",
      contentAlign: "center",
    })).join("")}
  </div>
</div>`;
}

function extractMetricFromText(text) {
  const match = String(text || "").match(/\d[\d,.%万亿kKmM]*/);
  return match ? match[0] : "";
}

// ═══════════════════════════════════════
//  Helper: Slide Header (bar + subtitle + squares)
//  Does NOT render the main title — that's in the content area
// ═══════════════════════════════════════

function buildSlideHeader(spec, content, ctx) {
  const accent = ctx.accent;
  const title = content.headerTitle || content.title || '';
  const subtitle = content.headerSubtitle || content.subtitle || '';

  return `
<div data-safe-area="header" style="display:flex;align-items:center;gap:16px;margin-bottom:20px;flex-shrink:0;">
  <div style="width:14px;height:60px;background:var(--t-${accent});border-radius:2px;flex-shrink:0;"></div>
  <div>
    ${title ? `<div class="mp-h2">${escHTML(title)}</div>` : ''}
    ${subtitle ? `<div class="mp-small" style="letter-spacing:0.1em;">${escHTML(subtitle)}</div>` : ''}
  </div>
  <div style="margin-left:auto;">
    ${buildColorSquares()}
  </div>
</div>`;
}

function buildColorSquares() {
  return `
<div class="mp-color-squares">
  <div style="background:var(--t-pink);"></div>
  <div style="background:var(--t-teal);"></div>
  <div style="background:var(--t-mint);"></div>
  <div style="background:var(--t-yellow);"></div>
</div>`;
}

// ═══════════════════════════════════════
//  Helper: Footer (description + page counter)
// ═══════════════════════════════════════

function buildFooter(ctx, footerText) {
  const page = `${String(ctx.index + 1).padStart(2, '0')} / ${String(ctx.total).padStart(2, '0')}`;
  const desc = footerText || 'Memphis HTML PPT · Design System';
  return `
<div class="mp-footer" data-safe-area="footer">
  <span class="mp-footer__text">${escHTML(desc)}</span>
  <span class="mp-footer__page">${page}</span>
</div>`;
}

// ═══════════════════════════════════════
//  Helper: Memphis Decorations (corners)
// ═══════════════════════════════════════

function buildDecorations(ctx) {
  const accent = ctx.accent;
  const accents = ['coral', 'teal', 'yellow', 'mint', 'pink'];
  const accent2 = accents[(accents.indexOf(accent) + 2) % accents.length];

  // Different decoration sets per page index for variety
  const decoSets = [
    // Set 0: dots top-right + triangle top-right + wave bottom
    () => `
<svg style="position:absolute;top:0;right:0;pointer-events:none;" width="160" height="80" viewBox="0 0 160 80">
  <pattern id="dots-${ctx.index}" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2.2" fill="#1A1A2E" fill-opacity="0.18"/></pattern>
  <rect width="160" height="80" fill="url(#dots-${ctx.index})"/>
</svg>
<svg style="position:absolute;top:44px;right:180px;pointer-events:none;" width="44" height="52" viewBox="0 0 44 52">
  <path d="M8,44 L22,4 L36,44 Z" fill="var(--t-yellow)" stroke="#1A1A2E" stroke-width="2.5" stroke-linejoin="round"/>
</svg>
<svg style="position:absolute;bottom:0;left:60px;pointer-events:none;" width="180" height="40" viewBox="0 0 180 40">
  <path d="M10,28 C40,12 80,32 120,18 C145,10 165,24 178,16" stroke="#1A1A2E" stroke-width="2" stroke-dasharray="8 8" fill="none" stroke-linecap="round" opacity="0.18"/>
  <circle cx="8" cy="30" r="4" fill="#1A1A2E" opacity="0.15"/>
</svg>`,

    // Set 1: scatter dots bottom-left + small square top-right
    () => `
<svg style="position:absolute;bottom:0;right:0;pointer-events:none;" width="120" height="60" viewBox="0 0 120 60">
  <circle cx="20" cy="30" r="10" fill="var(--t-${accent})" fill-opacity="0.12"/>
  <circle cx="55" cy="20" r="6" fill="var(--t-${accent2})" fill-opacity="0.15"/>
  <circle cx="90" cy="40" r="8" fill="var(--t-yellow)" fill-opacity="0.12"/>
</svg>
<svg style="position:absolute;top:40px;right:40px;pointer-events:none;" width="36" height="36" viewBox="0 0 36 36">
  <rect x="4" y="4" width="28" height="28" rx="4" fill="var(--t-${accent})" fill-opacity="0.25" stroke="#1A1A2E" stroke-width="2" transform="rotate(12 18 18)"/>
</svg>
<svg style="position:absolute;bottom:0;left:40px;pointer-events:none;" width="140" height="30" viewBox="0 0 140 30">
  <path d="M10,20 C35,8 65,24 95,14 C110,9 125,18 135,12" stroke="#1A1A2E" stroke-width="2" stroke-dasharray="6 6" fill="none" opacity="0.15"/>
</svg>`,

    // Set 2: dashed circle bottom-right + triangle top-left
    () => `
<svg style="position:absolute;bottom:20px;right:40px;pointer-events:none;" width="60" height="60" viewBox="0 0 60 60">
  <circle cx="30" cy="30" r="24" fill="none" stroke="var(--t-${accent})" stroke-width="2" stroke-dasharray="5 5" opacity="0.3"/>
</svg>
<svg style="position:absolute;top:40px;right:60px;pointer-events:none;" width="40" height="48" viewBox="0 0 40 48">
  <path d="M6,42 L20,6 L34,42 Z" fill="var(--t-mint)" stroke="#1A1A2E" stroke-width="2" stroke-linejoin="round" opacity="0.7"/>
</svg>
<svg style="position:absolute;bottom:10px;left:80px;pointer-events:none;" width="100" height="24" viewBox="0 0 100 24">
  <path d="M8,16 C28,6 52,20 76,10 C88,5 95,14 98,10" stroke="#1A1A2E" stroke-width="2" stroke-dasharray="6 6" fill="none" opacity="0.15"/>
</svg>`,

    // Set 3: colored circles top-left + dots bottom-right
    () => `
<svg style="position:absolute;top:36px;right:50px;pointer-events:none;" width="80" height="50" viewBox="0 0 80 50">
  <circle cx="20" cy="25" r="14" fill="var(--t-${accent})" fill-opacity="0.15" stroke="#1A1A2E" stroke-width="1.5" opacity="0.5"/>
  <circle cx="55" cy="18" r="8" fill="var(--t-yellow)" fill-opacity="0.20"/>
</svg>
<svg style="position:absolute;bottom:0;right:0;pointer-events:none;" width="100" height="50" viewBox="0 0 100 50">
  <pattern id="dots2-${ctx.index}" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2" fill="#1A1A2E" fill-opacity="0.15"/></pattern>
  <rect width="100" height="50" fill="url(#dots2-${ctx.index})"/>
</svg>
<svg style="position:absolute;bottom:0;left:0;pointer-events:none;" width="160" height="30" viewBox="0 0 160 30">
  <path d="M10,22 C40,8 80,26 120,14 C140,8 150,18 155,12" stroke="#1A1A2E" stroke-width="2" stroke-dasharray="8 8" fill="none" opacity="0.15"/>
</svg>`,
  ];

  // Pick decoration set based on page index
  const setIndex = ctx.index % decoSets.length;
  return decoSets[setIndex]();
}

// ═══════════════════════════════════════
//  Helper: Left Split Content
// ═══════════════════════════════════════

function buildLeftSplit(spec, content, ctx) {
  const accent = ctx.accent;
  const icon = getIconForTemplate(spec.id);
  const parts = [];

  // Title (rendered once, here)
  if (content.title) {
    parts.push(`<div class="mp-h1">${nl2br(content.title)}</div>`);
  }

  // Body text
  if (content.body) {
    parts.push(`<div class="mp-body" style="margin-top:var(--t-section-gap);">${nl2br(content.body)}</div>`);
  }

  // Bullets
  if (content.bullets && content.bullets.length) {
    const items = content.bullets.map(b => {
      const text = typeof b === 'string' ? b : b.text || b;
      return `
<li class="mp-bullet">
  <div class="mp-bullet__dot" style="background:var(--t-${accent});"></div>
  <span class="mp-bullet__text">${highlightKeywords(escHTML(text))}</span>
</li>`;
    }).join('');
    parts.push(`<ul class="mp-bullets" style="margin-top:var(--t-section-gap);">${items}</ul>`);
  }

  // Tags
  if (content.tags && content.tags.length) {
    parts.push(buildTags(content.tags, accent));
  }

  // Quote
  if (content.quote && !content.contextCards) {
    parts.push(`<div class="mp-body-muted" style="font-style:italic;margin-top:var(--t-section-gap);border-left:3px solid var(--t-${accent});padding-left:16px;">"${nl2br(content.quote)}"</div>`);
  }

  return `
<div class="mp-card mp-card--hero">
  <div class="mp-card__topbar mp-card__topbar--${accent}">
    <span class="mp-label" style="color:var(--t-ink);">${escHTML(spec.description?.toUpperCase() || 'CONTENT')}</span>
  </div>
  ${parts.join('\n')}
</div>`;
}

// ═══════════════════════════════════════
//  Helper: Right Split Content
// ═══════════════════════════════════════

function buildRightSplit(spec, content, ctx) {
  const accent = ctx.accent;
  const accent2 = getNextAccent(accent, 1);
  const parts = [];

  // Metric card (top right)
  if (content.metric) {
    parts.push(`
<div class="mp-card mp-card--primary">
  <div class="mp-card__topbar mp-card__topbar--${accent}">
    <span class="mp-label" style="color:var(--t-ink);">KEY METRIC</span>
  </div>
  <div class="mp-metric" style="color:var(--t-${accent});">${nl2br(content.metric)}</div>
  ${content.metricLabel ? `<div class="mp-body-muted" style="margin-top:4px;">${nl2br(content.metricLabel)}</div>` : ''}
  ${content.metricDelta ? `<div class="mp-tag" style="background:var(--t-mint);color:var(--t-ink);margin-top:12px;">${escHTML(content.metricDelta)}</div>` : ''}
</div>`);
  }

  // Image placeholder (if no metric, show image)
  if (!content.metric && (content.image || !content.insight)) {
    parts.push(`
<div class="mp-card mp-card--primary" style="display:flex;align-items:center;justify-content:center;flex:1;min-height:180px;background:var(--t-paper-alt);">
  <div style="text-align:center;opacity:0.4;">
    <div class="mp-h4">Image / Visual Area</div>
    <div class="mp-small" style="margin-top:6px;">Product shot, diagram, or illustration</div>
  </div>
</div>`);
  }

  // Supporting cards
  if (content.insight) {
    parts.push(`
<div class="mp-card mp-card--secondary">
  <div class="mp-card__topbar mp-card__topbar--${accent2}">
    <span class="mp-label" style="color:var(--t-ink);">INSIGHT</span>
  </div>
  <div class="mp-body-muted" style="margin-top:8px;">${nl2br(content.insight)}</div>
</div>`);
  }

  if (content.evidence) {
    parts.push(`
<div class="mp-card mp-card--secondary">
  <div class="mp-card__topbar mp-card__topbar--${accent2}">
    <span class="mp-label" style="color:var(--t-ink);">EVIDENCE</span>
  </div>
  <div class="mp-body-muted" style="margin-top:8px;">${nl2br(content.evidence)}</div>
</div>`);
  }

  if (content.nextStep) {
    parts.push(`
<div class="mp-card mp-card--secondary">
  <div class="mp-card__topbar mp-card__topbar--mint">
    <span class="mp-label" style="color:var(--t-ink);">NEXT STEP</span>
  </div>
  <div class="mp-body-muted" style="margin-top:8px;">${nl2br(content.nextStep)}</div>
</div>`);
  }

  // If still empty, add a default insight card
  if (parts.length === 0) {
    parts.push(`
<div class="mp-card mp-card--primary" style="display:flex;align-items:center;justify-content:center;flex:1;min-height:180px;background:var(--t-paper-alt);">
  <div style="text-align:center;opacity:0.4;">
    <div class="mp-h4">Visual Area</div>
    <div class="mp-small" style="margin-top:6px;">Add image, chart, or supporting content</div>
  </div>
</div>`);
  }

  return `
<div style="display:flex;flex-direction:column;gap:var(--t-card-gap);">
  ${parts.join('\n')}
</div>`;
}

// ═══════════════════════════════════════
//  Helper: Tags
// ═══════════════════════════════════════

function buildTags(tags, accent) {
  const tagAccents = ['coral', 'teal', 'mint'];
  return `
<div style="display:flex;gap:10px;margin-top:var(--t-section-gap);flex-wrap:wrap;">
  ${tags.map((tag, i) => {
    const tAccent = tagAccents[i % tagAccents.length];
    return `<span class="mp-tag" style="background:var(--t-${tAccent});color:var(--t-ink);">${escHTML(tag)}</span>`;
  }).join('')}
</div>`;
}

// ═══════════════════════════════════════
//  Helper: Bullet Card (for grid)
// ═══════════════════════════════════════

function buildBulletCard(text, index, accent, spec) {
  return `
<div class="mp-card mp-card--primary" style="padding:var(--t-card-pad);">
  <div style="display:flex;align-items:flex-start;gap:12px;">
    <div class="mp-bullet__dot" style="background:var(--t-${accent});flex-shrink:0;margin-top:6px;"></div>
    <div class="mp-body">${highlightKeywords(escHTML(text))}</div>
  </div>
</div>`;
}

function buildItemCard(item, index, accent, spec) {
  const title = item.title || item.label || item;
  const desc = item.description || item.desc || '';
  const icon = item.icon || '';

  return `
<div class="mp-card mp-card--secondary" style="padding:var(--t-card-pad);text-align:center;">
  ${icon ? `<div style="width:48px;height:48px;border-radius:50%;background:var(--t-${accent});border:3px solid var(--t-ink);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:24px;">${icon}</div>` : ''}
  <div class="mp-h4">${escHTML(title)}</div>
  ${desc ? `<div class="mp-small" style="margin-top:6px;">${escHTML(desc)}</div>` : ''}
</div>`;
}

// ═══════════════════════════════════════
//  Helper: Compare Side (Before/After)
// ═══════════════════════════════════════

function buildCompareSide(spec, data, ctx, colorMode) {
  const accent = colorMode === 'gray' ? 'inkMuted' : 'mint';
  const topbarClass = colorMode === 'gray' ? 'mp-card__topbar--dark' : 'mp-card__topbar--mint';
  const topbarBg = colorMode === 'gray' ? 'var(--t-ink-muted)' : 'var(--t-mint)';

  const bullets = (data.bullets || []).map(b => {
    const text = typeof b === 'string' ? b : b.text || b;
    const dotColor = colorMode === 'gray' ? 'var(--t-ink-muted)' : 'var(--t-mint)';
    return `
<li class="mp-bullet">
  <div class="mp-bullet__dot" style="background:${dotColor};"></div>
  <span class="mp-bullet__text">${highlightKeywords(escHTML(text))}</span>
</li>`;
  }).join('');

  return `
<div class="mp-card mp-card--primary" style="display:flex;flex-direction:column;">
  <div style="margin:-24px -24px 16px -24px;padding:14px 24px;background:${topbarBg};border-radius:14px 14px 0 0;">
    <span class="mp-label" style="color:var(--t-white);">${escHTML(data.title || 'SIDE')}</span>
  </div>
  <ul class="mp-bullets" style="flex:1;">
    ${bullets}
  </ul>
  ${data.metric ? `<div class="mp-metric" style="margin-top:auto;color:var(--t-${colorMode === 'gray' ? 'ink' : 'mint'});">${escHTML(data.metric)}</div>` : ''}
</div>`;
}

// ═══════════════════════════════════════
//  Utilities
// ═══════════════════════════════════════

function highlightKeywords(text) {
  return text.replace(/\*\*(.*?)\*\*/g, '<span class="mp-emphasis">$1</span>');
}

function getNextAccent(baseAccent, offset) {
  const accents = ['coral', 'teal', 'yellow', 'mint', 'pink'];
  const baseIndex = accents.indexOf(baseAccent);
  return accents[(baseIndex + offset + 1) % accents.length];
}

function nl2br(str) {
  if (!str) return '';
  return escHTML(String(str)).replace(/\n/g, '<br>');
}

function escHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Memphis icon SVG paths (16x16 viewBox)
const ICONS = {
  crown:    '<path d="M0 12L2 4L5 8L8 1L11 8L14 4L16 12H0ZM0 14H16V16H0V14Z"/>',
  lightning:'<path d="M9 7L10 0H8L2 7V9H7L6 16H8L14 9L14 7H9Z"/>',
  eye:      '<path d="M8 3C4.5 3 1.5 5.5 0 8C1.5 10.5 4.5 13 8 13C11.5 13 14.5 10.5 16 8C14.5 5.5 11.5 3 8 3ZM8 11C5.8 11 4 9.2 4 7C4 4.8 5.8 3 8 3C10.2 3 12 4.8 12 7C12 9.2 10.2 11 8 11Z"/><circle cx="8" cy="7" r="2"/>',
  chart:    '<path d="M0 10H4V16H0V10ZM6 6H10V16H6V6ZM12 2H16V16H12V2Z"/>',
  bulb:     '<path d="M5 14H11V15C11 15.6 10.6 16 10 16H6C5.4 16 5 15.6 5 15V14ZM8 0C4.7 0 2 2.7 2 6C2 8.2 3.4 10.1 5.5 11V12.5C5.5 13.1 5.8 13.4 6 13.5H10C10.2 13.4 10.5 13.1 10.5 12.5V11C12.6 10.1 14 8.2 14 6C14 2.7 11.3 0 8 0Z"/>',
  arrow:    '<path d="M8 0L16 8L8 16L6 14L10 10H0V6H10L6 2L8 0Z"/>',
  shield:   '<path d="M8 0L0 3V7.5C0 11.6 3.1 15.3 8 16C12.9 15.3 16 11.6 16 7.5V3L8 0ZM7 11L4 8L5.4 6.6L7 8.2L10.6 4.6L12 6L7 11Z"/>',
  ring:     '<path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C11.31 2 14 4.69 14 8C14 11.31 11.31 14 8 14Z"/>',
  star:     '<path d="M8 0L10 6H16L11 9.5L13 16L8 12L3 16L5 9.5L0 6H6L8 0Z"/>',
  heart:    '<path d="M1.24 8.24L8 15L14.76 8.24C15.55 7.45 16 6.37 16 5.24V5.05C16 2.81 14.19 1 11.95 1C10.72 1 9.55 1.56 8.78 2.52L8 3.5L7.22 2.52C6.45 1.56 5.28 1 4.05 1C1.81 1 0 2.81 0 5.05V5.24C0 6.37 0.45 7.45 1.24 8.24Z"/>',
  pen:      '<path d="M12 0L16 4L5 15H1V11L12 0ZM13.5 1.5L14.5 2.5L13 4L12 3L13.5 1.5Z"/>',
  target:   '<path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C11.31 2 14 4.69 14 8C14 11.31 11.31 14 8 14ZM8 4C5.79 4 4 5.79 4 8C4 10.21 5.79 12 8 12C10.21 12 12 10.21 12 8C12 5.79 10.21 4 8 4ZM8 6C9.1 6 10 6.9 10 8C10 9.1 9.1 10 8 10C6.9 10 6 9.1 6 8C6 6.9 6.9 6 8 6Z"/>',
  flag:     '<path d="M2 0V16H4V9L14 5L4 1V0H2Z"/>',
  diamond:  '<path d="M8 0L16 8L8 16L0 8Z"/>',
  camera:   '<path d="M6 2L7.5 0H8.5L10 2H14C15.1 2 16 2.9 16 4V13C16 14.1 15.1 15 14 15H2C0.9 15 0 14.1 0 13V4C0 2.9 0.9 2 2 2H6ZM8 5C5.79 5 4 6.79 4 9C4 11.21 5.79 13 8 13C10.21 13 12 11.21 12 9C12 6.79 10.21 5 8 5Z"/>',
  chat:     '<path d="M0 2C0 0.9 0.9 0 2 0H14C15.1 0 16 0.9 16 2V10C16 11.1 15.1 12 14 12H5L0 16V2Z"/>',
  gear:     '<path d="M5 0H10L10.5 2.5L12.5 3.5L15 2.5L16 5L14 7L14.5 9L16 10.5L14.5 13L12 12.5L10.5 14.5L11 16H5L5.5 14L3.5 13L1 14L0 11.5L2 9.5L1.5 7.5L0 6L1.5 3.5L4 4L5.5 2L6 0ZM8 5.5C6.6 5.5 5.5 6.6 5.5 8C5.5 9.4 6.6 10.5 8 10.5C9.4 10.5 10.5 9.4 10.5 8C10.5 6.6 9.4 5.5 8 5.5Z"/>',
  cube:     '<path d="M8 0L15 4V12L8 16L1 12V4L8 0ZM8 2L3 5V11L8 14L13 11V5L8 2Z"/>',
};

function renderIcon(name, color = "#1A1A2E", size = 20) {
  const aliases = {
    "chart-bar": "chart",
    "lightbulb-filament": "bulb",
    "arrow-right": "arrow",
    "chat-circle": "chat",
    "pen-nib": "pen",
    "sparkle": "star",
    "circle": "ring",
    "compass": "target",
    "trophy": "star",
  };
  const iconName = aliases[name] || name;
  const path = ICONS[iconName] || ICONS.star;
  return `<svg viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true" style="display:block;fill:${color};flex-shrink:0;">${path}</svg>`;
}

// Icon mapping per template
const TEMPLATE_ICON_MAP = {
  'hero-cover':        'crown',
  'hero-centered':     'star',
  'hero-split-block':  'diamond',
  'narrative-split':   'bulb',
  'bullet-grid':       'lightning',
  'icon-grid':         'cube',
  'metric-board':      'chart',
  'stat-highlight':    'chart',
  'compare-dual':      'arrow',
  'before-after':      'arrow',
  'process-lane':      'gear',
  'horizontal-timeline':'flag',
  'quote-insight':     'chat',
  'warning-callout':   'shield',
  'data-table':        'target',
  'hierarchy-tree':    'ring',
  'layer-stack':       'cube',
  'swim-lane':         'flag',
  'feature-benefit':   'star',
  'checklist-board':   'heart',
  'faq-panel':         'chat',
  'agenda-overview':   'flag',
  'image-showcase':    'camera',
  'command-board':     'pen',
  'closing-card':      'star',
  'contact-cta':       'chat',
};

function getIconForTemplate(templateId) {
  const iconName = TEMPLATE_ICON_MAP[templateId] || 'star';
  return ICONS[iconName] || ICONS.star;
}

function renderFallbackSlide(slidePlan, ctx) {
  const isActive = ctx.index === 0 ? ' active' : '';
  return `
<div class="mp-deck${isActive}" data-slide="${ctx.index + 1}" style="width:1280px;height:720px;position:relative;overflow:hidden;background:var(--t-paper);">
  <div class="mp-slide" style="width:100%;height:100%;position:relative;overflow:hidden;box-sizing:border-box;">
    <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;padding:60px;">
      <div class="mp-h1">${escHTML(slidePlan.content?.title || 'Untitled')}</div>
      <div class="mp-body-muted" style="margin-top:16px;">Template "${slidePlan.templateId}" not found</div>
    </div>
    ${buildFooter(ctx)}
  </div>
</div>`;
}
