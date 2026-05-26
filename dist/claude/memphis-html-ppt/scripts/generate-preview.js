import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const cssPath = path.join(rootDir, "assets", "memphis-preview.css");
const templateLibraryPath = path.join(rootDir, "assets", "template-library.json");

// ── Phosphor Icons (MIT License, https://phosphoricons.com) ──
// Uses ph-fill weight for Memphis bold style
const PHOSPHOR_CDN = "https://unpkg.com/@phosphor-icons/web@2.1.1/src/Fill/style.css";

// 120+ icons organized by semantic category
const ICON_CATEGORIES = {
  tech: [
    "cpu", "code", "terminal", "database", "cloud", "wifi", "plug", "power",
    "hard-drives", "memory", "sim-card", "device-mobile", "laptop", "monitor",
    "printer", "robot", "satellite", "qr-code", "binary", "git-branch"
  ],
  data: [
    "chart-bar", "chart-line", "chart-pie", "chart-donut", "trend-up", "trend-down",
    "calculator", "percent", "currency-dollar", "currency-euro", "hash", "minus",
    "plus", "equals", "number-square-seven", "math-operations", "rows", "columns"
  ],
  business: [
    "briefcase", "money", "bank", "wallet", "receipt", "credit-card", "coins",
    "hand-coins", "piggy-bank", "chart-bar", "presentation-chart", "gavel",
    "scales", "scroll", "certificate", "stamp", "storefront", "shopping-cart"
  ],
  people: [
    "users", "user", "user-circle", "user-gear", "user-plus", "user-minus",
    "users-three", "identification-badge", "identification-card", "address-book",
    "baby", "wheelchair", "gender-intersex", "t-shirt", "mask", "crown"
  ],
  communication: [
    "chat-circle", "chats", "envelope", "envelope-simple", "phone", "video-camera",
    "megaphone", "broadcast", "radio", "antenna", "speaker-high", "bell",
    "bell-ringing", "notification", "share-network", "link", "globe", "translate"
  ],
  creative: [
    "palette", "paint-brush", "pen-nib", "pencil", "eraser", "scissors",
    "ruler", "compass-tool", "magic-wand", "sparkle", "sparkles", "star",
    "star-half", "crown", "diamond", "gem", "flower", "butterfly"
  ],
  nature: [
    "sun", "moon", "cloud", "cloud-rain", "cloud-lightning", "snowflake",
    "drop", "fire", "leaf", "tree", "plant", "flower-lotus",
    "mountain", "waves", "wind", "thermometer", "umbrella", "rainbow"
  ],
  arrows: [
    "arrow-up", "arrow-down", "arrow-left", "arrow-right",
    "arrows-out", "arrows-in", "arrows-clockwise", "arrows-counter-clockwise",
    "arrow-arc-right", "arrow-elbow-right", "arrow-fat-up", "arrow-fat-down",
    "trend-up", "trend-down", "path", "rocket", "launch", "flag"
  ],
  shapes: [
    "circle", "square", "triangle", "diamond", "hexagon", "octagon",
    "pentagon", "star", "heart", "lightning", "plus", "minus",
    "x", "check", "equals", "hash", "at", "asterisk"
  ],
  ui: [
    "house", "magnifying-glass", "gear-six", "sliders", "list", "grid-four",
    "copy", "clipboard", "trash", "archive", "folder", "file",
    "bookmark", "tag", "lock", "lock-open", "eye", "eye-slash",
    "shield-check", "shield-warning", "fingerprint", "key"
  ],
  time: [
    "clock", "clock-clockwise", "timer", "hourglass", "calendar", "calendar-check",
    "calendar-x", "calendar-plus", "alarm", "clock-afternoon", "clock-countdown",
    "history", "clock-rotate-left", "clock-rotate-right", "compass", "map-pin"
  ],
  media: [
    "play", "pause", "stop", "skip-forward", "skip-back", "fast-forward",
    "rewind", "record", "microphone", "microphone-slash", "speaker-high",
    "headphones", "music-note", "vinyl-record", "radio", "film-strip",
    "camera", "image"
  ],
  abstract: [
    "infinity", "atom", "brain", "dna", "puzzle-piece", "gear-six",
    "lightbulb", "lightbulb-filament", "battery-full", "battery-charging",
    "traffic-cone", "flag", "flag-banner", "trophy", "medal", "target",
    "crosshair", "selection", "stack", "rows"
  ]
};

// Flatten all icons into a single set for fallback
const ALL_ICONS = [...new Set(Object.values(ICON_CATEGORIES).flat())];
const ACCENTS = ["pink", "blue", "yellow", "mint", "coral"];
const ACCENT_HEX = { pink: "#FF3DA5", blue: "#00B8D9", yellow: "#FFD93D", mint: "#00C896", coral: "#FF6B4A" };

// Template → icon category mapping
const TEMPLATE_ICON_MAP = {
  "hero-cover": ["creative", "abstract", "arrows"],
  "narrative-split": ["communication", "people", "ui"],
  "bullet-grid": ["ui", "shapes", "data"],
  "command-board": ["tech", "ui", "arrows"],
  "process-lane": ["arrows", "time", "abstract"],
  "compare-dual": ["shapes", "data", "business"],
  "warning-callout": ["ui", "nature", "shapes"],
  "metric-board": ["data", "business", "tech"],
  "stack-note": ["abstract", "creative", "shapes"],
  "essay-panel": ["communication", "people", "nature"],
  "closing-card": ["creative", "nature", "abstract"],
  "quote-insight": ["creative", "communication", "people"],
  "icon-grid": ["tech", "business", "ui"],
  "faq-panel": ["communication", "ui", "people"],
  "agenda-overview": ["time", "ui", "arrows"],
  "checklist-board": ["ui", "shapes", "data"],
  "horizontal-timeline": ["time", "arrows", "abstract"],
  "stat-highlight": ["data", "business", "tech"],
  "hierarchy-tree": ["tech", "people", "abstract"],
  "data-table": ["data", "business", "ui"],
  "feature-benefit": ["business", "creative", "tech"],
  "before-after": ["arrows", "nature", "abstract"],
  "layer-stack": ["tech", "abstract", "shapes"]
};

// Track used icons per deck to avoid repetition
let usedIcons = new Set();

// ── Memphis decorative element generators ──
function generateDecoElements(slideIndex) {
  const seed = slideIndex * 13 + 7;
  const elements = [];
  // 18 distinct positions across the slide edges and corners
  const positions = [
    { top: "8px", right: "8px" },
    { top: "8px", right: "120px" },
    { top: "8px", left: "200px" },
    { top: "80px", right: "8px" },
    { top: "50%", right: "6px", transform: "translateY(-50%)" },
    { top: "30%", right: "6px" },
    { top: "65%", right: "10px" },
    { bottom: "60px", right: "10px" },
    { bottom: "60px", right: "130px" },
    { bottom: "60px", left: "8px" },
    { bottom: "120px", left: "6px" },
    { top: "40%", left: "6px" },
    { top: "15%", left: "6px" },
    { bottom: "180px", right: "8px" },
    { top: "120px", left: "8px" },
    { bottom: "8px", left: "250px" },
    { top: "8px", left: "8px" },
    { bottom: "8px", right: "250px" }
  ];
  const types = ["dots", "zigzag", "ring", "squiggle", "triangle", "checker", "cross"];
  // Each slide gets 3-4 deco elements with varied types
  const count = 3 + (slideIndex % 2); // 3 or 4
  for (let i = 0; i < count; i++) {
    const typeIdx = (seed + i * 3) % types.length;
    const posIdx = (seed + i * 5 + slideIndex) % positions.length;
    elements.push({
      type: types[typeIdx],
      ...positions[posIdx]
    });
  }
  return elements;
}

function renderDeco(el) {
  const style = Object.entries(el)
    .filter(([k]) => k !== "type")
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return `<div class="memphis-deco memphis-${el.type}" style="${style}"></div>`;
}

// ── Icon selection: template-based + anti-repeat ──
function pickIcon(templateId, slideIndex) {
  const categories = TEMPLATE_ICON_MAP[templateId] || ["abstract", "ui", "shapes"];
  // Rotate through categories per slide
  const catName = categories[slideIndex % categories.length];
  const pool = ICON_CATEGORIES[catName] || ALL_ICONS;
  // Pick first unused icon from pool, or reset if all used
  for (const icon of pool) {
    if (!usedIcons.has(icon)) {
      usedIcons.add(icon);
      return icon;
    }
  }
  // All used in this category, pick by index
  return pool[slideIndex % pool.length];
}

function resetIconTracker() {
  usedIcons = new Set();
}

function renderIcon(iconName, color = "#1A1A2E", size = 20) {
  const cls = `ph-fill ph-${iconName}`;
  return `<i class="${cls}" style="font-size:${size}px;color:${color};flex-shrink:0;"></i>`;
}

// ── Main ──
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.output) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const source = await loadSource(args.input);
  const doc = parseSource(source, args.input);
  const templateLibrary = JSON.parse(await fs.readFile(templateLibraryPath, "utf8"));
  const slides = buildSlides(doc, templateLibrary.templates);
  const css = await fs.readFile(cssPath, "utf8");
  const html = renderDeck({ title: doc.title, slides, css, sourceLabel: args.input });

  await fs.mkdir(path.dirname(path.resolve(args.output)), { recursive: true });
  await fs.writeFile(path.resolve(args.output), html, "utf8");
  console.log(`Generated ${path.resolve(args.output)} (${slides.length} slides)`);
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith("--")) continue;
    result[part.slice(2)] = argv[i + 1];
    i += 1;
  }
  return result;
}

function printUsage() {
  console.log("Usage: node scripts/generate-preview.js --input <url-or-file> --output <html-file>");
}

async function loadSource(input) {
  if (isHttpUrl(input)) {
    const response = await fetch(input, { headers: { "user-agent": "memphis-html-ppt-skill/0.1" } });
    if (!response.ok) throw new Error(`Failed to fetch ${input}: ${response.status}`);
    return { kind: "html", text: await response.text() };
  }
  const raw = await fs.readFile(path.resolve(input), "utf8");
  const ext = path.extname(input).toLowerCase();
  if (ext === ".html" || ext === ".htm") return { kind: "html", text: raw };
  return { kind: "markdown", text: raw };
}

function parseSource(source, label) {
  if (source.kind === "html") return parseHtmlDocument(source.text, label);
  return parseMarkdownDocument(source.text, label);
}

function parseMarkdownDocument(markdown, label) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      if (current) sections.push(current);
      current = { title: heading[2].trim(), level: heading[1].length, paragraphs: [], bullets: [] };
      continue;
    }

    const bullet = line.match(/^[-*+]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      if (!current) current = { title: basenameWithoutExt(label), level: 1, paragraphs: [], bullets: [] };
      current.bullets.push(cleanInlineMarkdown((bullet || numbered)[1]));
      continue;
    }

    if (!current) current = { title: basenameWithoutExt(label), level: 1, paragraphs: [], bullets: [] };
    current.paragraphs.push(cleanInlineMarkdown(line));
  }

  if (current) sections.push(current);
  return { title: sections[0]?.title || basenameWithoutExt(label) || "Presentation", sections };
}

function parseHtmlDocument(html, label) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = cleanupHtmlText(titleMatch?.[1] || basenameWithoutExt(label) || "Presentation");
  const headings = [...html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)];
  const bodyPieces = [...html.matchAll(/<(p|li)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => cleanupHtmlText(m[2])).filter(Boolean);

  const sections = [];
  let cursor = 0;
  for (const heading of headings) {
    const section = { title: cleanupHtmlText(heading[2]), level: Number(heading[1]), paragraphs: [], bullets: [] };
    const local = bodyPieces.slice(cursor, cursor + 4);
    cursor += 4;
    if (local[0]) section.paragraphs.push(local[0]);
    if (local.length > 1) section.bullets.push(...local.slice(1));
    sections.push(section);
  }
  if (sections.length === 0) sections.push({ title, level: 1, paragraphs: bodyPieces.slice(0, 4), bullets: [] });
  return { title, sections };
}

// ── Slide building ──
// Content template pool (excluding hero-cover and closing-card)
const CONTENT_TEMPLATES = [
  "narrative-split", "bullet-grid", "process-lane", "compare-dual",
  "command-board", "warning-callout", "metric-board", "essay-panel",
  "stack-note", "quote-insight", "icon-grid", "faq-panel",
  "agenda-overview", "checklist-board", "horizontal-timeline",
  "stat-highlight", "hierarchy-tree", "data-table",
  "feature-benefit", "before-after", "layer-stack"
];

function buildSlides(doc, templates) {
  resetIconTracker();
  const sections = doc.sections.filter((s) => s.title || s.paragraphs.length || s.bullets.length);
  const slides = [];
  const lookup = new Map(templates.map((t) => [t.id, t]));

  // Build rotation order: shuffle content templates based on section count
  const contentSections = sections.length - 2; // exclude first and last
  const rotation = buildRotation(CONTENT_TEMPLATES, contentSections);

  sections.forEach((section, index) => {
    let templateId;
    if (index === 0) {
      templateId = "hero-cover";
    } else if (index === sections.length - 1) {
      templateId = "closing-card";
    } else {
      templateId = rotation[(index - 1) % rotation.length];
    }
    const template = lookup.get(templateId) || lookup.get("narrative-split");

    // Put all section content into a single slide (no splitting)
    const accent = ACCENTS[index % ACCENTS.length];
    const icon = pickIcon(templateId, index);
    slides.push({
      templateId: template.id,
      layout: template.group,
      sectionIndex: index + 1,
      chunkIndex: 0,
      continuation: false,
      title: section.title,
      subtitle: section.paragraphs[0] || "",
      body: section.paragraphs.slice(1).join(" "),
      bullets: section.bullets,
      accent,
      icon,
      sectionBadge: formatSectionBadge(index + 1, section.title),
      footer: `${index + 1} / ${sections.length}`
    });
  });

  return slides;
}

// Build a rotation order that ensures even distribution
function buildRotation(pool, count) {
  if (count <= 0) return [];
  // Seed shuffle based on count to get consistent but varied order
  const shuffled = [...pool];
  let seed = count * 31 + 7;
  for (let i = shuffled.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Return enough templates to cover all content sections
  const result = [];
  while (result.length < count) {
    for (const t of shuffled) {
      result.push(t);
      if (result.length >= count) break;
    }
  }
  return result;
}


function formatSectionBadge(index, title) {
  const short = title.length > 16 ? title.slice(0, 16) + "..." : title;
  return `${String(index).padStart(2, "0")} | ${short}`;
}

// ── Number extraction for metric-board ──
function extractNumber(text) {
  const m = text.match(/\d[\d,.%万亿]*/);
  return m ? m[0] : text.slice(0, 8);
}

function removeNumber(text) {
  return text.replace(/\d[\d,.%万亿]*\s*/, "").replace(/达到|从|上升到|为|是/g, "").trim() || text;
}

// ── Slide rendering ──
function renderSlide(slide, index, total) {
  const decoElements = generateDecoElements(index);
  const decos = decoElements.map(renderDeco).join("\n        ");

  const templateRenderers = {
    "hero-cover": renderHeroCover,
    "narrative-split": renderNarrativeSplit,
    "bullet-grid": renderBulletGrid,
    "command-board": renderCommandBoard,
    "process-lane": renderProcessLane,
    "compare-dual": renderCompareDual,
    "warning-callout": renderWarningCallout,
    "metric-board": renderMetricBoard,
    "stack-note": renderStackNote,
    "essay-panel": renderEssayPanel,
    "closing-card": renderClosingCard,
    "quote-insight": renderQuoteInsight,
    "icon-grid": renderIconGrid,
    "faq-panel": renderFaqPanel,
    "agenda-overview": renderAgendaOverview,
    "checklist-board": renderChecklistBoard,
    "horizontal-timeline": renderHorizontalTimeline,
    "stat-highlight": renderStatHighlight,
    "hierarchy-tree": renderHierarchyTree,
    "data-table": renderDataTable,
    "feature-benefit": renderFeatureBenefit,
    "before-after": renderBeforeAfter,
    "layer-stack": renderLayerStack
  };

  const renderer = templateRenderers[slide.templateId] || renderNarrativeSplit;
  const content = renderer(slide);

  return `      <article class="slide slide--${slide.layout} slide--${slide.templateId}${index === 1 ? " active" : ""}" data-template="${slide.templateId}" data-accent="${slide.accent}">
        ${decos}
        <div class="section-chip">${esc(slide.sectionBadge)}</div>
        <div class="page-chip">${esc(slide.footer)}</div>
        ${content}
      </article>`;
}

// ── Template renderers ──

function renderHeroCover(slide) {
  const iconHtml = renderIcon(slide.icon, "#1A1A2E", 32);
  return `<div class="slide-content center" style="align-items:flex-start;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">${iconHtml}<span class="slide-subtitle" style="margin:0;">${esc(slide.subtitle || "INTRODUCTION")}</span></div>
      <h1 class="hero-title">${esc(slide.title)}</h1>
      ${slide.body ? `<p class="hero-subtitle">${esc(slide.body)}</p>` : ""}
      ${slide.bullets.length ? `<div class="tag-row" style="margin-top:20px;">${slide.bullets.slice(0, 4).map((b, i) => `<span class="tag ${ACCENTS[i % ACCENTS.length]}">${esc(b)}</span>`).join("")}</div>` : ""}
      <span class="hero-tag">${esc(slide.sectionBadge.split("|")[0]?.trim() || "START")}</span>
    </div>`;
}

function renderNarrativeSplit(slide) {
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  const bulletsHtml = slide.bullets.length
    ? `<ul class="bullet-list">${slide.bullets.map((b, i) => `<li class="bullet-item"><span class="bullet-dot ${ACCENTS[i % ACCENTS.length]}" aria-hidden="true"></span><span>${esc(b)}</span></li>`).join("")}</ul>`
    : "";
  return `<div class="slide-content row">
      <div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">${iconHtml}<span style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:var(--ink-2);">SECTION</span></div>
        <h1 class="slide-title">${esc(slide.title)}</h1>
        ${slide.subtitle ? `<p class="slide-subtitle">${esc(slide.subtitle)}</p>` : ""}
        ${slide.body ? `<p class="slide-body">${esc(slide.body)}</p>` : ""}
      </div>
      <div>${bulletsHtml}</div>
    </div>`;
}

function renderBulletGrid(slide) {
  const iconHtml = renderIcon(slide.icon, "#1A1A2E", 32);
  return `<div class="slide-content">
      <div style="display:flex;align-items:center;gap:10px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
      ${slide.subtitle ? `<p class="slide-subtitle">${esc(slide.subtitle)}</p>` : ""}
      <ul class="bullet-list" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">${slide.bullets.map((b, i) => `<li class="bullet-item"><span class="bullet-dot ${ACCENTS[i % ACCENTS.length]}" aria-hidden="true"></span><span>${esc(b)}</span></li>`).join("")}</ul>
    </div>`;
}

function renderCommandBoard(slide) {
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  const bulletsHtml = slide.bullets.length
    ? `<ul class="bullet-list">${slide.bullets.map((b, i) => `<li class="bullet-item" style="background:#FFFDF5;font-family:Consolas,'Courier New',monospace;"><span class="bullet-dot ${ACCENTS[i % ACCENTS.length]}" aria-hidden="true"></span><span style="font-family:Consolas,'Courier New',monospace;font-size:15px;">${esc(b)}</span></li>`).join("")}</ul>`
    : "";
  return `<div class="slide-content row">
      <div>
        <div style="display:flex;align-items:center;gap:10px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
        ${slide.subtitle ? `<p class="slide-subtitle">${esc(slide.subtitle)}</p>` : ""}
        ${slide.body ? `<p class="slide-body">${esc(slide.body)}</p>` : ""}
      </div>
      <div>${bulletsHtml}</div>
    </div>`;
}

function renderProcessLane(slide) {
  const steps = slide.bullets.length ? slide.bullets : (slide.subtitle ? [slide.subtitle] : ["Step 1"]);
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  const stepIcons = ["lightning", "flag", "compass", "trophy"];
  return `<div class="slide-content">
      <div style="display:flex;align-items:center;gap:10px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
      ${slide.subtitle && !slide.bullets.length ? `<p class="slide-subtitle">${esc(slide.subtitle)}</p>` : ""}
      <div class="process-lane" style="position:relative;">
        <div class="process-track" style="left:28px;top:0;bottom:0;width:4px;background:var(--ink);position:absolute;"></div>
        ${steps.map((step, i) => `<div class="process-step">
            <div class="process-node ${ACCENTS[i % ACCENTS.length]}" style="display:flex;align-items:center;justify-content:center;">${renderIcon(stepIcons[i % stepIcons.length], "#1A1A2E", 24)}</div>
            <div class="process-content"><p>${esc(step)}</p></div>
          </div>`).join("")}
      </div>
    </div>`;
}

function renderCompareDual(slide) {
  const half = Math.ceil(slide.bullets.length / 2);
  const leftBullets = slide.bullets.slice(0, half);
  const rightBullets = slide.bullets.slice(half);
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  return `<div class="slide-content">
      <div style="display:flex;align-items:center;gap:10px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
      ${slide.subtitle ? `<p class="slide-subtitle">${esc(slide.subtitle)}</p>` : ""}
      <div class="compare-grid">
        <div class="compare-col">
          <div class="compare-col-header left" style="display:flex;align-items:center;justify-content:center;gap:8px;">${renderIcon("shield-check", "#1A1A2E", 24)} OPTION A</div>
          <div class="compare-col-body"><ul>${leftBullets.map(b => `<li><span class="check-icon green"><i class="ph-fill ph-check" style="font-size:11px;color:#1A1A2E;"></i></span>${esc(b)}</li>`).join("")}</ul></div>
        </div>
        <div class="compare-col">
          <div class="compare-col-header right" style="display:flex;align-items:center;justify-content:center;gap:8px;">${renderIcon("crosshair", "#1A1A2E", 24)} OPTION B</div>
          <div class="compare-col-body"><ul>${rightBullets.map(b => `<li><span class="check-icon red"><i class="ph-fill ph-x" style="font-size:11px;color:#1A1A2E;"></i></span>${esc(b)}</li>`).join("")}</ul></div>
        </div>
      </div>
    </div>`;
}

function renderWarningCallout(slide) {
  const iconHtml = `<span class="icon-circle coral" style="width:40px;height:40px;border-width:3px;">${renderIcon("shield-warning", "#1A1A2E", 28)}</span>`;
  const bulletsHtml = slide.bullets.length
    ? `<ul class="bullet-list">${slide.bullets.map((b, i) => `<li class="bullet-item" style="background:#FFF4ED;"><span class="bullet-dot coral" aria-hidden="true"></span><span>${esc(b)}</span></li>`).join("")}</ul>`
    : "";
  return `<div class="slide-content">
      <div class="callout-box">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">${iconHtml}<h1 class="slide-title" style="margin:0;font-size:clamp(28px,3.5vw,44px);">${esc(slide.title)}</h1></div>
        ${slide.subtitle ? `<p class="slide-subtitle">${esc(slide.subtitle)}</p>` : ""}
        ${slide.body ? `<p class="slide-body">${esc(slide.body)}</p>` : ""}
      </div>
      ${bulletsHtml}
    </div>`;
}

function renderMetricBoard(slide) {
  const numbers = slide.bullets.length ? slide.bullets : ["--"];
  const iconHtml = renderIcon(slide.icon, "#1A1A2E", 32);
  const metricIcons = ["chart-bar", "target", "trophy", "fire"];
  return `<div class="slide-content">
      <div style="display:flex;align-items:center;gap:10px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
      ${slide.subtitle ? `<p class="slide-subtitle">${esc(slide.subtitle)}</p>` : ""}
      <div class="metric-grid">
        ${numbers.slice(0, 4).map((n, i) => `<div class="metric-tile">
            <div class="metric-tile-header ${ACCENTS[i % ACCENTS.length]}" style="display:flex;align-items:center;justify-content:center;gap:8px;">
              <span class="icon-circle ${ACCENTS[i % ACCENTS.length]}" style="width:32px;height:32px;border-width:2px;">${renderIcon(metricIcons[i % metricIcons.length], "#1A1A2E", 22)}</span>
              <span style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;">METRIC ${i + 1}</span>
            </div>
            <div class="metric-number">${esc(extractNumber(n))}</div>
            <div class="metric-label">${esc(removeNumber(n))}</div>
          </div>`).join("")}
      </div>
    </div>`;
}

function renderStackNote(slide) {
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  return `<div class="slide-content row">
      <div>
        <div style="display:flex;align-items:center;gap:10px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
        ${slide.subtitle ? `<p class="slide-subtitle">${esc(slide.subtitle)}</p>` : ""}
        ${slide.body ? `<p class="slide-body">${esc(slide.body)}</p>` : ""}
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${slide.bullets.map((b, i) => `<div class="card" style="transform:rotate(${(i % 2 === 0 ? -1 : 1) * (1 + i)}deg);">
            <div class="card-header ${ACCENTS[i % ACCENTS.length]}"><span class="card-label">PRINCIPLE ${i + 1}</span></div>
            <div class="card-body"><p style="font-size:16px;font-weight:700;line-height:1.5;">${esc(b)}</p></div>
          </div>`).join("")}
      </div>
    </div>`;
}

function renderEssayPanel(slide) {
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  const bulletsHtml = slide.bullets.length
    ? `<ul class="bullet-list">${slide.bullets.map((b, i) => `<li class="bullet-item"><span class="bullet-dot ${ACCENTS[i % ACCENTS.length]}" aria-hidden="true"></span><span>${esc(b)}</span></li>`).join("")}</ul>`
    : "";
  return `<div class="slide-content row">
      <div style="flex:1.2;">
        <div style="display:flex;align-items:center;gap:10px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
        ${slide.subtitle ? `<p class="slide-subtitle">${esc(slide.subtitle)}</p>` : ""}
        ${slide.body ? `<p class="slide-body" style="max-width:none;">${esc(slide.body)}</p>` : ""}
      </div>
      <div style="flex:0.8;">${bulletsHtml}</div>
    </div>`;
}

function renderClosingCard(slide) {
  const bulletsHtml = slide.bullets.length
    ? `<div class="tag-row" style="justify-content:center;margin-top:16px;">${slide.bullets.slice(0, 4).map((b, i) => `<span class="tag ${ACCENTS[i % ACCENTS.length]}">${esc(b)}</span>`).join("")}</div>`
    : "";
  return `<div class="slide-content center">
      <div class="icon-circle pink" style="width:72px;height:72px;border-width:4px;margin-bottom:12px;">${renderIcon("sparkle", "#1A1A2E", 36)}</div>
      <h1 class="closing-title">${esc(slide.title)}</h1>
      ${slide.subtitle ? `<p class="closing-body">${esc(slide.subtitle)}</p>` : ""}
      ${slide.body ? `<p class="closing-body">${esc(slide.body)}</p>` : ""}
      ${bulletsHtml}
    </div>`;
}

// ── Extended Template Renderers ──

function renderQuoteInsight(slide) {
  const quote = slide.subtitle || slide.body || slide.bullets[0] || "";
  const attribution = slide.bullets.length > 1 ? slide.bullets[1] : "";
  const context = slide.bullets.slice(attribution ? 2 : 1);
  return `<div class="slide-content center">
      <div class="callout-box" style="text-align:center;max-width:800px;">
        <p class="callout-text" style="font-size:clamp(20px,2.5vw,32px);">"${esc(quote)}"</p>
        ${attribution ? `<p class="callout-author">— ${esc(attribution)}</p>` : ""}
      </div>
      ${context.length ? `<div class="tag-row" style="justify-content:center;margin-top:16px;">${context.slice(0, 3).map((b, i) => `<span class="tag ${ACCENTS[i % ACCENTS.length]}">${esc(b)}</span>`).join("")}</div>` : ""}
    </div>`;
}

function renderIconGrid(slide) {
  const items = slide.bullets.length ? slide.bullets : [slide.subtitle || "Item"];
  const iconHtml = renderIcon(slide.icon, "#1A1A2E", 32);
  return `<div class="slide-content">
      <div style="display:flex;align-items:center;gap:12px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
      ${slide.subtitle ? `<p class="slide-subtitle">${esc(slide.subtitle)}</p>` : ""}
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;position:relative;z-index:2;">
        ${items.slice(0, 8).map((item, i) => `<div class="card" style="text-align:center;padding:18px 12px;">
            <div class="icon-circle ${ACCENTS[i % ACCENTS.length]}" style="width:48px;height:48px;margin:0 auto 10px;">${renderIcon(pickIcon("icon-grid", i), "#1A1A2E", 24)}</div>
            <p style="font-size:14px;font-weight:800;line-height:1.4;">${esc(item)}</p>
          </div>`).join("")}
      </div>
    </div>`;
}

function renderFaqPanel(slide) {
  const items = slide.bullets.length ? slide.bullets : [slide.subtitle || "Q&A"];
  const half = Math.ceil(items.length / 2);
  const questions = items.slice(0, half);
  const answers = items.slice(half);
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  return `<div class="slide-content">
      <div style="display:flex;align-items:center;gap:12px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
      <div style="display:flex;flex-direction:column;gap:10px;position:relative;z-index:2;">
        ${questions.map((q, i) => `<div class="card" style="padding:0;">
            <div class="card-header ${ACCENTS[i % ACCENTS.length]}" style="gap:8px;">
              <i class="ph-fill ph-question" style="font-size:18px;color:#1A1A2E;"></i>
              <span class="card-label" style="font-size:14px;">${esc(q)}</span>
            </div>
            <div class="card-body"><p style="font-size:14px;line-height:1.5;color:var(--ink-2);">${esc(answers[i] || "...")}</p></div>
          </div>`).join("")}
      </div>
    </div>`;
}

function renderAgendaOverview(slide) {
  const items = slide.bullets.length ? slide.bullets : [slide.subtitle || "Item"];
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  return `<div class="slide-content">
      <div style="display:flex;align-items:center;gap:12px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
      ${slide.subtitle ? `<p class="slide-subtitle">${esc(slide.subtitle)}</p>` : ""}
      <div style="display:flex;flex-direction:column;gap:8px;position:relative;z-index:2;">
        ${items.slice(0, 6).map((item, i) => `<div style="display:flex;align-items:center;gap:14px;padding:12px 16px;border:var(--border);border-radius:8px;background:#fff;box-shadow:var(--shadow);">
            <span class="icon-square ${ACCENTS[i % ACCENTS.length]}" style="width:36px;height:36px;font-family:var(--font-title);font-size:16px;font-weight:900;display:flex;align-items:center;justify-content:center;">${String(i + 1).padStart(2, "0")}</span>
            <span style="font-size:15px;font-weight:700;">${esc(item)}</span>
          </div>`).join("")}
      </div>
    </div>`;
}

function renderChecklistBoard(slide) {
  const items = slide.bullets.length ? slide.bullets : [slide.subtitle || "Item"];
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  return `<div class="slide-content">
      <div style="display:flex;align-items:center;gap:12px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
      ${slide.subtitle ? `<p class="slide-subtitle">${esc(slide.subtitle)}</p>` : ""}
      <div style="display:flex;flex-direction:column;gap:8px;position:relative;z-index:2;">
        ${items.slice(0, 6).map((item, i) => `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:var(--border);border-radius:8px;background:#fff;box-shadow:var(--shadow);">
            <span class="icon-square ${ACCENTS[i % ACCENTS.length]}" style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;">${renderIcon(i < 2 ? "check" : "minus", "#1A1A2E", 16)}</span>
            <span style="font-size:15px;font-weight:700;">${esc(item)}</span>
          </div>`).join("")}
      </div>
    </div>`;
}

function renderHorizontalTimeline(slide) {
  const items = slide.bullets.length ? slide.bullets : [slide.subtitle || "Phase"];
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  return `<div class="slide-content">
      <div style="display:flex;align-items:center;gap:12px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
      <div style="position:relative;z-index:2;margin-top:20px;">
        <div style="display:flex;justify-content:space-between;position:relative;margin-bottom:12px;">
          <div style="position:absolute;top:50%;left:0;right:0;height:4px;background:var(--ink);transform:translateY(-50%);z-index:0;"></div>
          ${items.slice(0, 5).map((_, i) => `<div style="width:36px;height:36px;border-radius:50%;border:var(--border);background:var(--${ACCENTS[i % ACCENTS.length]});display:flex;align-items:center;justify-content:center;z-index:1;font-family:var(--font-title);font-size:14px;font-weight:900;">${i + 1}</div>`).join("")}
        </div>
        <div style="display:flex;justify-content:space-between;gap:8px;">
          ${items.slice(0, 5).map((item, i) => `<div style="flex:1;text-align:center;"><p style="font-size:13px;font-weight:700;line-height:1.4;">${esc(item)}</p></div>`).join("")}
        </div>
      </div>
    </div>`;
}

function renderStatHighlight(slide) {
  const number = slide.bullets[0] || slide.subtitle || "100%";
  const label = slide.bullets[1] || slide.body || "";
  const details = slide.bullets.slice(2);
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  return `<div class="slide-content center">
      ${iconHtml}
      <div style="font-family:var(--font-display);font-size:clamp(64px,10vw,120px);font-weight:900;line-height:1;color:var(--ink);text-align:center;">${esc(extractNumber(number))}</div>
      <p style="font-size:clamp(18px,2vw,28px);font-weight:700;color:var(--ink-2);text-align:center;">${esc(removeNumber(number) || label)}</p>
      ${details.length ? `<div class="tag-row" style="justify-content:center;margin-top:16px;">${details.slice(0, 3).map((d, i) => `<span class="tag ${ACCENTS[i % ACCENTS.length]}">${esc(d)}</span>`).join("")}</div>` : ""}
    </div>`;
}

function renderHierarchyTree(slide) {
  const items = slide.bullets.length ? slide.bullets : [slide.subtitle || "Node"];
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  const root = items[0] || slide.title;
  const children = items.slice(1);
  return `<div class="slide-content">
      <div style="display:flex;align-items:center;gap:12px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
      <div style="text-align:center;position:relative;z-index:2;margin-top:10px;">
        <div style="display:inline-block;padding:14px 28px;border:var(--border);border-radius:var(--radius);background:var(--pink);box-shadow:var(--shadow);font-family:var(--font-title);font-size:18px;font-weight:900;">${esc(root)}</div>
        <div style="width:4px;height:24px;background:var(--ink);margin:0 auto;"></div>
        <div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
          ${children.slice(0, 4).map((child, i) => `<div style="display:flex;flex-direction:column;align-items:center;">
              <div style="width:4px;height:16px;background:var(--ink);"></div>
              <div style="padding:10px 20px;border:var(--border);border-radius:8px;background:var(--${ACCENTS[i % ACCENTS.length]});box-shadow:var(--shadow);font-size:14px;font-weight:800;">${esc(child)}</div>
            </div>`).join("")}
        </div>
      </div>
    </div>`;
}

function renderDataTable(slide) {
  const items = slide.bullets.length ? slide.bullets : [slide.subtitle || "Data"];
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  return `<div class="slide-content">
      <div style="display:flex;align-items:center;gap:12px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
      <div style="position:relative;z-index:2;border:var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr style="background:var(--yellow);">
            ${["Item", "Detail"].map(h => `<th style="padding:10px 14px;border-bottom:var(--border);text-align:left;font-weight:900;font-family:var(--font-title);letter-spacing:0.04em;">${h}</th>`).join("")}
          </tr></thead>
          <tbody>
            ${items.slice(0, 6).map((item, i) => `<tr style="background:${i % 2 === 0 ? '#fff' : 'var(--paper)'};">
              <td style="padding:10px 14px;border-bottom:2px solid rgba(26,26,46,0.08);font-weight:700;">${esc(item.split(/[，,：:]/)[0] || item)}</td>
              <td style="padding:10px 14px;border-bottom:2px solid rgba(26,26,46,0.08);color:var(--ink-2);">${esc(item.split(/[，,：:]/).slice(1).join(",") || "—")}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderFeatureBenefit(slide) {
  const items = slide.bullets.length ? slide.bullets : [slide.subtitle || "Feature"];
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  const half = Math.ceil(items.length / 2);
  const features = items.slice(0, half);
  const benefits = items.slice(half);
  return `<div class="slide-content">
      <div style="display:flex;align-items:center;gap:12px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
      <div style="display:flex;flex-direction:column;gap:10px;position:relative;z-index:2;">
        ${features.map((f, i) => `<div style="display:flex;gap:12px;align-items:stretch;">
            <div class="card" style="flex:1;display:flex;align-items:center;gap:10px;padding:14px;">
              <span class="icon-circle ${ACCENTS[i % ACCENTS.length]}" style="width:36px;height:36px;">${renderIcon(pickIcon("feature-benefit", i), "#1A1A2E", 18)}</span>
              <span style="font-size:14px;font-weight:800;">${esc(f)}</span>
            </div>
            <div style="display:flex;align-items:center;padding:0 6px;"><i class="ph-fill ph-arrow-right" style="font-size:20px;color:var(--ink);"></i></div>
            <div class="card" style="flex:1;display:flex;align-items:center;gap:10px;padding:14px;background:var(--paper-2);">
              <span class="icon-circle mint" style="width:36px;height:36px;">${renderIcon("check", "#1A1A2E", 18)}</span>
              <span style="font-size:14px;font-weight:800;">${esc(benefits[i] || "—")}</span>
            </div>
          </div>`).join("")}
      </div>
    </div>`;
}

function renderBeforeAfter(slide) {
  const before = slide.bullets[0] || slide.subtitle || "Before";
  const after = slide.bullets[1] || slide.body || "After";
  const results = slide.bullets.slice(2);
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  return `<div class="slide-content">
      <div style="display:flex;align-items:center;gap:12px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center;position:relative;z-index:2;">
        <div class="card" style="padding:20px;text-align:center;">
          <div class="card-header coral" style="justify-content:center;margin:-20px -20px 14px;border-radius:var(--radius) var(--radius) 0 0;"><span class="card-label">BEFORE</span></div>
          <p style="font-size:14px;line-height:1.5;">${esc(before)}</p>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <i class="ph-fill ph-arrow-right" style="font-size:32px;color:var(--ink);"></i>
          <span style="font-size:11px;font-weight:900;color:var(--ink-2);text-transform:uppercase;">Transform</span>
        </div>
        <div class="card" style="padding:20px;text-align:center;">
          <div class="card-header mint" style="justify-content:center;margin:-20px -20px 14px;border-radius:var(--radius) var(--radius) 0 0;"><span class="card-label">AFTER</span></div>
          <p style="font-size:14px;line-height:1.5;">${esc(after)}</p>
        </div>
      </div>
      ${results.length ? `<div class="tag-row" style="justify-content:center;margin-top:12px;">${results.slice(0, 3).map((r, i) => `<span class="tag ${ACCENTS[i % ACCENTS.length]}">${esc(r)}</span>`).join("")}</div>` : ""}
    </div>`;
}

function renderLayerStack(slide) {
  const items = slide.bullets.length ? slide.bullets : [slide.subtitle || "Layer"];
  const iconHtml = renderIcon(slide.icon, ACCENT_HEX[slide.accent], 32);
  return `<div class="slide-content">
      <div style="display:flex;align-items:center;gap:12px;">${iconHtml}<h1 class="slide-title" style="margin:0;">${esc(slide.title)}</h1></div>
      <div style="display:flex;flex-direction:column;gap:0;position:relative;z-index:2;margin-top:10px;">
        ${items.slice(0, 5).map((item, i) => {
          const colors = ["var(--pink)", "var(--blue)", "var(--yellow)", "var(--mint)", "var(--coral)"];
          const offset = (items.length - 1 - i) * 20;
          return `<div style="padding:14px 20px;border:var(--border);border-radius:${i === 0 ? 'var(--radius) var(--radius) 0 0' : i === items.length - 1 ? '0 0 var(--radius) var(--radius)' : '0'};background:${colors[i % colors.length]};margin-left:${offset}px;box-shadow:var(--shadow);display:flex;align-items:center;gap:12px;">
              ${renderIcon(pickIcon("layer-stack", i), "#1A1A2E", 20)}
              <span style="font-size:15px;font-weight:800;">${esc(item)}</span>
            </div>`;
        }).join("")}
      </div>
    </div>`;
}

// ── Utility ──
function cleanInlineMarkdown(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanupHtmlText(text) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'").replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ").trim();
}

function esc(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function basenameWithoutExt(input) {
  return path.basename(input, path.extname(input)) || "Presentation";
}

function isHttpUrl(input) {
  return /^https?:\/\//i.test(input);
}

// ── Full HTML render ──
function renderDeck({ title, slides, css, sourceLabel }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} - Memphis PPT</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;700;900&family=Noto+Sans+SC:wght@400;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${PHOSPHOR_CDN}">
  <style>
${css}
  </style>
</head>
<body>
  <div class="progress" id="progress"></div>
  <main class="deck-shell">
    <section class="slide-deck" aria-label="Memphis HTML PPT presentation">
${slides.map((slide, index) => renderSlide(slide, index + 1, slides.length)).join("\n")}
    </section>
  </main>
  <div class="nav" aria-label="Slide navigation">
    <button type="button" id="prev" aria-label="Previous slide">&#8592;</button>
    <div class="counter"><span id="current">1</span> / <span id="total">${slides.length}</span></div>
    <button type="button" id="next" aria-label="Next slide">&#8594;</button>
  </div>
  <div class="keyboard-hint">Arrow keys or click to navigate</div>
  <script>
    const slides = Array.from(document.querySelectorAll(".slide"));
    const progress = document.getElementById("progress");
    const currentLabel = document.getElementById("current");
    let current = 0;
    function showSlide(nextIndex) {
      current = Math.max(0, Math.min(slides.length - 1, nextIndex));
      slides.forEach((s, i) => { s.classList.toggle("active", i === current); s.style.display = i === current ? "flex" : "none"; });
      currentLabel.textContent = String(current + 1);
      progress.style.width = ((current + 1) / slides.length * 100) + "%";
    }
    document.getElementById("prev").addEventListener("click", () => showSlide(current - 1));
    document.getElementById("next").addEventListener("click", () => showSlide(current + 1));
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); showSlide(current + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); showSlide(current - 1); }
    });
    document.addEventListener("click", (e) => { if (!e.target.closest(".nav")) showSlide(current + 1); });
    showSlide(0);
  </script>
  <!-- source: ${esc(sourceLabel)} -->
</body>
</html>`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
