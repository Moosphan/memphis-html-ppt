/**
 * Theme Engine — Design tokens + CSS generation
 *
 * Generates CSS custom properties from theme config.
 * Supports runtime theme switching by swapping the token object.
 * Design language derived from SVG template masters.
 */

// ═══════════════════════════════════════
//  Base Memphis Theme
// ═══════════════════════════════════════

export const MEMPHIS_THEME = {
  id: 'memphis-editorial',
  name: 'Memphis Editorial',

  // ── Colors ──
  colors: {
    paper:    '#FFF8EE',   // warm cream background
    paperAlt: '#F5EDE0',   // slightly darker cream for cards
    ink:      '#1A1A2E',   // primary text / strokes
    inkLight: '#4A4A6A',   // secondary text
    inkMuted: '#5C5C7A',   // tertiary text / captions

    // Accent palette
    coral:    '#FF6B4A',
    teal:     '#00B8D9',
    yellow:   '#FFD93D',
    mint:     '#00C896',
    pink:     '#FF3DA5',

    // Semantic
    textEmphasis: '#C0392B',  // highlighted text on light bg (≥ 4.5:1 contrast)
    white:        '#FFFFFF',
  },

  // ── Typography ──
  typography: {
    // Font families — Impact for headings (bold Memphis feel), Montserrat for body
    heading: '"Impact", "Arial Black", "Helvetica Neue", sans-serif',
    body:    '"Montserrat", "Noto Sans SC", sans-serif',
    mono:    '"Courier New", monospace',

    // Size scale (responsive via clamp)
    sizes: {
      h1:     'clamp(48px, 6vw, 88px)',    // page title — big impact
      h2:     'clamp(28px, 3.5vw, 48px)',  // section header
      h3:     'clamp(20px, 2.5vw, 32px)',  // card title
      h4:     'clamp(16px, 2vw, 24px)',    // sub-card title
      body:   'clamp(15px, 1.6vw, 19px)',  // body text
      small:  'clamp(12px, 1.2vw, 15px)',  // captions
      tiny:   'clamp(10px, 1vw, 13px)',    // labels/tags
    },

    // Weights
    weights: {
      black:    900,
      bold:     700,
      semibold: 600,
      medium:   500,
    },

    // Letter spacing
    spacing: {
      tight:    '-0.02em',
      normal:   '0',
      wide:     '0.08em',
      wider:    '0.12em',
      widest:   '0.14em',
    },
  },

  // ── Spacing ──
  spacing: {
    slide:     'clamp(40px, 5vw, 80px)',     // slide padding
    cardGap:   'clamp(16px, 2vw, 28px)',     // between cards
    cardPad:   'clamp(24px, 3vw, 48px)',      // inside cards — generous padding
    sectionGap:'clamp(12px, 1.5vw, 20px)',   // between sections
    itemGap:   'clamp(8px, 1vw, 14px)',      // between list items
  },

  // ── Card Styles (unified: all use 4px border, 14px radius) ──
  cards: {
    hero: {
      radius: '14px',
      border: '4px solid #1A1A2E',
      shadow: '8px 8px 0 rgba(26,26,46,0.12)',
    },
    primary: {
      radius: '14px',
      border: '4px solid #1A1A2E',
      shadow: '8px 8px 0 rgba(26,26,46,0.12)',
    },
    secondary: {
      radius: '14px',
      border: '4px solid #1A1A2E',
      shadow: '6px 6px 0 rgba(26,26,46,0.10)',
    },
    subtle: {
      radius: '14px',
      border: '3px solid #1A1A2E',
      shadow: '4px 4px 0 rgba(26,26,46,0.08)',
    },
    dark: {
      radius: '14px',
      border: '4px solid #1A1A2E',
      bg: '#1A1A2E',
      shadow: '8px 8px 0 rgba(26,26,46,0.18)',
    },
  },

  // ── Decoration ──
  decoration: {
    dotPattern: {
      size: 20,
      radius: 2.2,
      opacity: 0.22,
      color: '#1A1A2E',
    },
    strokeWidth: {
      thin: '2px',
      normal: '3px',
      thick: '4px',
      heavy: '5px',
    },
    cornerRadius: {
      small: '4px',
      medium: '8px',
      large: '14px',
      pill: '14px',   // Memphis style: rounded square, not full capsule
    },
  },
};

// ═══════════════════════════════════════
//  CSS Generation
// ═══════════════════════════════════════

/**
 * Generate CSS custom properties from theme
 */
export function generateThemeCSS(theme = MEMPHIS_THEME) {
  return `
:root {
  /* Colors */
  --t-paper: ${theme.colors.paper};
  --t-paper-alt: ${theme.colors.paperAlt};
  --t-ink: ${theme.colors.ink};
  --t-ink-light: ${theme.colors.inkLight};
  --t-ink-muted: ${theme.colors.inkMuted};
  --t-coral: ${theme.colors.coral};
  --t-teal: ${theme.colors.teal};
  --t-yellow: ${theme.colors.yellow};
  --t-mint: ${theme.colors.mint};
  --t-pink: ${theme.colors.pink};
  --t-text-emphasis: ${theme.colors.textEmphasis};
  --t-white: ${theme.colors.white};

  /* Typography */
  --t-font-heading: ${theme.typography.heading};
  --t-font-body: ${theme.typography.body};
  --t-font-mono: ${theme.typography.mono};
  --t-size-h1: ${theme.typography.sizes.h1};
  --t-size-h2: ${theme.typography.sizes.h2};
  --t-size-h3: ${theme.typography.sizes.h3};
  --t-size-h4: ${theme.typography.sizes.h4};
  --t-size-body: ${theme.typography.sizes.body};
  --t-size-small: ${theme.typography.sizes.small};
  --t-size-tiny: ${theme.typography.sizes.tiny};

  /* Spacing */
  --t-slide-pad: ${theme.spacing.slide};
  --t-card-gap: ${theme.spacing.cardGap};
  --t-card-pad: ${theme.spacing.cardPad};
  --t-section-gap: ${theme.spacing.sectionGap};
  --t-item-gap: ${theme.spacing.itemGap};

  /* Cards */
  --t-card-hero-radius: ${theme.cards.hero.radius};
  --t-card-hero-border: ${theme.cards.hero.border};
  --t-card-hero-shadow: ${theme.cards.hero.shadow};
  --t-card-primary-radius: ${theme.cards.primary.radius};
  --t-card-primary-border: ${theme.cards.primary.border};
  --t-card-primary-shadow: ${theme.cards.primary.shadow};
  --t-card-secondary-radius: ${theme.cards.secondary.radius};
  --t-card-secondary-border: ${theme.cards.secondary.border};
  --t-card-secondary-shadow: ${theme.cards.secondary.shadow};
  --t-card-subtle-radius: ${theme.cards.subtle.radius};
  --t-card-subtle-border: ${theme.cards.subtle.border};
  --t-card-subtle-shadow: ${theme.cards.subtle.shadow};
  --t-card-dark-bg: ${theme.cards.dark.bg};

  /* Decoration */
  --t-stroke-thin: ${theme.decoration.strokeWidth.thin};
  --t-stroke-normal: ${theme.decoration.strokeWidth.normal};
  --t-stroke-thick: ${theme.decoration.strokeWidth.thick};
  --t-corner-pill: ${theme.decoration.cornerRadius.pill};
}
`.trim();
}

/**
 * Generate the base component CSS classes
 */
export function generateBaseCSS() {
  return `
/* ═══════════════════════════════════════
   Memphis HTML PPT — Base Styles
   ═══════════════════════════════════════ */

* { margin: 0; padding: 0; box-sizing: border-box; }

/* Fixed 1280×720 slide, auto-scaled to viewport */
.mp-slide {
  width: 1280px;
  height: 720px;
  background: var(--t-paper);
  font-family: var(--t-font-body);
  color: var(--t-ink);
  position: relative;
  overflow: hidden;
  padding: 60px;
  /* Scale container handles responsive sizing */
}

/* ── Typography ── */

.mp-h1 {
  font-family: var(--t-font-heading);
  font-size: var(--t-size-h1);
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: var(--t-ink);
}

.mp-h2 {
  font-family: var(--t-font-heading);
  font-size: var(--t-size-h2);
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1.1;
  color: var(--t-ink);
}

.mp-h3 {
  font-family: var(--t-font-heading);
  font-size: var(--t-size-h3);
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1.2;
  color: var(--t-ink);
}

.mp-h4 {
  font-family: var(--t-font-heading);
  font-size: var(--t-size-h4);
  font-weight: 900;
  letter-spacing: 0.02em;
  color: var(--t-ink);
}

.mp-body {
  font-family: var(--t-font-body);
  font-size: var(--t-size-body);
  font-weight: 700;
  line-height: 1.5;
  color: var(--t-ink);
}

.mp-body-muted {
  font-family: var(--t-font-body);
  font-size: var(--t-size-body);
  font-weight: 500;
  line-height: 1.5;
  color: var(--t-ink-muted);
}

.mp-small {
  font-family: var(--t-font-body);
  font-size: var(--t-size-small);
  font-weight: 600;
  color: var(--t-ink-muted);
}

.mp-label {
  font-family: var(--t-font-body);
  font-size: var(--t-size-tiny);
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--t-ink);
}

.mp-emphasis {
  color: var(--t-text-emphasis);
  font-weight: 900;
}

.mp-metric {
  font-family: var(--t-font-heading);
  font-size: clamp(48px, 8vw, 120px);
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--t-ink);
}

/* ── Cards ── */

.mp-card {
  background: var(--t-paper);
  position: relative;
  overflow: hidden;
}

.mp-card--hero {
  border-radius: var(--t-card-hero-radius);
  border: var(--t-card-hero-border);
  box-shadow: var(--t-card-hero-shadow);
  padding: var(--t-card-pad);
}

.mp-card--primary {
  border-radius: var(--t-card-primary-radius);
  border: var(--t-card-primary-border);
  box-shadow: var(--t-card-primary-shadow);
  padding: var(--t-card-pad);
}

.mp-card--secondary {
  border-radius: var(--t-card-secondary-radius);
  border: var(--t-card-secondary-border);
  box-shadow: var(--t-card-secondary-shadow);
  padding: var(--t-card-pad);
}

.mp-card--subtle {
  border-radius: var(--t-card-subtle-radius);
  border: var(--t-card-subtle-border);
  box-shadow: var(--t-card-subtle-shadow);
  padding: var(--t-card-pad);
}

.mp-card--dark {
  border-radius: var(--t-card-primary-radius);
  border: var(--t-card-primary-border);
  box-shadow: var(--t-card-primary-shadow);
  background: var(--t-card-dark-bg);
  color: var(--t-paper);
  padding: var(--t-card-pad);
}

/* Card top bar (colored header) */
.mp-card__topbar {
  margin: calc(-1 * var(--t-card-pad));
  margin-bottom: var(--t-card-pad);
  padding: calc(var(--t-card-pad) * 0.6) var(--t-card-pad);
  border-radius: var(--t-card-primary-radius) var(--t-card-primary-radius) 0 0;
}

.mp-card__topbar--coral  { background: var(--t-coral); }
.mp-card__topbar--teal   { background: var(--t-teal); }
.mp-card__topbar--yellow { background: var(--t-yellow); }
.mp-card__topbar--mint   { background: var(--t-mint); }
.mp-card__topbar--pink   { background: var(--t-pink); }
.mp-card__topbar--dark   { background: var(--t-ink); }

/* ── Tags / Pills ── */

.mp-tag {
  display: inline-block;
  padding: 6px 16px;
  border-radius: var(--t-corner-pill);
  border: 2.5px solid var(--t-ink);
  font-family: var(--t-font-body);
  font-size: var(--t-size-tiny);
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ── Bullet List ── */

.mp-bullets {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--t-item-gap);
}

.mp-bullet {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.mp-bullet__dot {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--t-ink);
  margin-top: 4px;
}

.mp-bullet__text {
  font-family: var(--t-font-body);
  font-size: var(--t-size-body);
  font-weight: 700;
  line-height: 1.5;
  color: var(--t-ink);
}

/* ── Divider ── */

.mp-divider {
  height: 2px;
  background: var(--t-ink);
  opacity: 0.12;
  margin: var(--t-section-gap) 0;
}

/* ── Section / Page chips ── */

.mp-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: var(--t-card-gap);
}

.mp-header__bar {
  width: 14px;
  height: 48px;
  border-radius: 2px;
}

.mp-header__title {
  font-family: var(--t-font-heading);
  font-size: var(--t-size-h2);
  font-weight: 900;
  letter-spacing: 0.02em;
}

.mp-header__subtitle {
  font-family: var(--t-font-body);
  font-size: var(--t-size-small);
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--t-ink-muted);
}

/* ── Footer ── */

.mp-footer {
  position: absolute;
  bottom: 24px;
  left: 60px;
  right: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mp-footer__text {
  font-family: var(--t-font-body);
  font-size: var(--t-size-tiny);
  font-weight: 600;
  color: var(--t-ink-muted);
}

.mp-footer__page {
  font-family: var(--t-font-heading);
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: var(--t-ink);
}

/* ── Decorations ── */

.mp-deco-dots {
  position: absolute;
  opacity: ${MEMPHIS_THEME.decoration.dotPattern.opacity};
}

.mp-deco-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.08;
}

.mp-deco-triangle {
  position: absolute;
}

.mp-deco-wave {
  position: absolute;
}

/* ── Color squares (header decoration) ── */

.mp-color-squares {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  width: 52px;
}

.mp-color-squares > div {
  width: 26px;
  height: 26px;
  border: 2px solid var(--t-ink);
}
`.trim();
}

/**
 * Get accent color by name
 */
export function getAccentColor(name, theme = MEMPHIS_THEME) {
  const map = {
    coral: theme.colors.coral,
    teal: theme.colors.teal,
    yellow: theme.colors.yellow,
    mint: theme.colors.mint,
    pink: theme.colors.pink,
  };
  return map[name] || theme.colors.coral;
}

/**
 * Cycle through accent colors
 */
export function* accentCycler() {
  const accents = ['coral', 'teal', 'yellow', 'mint', 'pink'];
  let i = 0;
  while (true) {
    yield accents[i % accents.length];
    i++;
  }
}
