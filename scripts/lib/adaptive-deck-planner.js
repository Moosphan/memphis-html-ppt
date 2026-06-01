import { checkContentFit, getTemplate } from "./template-registry.js";

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_DECK_MODEL || process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini";

const ALLOWED_TEMPLATES = [
  "hero-cover",
  "narrative-split",
  "bullet-grid",
  "process-lane",
  "metric-board",
  "quote-insight",
  "compare-dual",
  "warning-callout",
  "icon-grid",
  "faq-panel",
  "agenda-overview",
  "checklist-board",
  "horizontal-timeline",
  "stat-highlight",
  "hierarchy-tree",
  "data-table",
  "feature-benefit",
  "before-after",
  "layer-stack",
  "command-board",
  "closing-card"
];

const TEMPLATE_PROMPTS = {
  "hero-cover": "opening thesis, cover, or strong deck framing",
  "narrative-split": "one main argument with support, metric, insight, or next step",
  "bullet-grid": "4-8 concise points that work as balanced cards",
  "process-lane": "ordered process, workflow, or 3-5 sequential steps",
  "metric-board": "one strong metric plus supporting facts or sub-metrics",
  "quote-insight": "one memorable quote, principle, or key statement with short context",
  "compare-dual": "clear before/after or option A/option B comparison",
  "warning-callout": "risk, caveat, or cautionary message that needs emphasis",
  "icon-grid": "capabilities, categories, or features in a repeated grid",
  "faq-panel": "question/answer style framing",
  "agenda-overview": "agenda, roadmap, or ordered list of topics",
  "checklist-board": "checklist or criteria list",
  "horizontal-timeline": "timeline with 3-5 phases on one line",
  "stat-highlight": "one headline number or a single dominant stat",
  "hierarchy-tree": "hierarchy, taxonomy, or parent-child relationships",
  "data-table": "tabular data or structured row/column listing",
  "feature-benefit": "paired feature and benefit mapping",
  "before-after": "transformation from old state to new state",
  "layer-stack": "layered architecture, stack, or multi-level concept",
  "command-board": "commands, code snippets, or terminal-style operational steps",
  "closing-card": "ending summary, recap, or call to action"
};

const TEMPLATE_FALLBACKS = {
  "warning-callout": "narrative-split",
  "checklist-board": "bullet-grid",
  "agenda-overview": "process-lane",
  "icon-grid": "bullet-grid",
  "stat-highlight": "metric-board",
  "before-after": "compare-dual",
  "feature-benefit": "compare-dual",
  "hierarchy-tree": "layer-stack"
};

export async function buildAdaptiveDeckPlan({ title, sourceUrl, rawMarkdown, sourcePackage = null, maxTemplateShare = null }) {
  const cleanedMarkdown = sourcePackage?.cleanedMarkdown || rawMarkdown || "";
  const outline = sourcePackage?.sections?.length
    ? parseMarkdownOutline(cleanedMarkdown, title)
    : parseMarkdownOutline(cleanedMarkdown, title);
  const digest = buildSourceDigest({ title, sourceUrl, outline, rawMarkdown: cleanedMarkdown, sourcePackage });

  if (process.env.OPENAI_API_KEY) {
    const aiPlan = await tryPlanWithAI({ title, sourceUrl, rawMarkdown: cleanedMarkdown, digest, sourcePackage });
    if (aiPlan) {
      return normalizeDeckPlan(aiPlan, { title, sourceUrl, outline, sourcePackage, maxTemplateShare });
    }
  }

  return buildFallbackAdaptiveDeckPlan({ title, sourceUrl, rawMarkdown: cleanedMarkdown, outline, sourcePackage, maxTemplateShare });
}

export function buildFallbackAdaptiveDeckPlan({ title, sourceUrl, rawMarkdown, outline = parseMarkdownOutline(rawMarkdown, title), sourcePackage = null, maxTemplateShare = null }) {
  if (sourcePackage?.sections?.length) {
    return buildFallbackAdaptiveDeckPlanFromSourcePackage({ title, sourceUrl, sourcePackage, outline, maxTemplateShare });
  }

  const sections = outline.sections.length ? outline.sections : [{ title, paragraphs: textToParagraphs(rawMarkdown), bullets: [] }];
  const slides = [];
  const first = sections[0] || {};
  const last = sections[sections.length - 1] || first;

  slides.push({
    id: "slide-01",
    intent: "hero",
    templateId: "hero-cover",
    reasoning: "Opening slide establishes the article thesis and gives the deck a clear cover frame.",
    sourceFocus: [title, first.title].filter(Boolean),
    content: {
      headerTitle: "SOURCE STORY",
      headerSubtitle: sourceUrl ? "WEB ARTICLE TO PPT" : "MARKDOWN TO PPT",
      title,
      body: first.paragraphs?.[0] || extractLead(rawMarkdown),
      bullets: collectCompactBullets(sections.slice(0, 2), 4),
      tags: collectTags(sections),
      footerText: "Adaptive chain · AI planner input"
    }
  });

  const middleSections = sections.slice(1, -1);
  const bundled = bundleSections(middleSections, 4);

  bundled.forEach((bundle, index) => {
    const selectedTemplate = chooseTemplateForBundle(bundle);
    slides.push(buildFallbackSlideForBundle(bundle, index + 2, selectedTemplate));
  });

  slides.push({
    id: `slide-${String(slides.length + 1).padStart(2, "0")}`,
    intent: "closing",
    templateId: "closing-card",
    reasoning: "Final slide compresses the article into a short recap and gives the deck a clear ending.",
    sourceFocus: [last.title].filter(Boolean),
    content: {
      headerTitle: "WRAP UP",
      headerSubtitle: "SUMMARY",
      title: shortenTitle(title, 22),
      subtitle: last.paragraphs?.[0] || "Turn the article into a smaller set of memorable takeaways.",
      points: buildClosingPoints(sections),
      footerText: "Adaptive chain · summary close"
    }
  });

  return normalizeDeckPlan({
    deckMeta: {
      title,
      subtitle: "AI-ready adaptive preview",
      theme: "memphis-editorial",
      estimatedSlides: slides.length,
      narrative: buildNarrativeSummary(sections),
      analysisSummary: "Fallback planner used because AI plan was unavailable."
    },
    slides
  }, { title, sourceUrl, outline, maxTemplateShare });
}

function buildFallbackAdaptiveDeckPlanFromSourcePackage({ title, sourceUrl, sourcePackage, outline, maxTemplateShare = null }) {
  const sections = prioritizeSourceSections(sourcePackage.sections || []);
  const slides = [];

  const heroSection = sections[0] || null;
  slides.push(buildHeroSlideFromSourcePackage({ title, sourceUrl, sourcePackage, heroSection, sections }));

  sections.forEach((section, index) => {
    slides.push(buildSourceSectionSlide(section, index + 2, {
      isLast: index === sections.length - 1,
      sectionCount: sections.length
    }));
  });

  return normalizeDeckPlan({
    deckMeta: {
      title: sourcePackage.title || title,
      subtitle: "Adaptive AI-planned deck",
      theme: "memphis-editorial",
      estimatedSlides: slides.length,
      narrative: buildNarrativeSummary(sections),
      analysisSummary: buildSourcePackageSummary(sourcePackage)
    },
    slides
  }, { title, sourceUrl, outline, sourcePackage, maxTemplateShare });
}

async function tryPlanWithAI({ title, sourceUrl, rawMarkdown, digest, sourcePackage }) {
  const templateGuide = buildTemplateGuide();
  const systemPrompt = [
    "You are a senior presentation strategist and slide planner.",
    "You convert cleaned article markdown into a structured deckPlan JSON for an adaptive Memphis HTML PPT renderer.",
    "Your goal is NOT to preserve article order mechanically.",
    "Your goal IS to analyze the content, extract only the strongest material, decide slide boundaries, and choose the best template for each slide.",
    "",
    "Planning principles:",
    "- Prefer 6 to 10 strong slides instead of many thin continuation slides.",
    "- Merge weak sub-sections into richer slides; do not create a slide with only one trivial bullet unless it is a deliberate stat or quote slide.",
    "- Each slide should have one dominant message.",
    "- Extract and rewrite the article into presentation language. Do not copy long paragraphs verbatim.",
    "- Keep factual accuracy. Do not invent claims not supported by the source.",
    "- Include a short reasoning string for every slide explaining why the chosen template fits.",
    "- Decide whether code should be shown raw, summarized, converted into commands, or dropped entirely based on its presentation value.",
    "- Prefer command-board for explicit command lists, data-table for structured config or rows, layer-stack for conceptual architecture, and narrative/bullet slides for implementation detail.",
    "",
    "Allowed templates and when to use them:",
    templateGuide,
    "",
    "Output requirements:",
    "- Return valid JSON only.",
    "- Root keys must be deckMeta and slides.",
    "- Each slide must include: id, intent, templateId, reasoning, sourceFocus, content.",
    "- content must use fields that match the chosen template renderer. Use only useful fields; leave the rest out.",
    "- deckMeta.theme must be 'memphis-editorial'.",
    "- The first slide should usually be hero-cover.",
    "- The last slide should usually be closing-card unless the material clearly needs a different ending.",
    "- Include concise headerTitle/headerSubtitle/footerText where they help the layout."
  ].join("\n");

  const userPrompt = [
    `Source URL: ${sourceUrl || "N/A"}`,
    `Preferred title: ${title}`,
    "",
    "Source package:",
    "```json",
    JSON.stringify(sourcePackage || {}, null, 2),
    "```",
    "",
    "Source digest:",
    "```json",
    JSON.stringify(digest, null, 2),
    "```",
    "",
    "Cleaned source markdown:",
    "```markdown",
    truncateForPrompt(rawMarkdown, 24000),
    "```"
  ].join("\n");

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const text = Array.isArray(content)
      ? content.map((item) => item?.text || "").join("")
      : `${content || ""}`;

    return safeParseJson(text);
  } catch {
    return null;
  }
}

function normalizeDeckPlan(plan, { title, sourceUrl, outline, sourcePackage, maxTemplateShare = null }) {
  const rawSlides = Array.isArray(plan?.slides) ? plan.slides : [];
  const slides = rawSlides
    .map((slide, index) => normalizeSlide(slide, index, outline))
    .filter(Boolean);

  if (sourcePackage) {
    const sourceCandidates = collectSourceTextCandidates(sourcePackage);
    slides.forEach((slide) => {
      slide.content = restoreEllipsizedContent(slide.content || {}, sourceCandidates);
    });
  }

  if (!slides.length) {
    return buildFallbackAdaptiveDeckPlan({
      title,
      sourceUrl,
      rawMarkdown: outline.rawMarkdown || "",
      outline,
      sourcePackage,
      maxTemplateShare
    });
  }

  const resolvedMaxTemplateShare = resolveMaxTemplateShare(maxTemplateShare);

  const deckMeta = {
    title: truncateText(plan?.deckMeta?.title || title || "Presentation", 80),
    subtitle: truncateText(plan?.deckMeta?.subtitle || "Adaptive AI-planned deck", 120),
    theme: "memphis-editorial",
    estimatedSlides: slides.length,
    narrative: truncateText(plan?.deckMeta?.narrative || buildNarrativeSummary(outline.sections), 180),
    analysisSummary: truncateText(plan?.deckMeta?.analysisSummary || `Planned from ${outline.sections.length} sections of source content.`, 220),
    sourceUrl,
    sourcePackageSummary: sourcePackage ? buildSourcePackageSummary(sourcePackage) : undefined,
    templateConstraints: {
      maxShare: resolvedMaxTemplateShare
    }
  };

  slides[0].templateId ||= "hero-cover";
  slides[slides.length - 1].templateId ||= "closing-card";
  rebalanceTemplateFrequency(slides, resolvedMaxTemplateShare);

  slides.forEach((slide, index) => {
    slide.id = `slide-${String(index + 1).padStart(2, "0")}`;
  });

  return { deckMeta, slides };
}

function collectSourceTextCandidates(sourcePackage) {
  const sections = Array.isArray(sourcePackage?.sections) ? sourcePackage.sections : [];
  const values = [];

  sections.forEach((section) => {
    values.push(section.title, section.coreClaim);
    values.push(...(section.paragraphs || []));
    values.push(...(section.bullets || []));
    values.push(...(section.supportingPoints || []));
    values.push(...(section.metrics || []));
    values.push(...(section.commandSamples || []));
  });

  return [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))];
}

function restoreEllipsizedContent(content, sourceCandidates) {
  const restored = { ...content };
  const stringKeys = ["title", "subtitle", "body", "insight", "evidence", "nextStep", "metricLabel", "footerText"];
  const arrayKeys = ["bullets", "beforeBullets", "afterBullets", "tags"];

  stringKeys.forEach((key) => {
    if (typeof restored[key] === "string") {
      restored[key] = restoreEllipsizedText(restored[key], sourceCandidates);
    }
  });

  arrayKeys.forEach((key) => {
    if (Array.isArray(restored[key])) {
      restored[key] = restored[key].map((item) => typeof item === "string"
        ? restoreEllipsizedText(item, sourceCandidates)
        : item
      );
    }
  });

  if (Array.isArray(restored.steps)) {
    restored.steps = restored.steps.map((step) => ({
      ...step,
      title: restoreEllipsizedText(step?.title || "", sourceCandidates),
      description: restoreEllipsizedText(step?.description || "", sourceCandidates),
    }));
  }

  if (Array.isArray(restored.layers)) {
    restored.layers = restored.layers.map((layer) => ({
      ...layer,
      label: restoreEllipsizedText(layer?.label || "", sourceCandidates),
      description: restoreEllipsizedText(layer?.description || "", sourceCandidates),
    }));
  }

  return restored;
}

function restoreEllipsizedText(text, sourceCandidates) {
  const value = String(text || "").trim();
  if (!/[.…]{1,3}$/.test(value) || !sourceCandidates.length) {
    return value;
  }

  const prefix = value.replace(/[.…]{1,3}$/, "").trim();
  const prefixKey = buildEllipsisLookupKey(prefix);
  if (prefixKey.length < 10) {
    return value;
  }

  const match = sourceCandidates.find((candidate) => {
    const key = buildEllipsisLookupKey(candidate);
    return key.startsWith(prefixKey) && key.length > prefixKey.length;
  });

  return match || value;
}

function buildEllipsisLookupKey(value) {
  return String(value || "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, "")
    .replace(/[，,。！？!?；;：:（）()【】\[\]'"“”‘’·]/g, "")
    .toLowerCase();
}

function resolveMaxTemplateShare(explicitValue) {
  const raw = explicitValue ?? process.env.ADAPTIVE_TEMPLATE_MAX_SHARE ?? process.env.MAX_TEMPLATE_SHARE ?? 0.25;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0.25;
  return Math.max(0.1, Math.min(1, parsed));
}

function rebalanceTemplateFrequency(slides, maxTemplateShare) {
  const cap = Math.max(1, Math.floor(slides.length * maxTemplateShare));
  if (!slides.length || cap < 1) return;

  const counts = countTemplates(slides);
  const protectedTemplates = new Set(["hero-cover", "closing-card"]);
  let guard = slides.length * 8;

  while (guard > 0) {
    guard -= 1;
    const entry = Object.entries(counts).find(([templateId, count]) => !protectedTemplates.has(templateId) && count > cap);
    if (!entry) break;

    const [templateId] = entry;
    const indices = slides
      .map((slide, index) => ({ slide, index }))
      .filter(({ slide }) => slide.templateId === templateId)
      .map(({ index }) => index)
      .reverse();

    let changed = false;
    for (const index of indices) {
      const next = remapSlideToAlternativeTemplate(slides[index], counts, cap);
      if (!next) continue;

      counts[slides[index].templateId] -= 1;
      counts[next.templateId] = (counts[next.templateId] || 0) + 1;
      slides[index] = next;
      changed = true;
      break;
    }

    if (!changed) break;
  }
}

function countTemplates(slides) {
  return slides.reduce((acc, slide) => {
    const templateId = String(slide?.templateId || "");
    if (!templateId) return acc;
    acc[templateId] = (acc[templateId] || 0) + 1;
    return acc;
  }, {});
}

function remapSlideToAlternativeTemplate(slide, counts, cap) {
  const candidates = getTemplateCapAlternatives(slide.templateId);
  for (const candidate of candidates) {
    if (candidate === slide.templateId) continue;
    if ((counts[candidate] || 0) >= cap) continue;

    const transformedContent = transformContentForTemplate(slide.content || {}, slide.templateId, candidate);
    const normalizedContent = normalizeContentForTemplate(candidate, transformedContent);
    const fit = checkContentFit(candidate, normalizedContent);
    const hardViolation = fit.violations?.some((item) => item.issue === "missing-required" || item.issue === "too-few-items");
    if (hardViolation) continue;

    return {
      ...slide,
      intent: guessIntentFromTemplate(candidate),
      templateId: candidate,
      reasoning: truncateText(`${slide.reasoning} Rebalanced to ${candidate} to keep template variety without changing the source meaning.`, 220),
      content: normalizedContent
    };
  }

  return null;
}

function getTemplateCapAlternatives(templateId) {
  const map = {
    "command-board": ["narrative-split", "bullet-grid", "layer-stack"],
    "metric-board": ["narrative-split", "bullet-grid"],
    "bullet-grid": ["narrative-split", "layer-stack"],
    "narrative-split": ["bullet-grid", "layer-stack"],
    "process-lane": ["bullet-grid", "narrative-split"],
    "layer-stack": ["narrative-split", "bullet-grid"],
    "compare-dual": ["narrative-split", "bullet-grid"],
    "faq-panel": ["narrative-split", "bullet-grid"]
  };
  return map[templateId] || ["narrative-split", "bullet-grid"];
}

function transformContentForTemplate(content, fromTemplateId, toTemplateId) {
  const bullets = extractBulletCandidatesFromContent(content, fromTemplateId);
  const base = {
    headerTitle: content.headerTitle,
    headerSubtitle: content.headerSubtitle,
    footerText: content.footerText,
    title: content.title || content.headerTitle || "Key Insight",
    subtitle: content.subtitle || "",
    body: content.body || content.metricLabel || content.insight || content.subtitle || bullets[0] || "",
    insight: content.insight || bullets[1] || "",
    nextStep: content.nextStep || bullets[3] || ""
  };

  if (toTemplateId === "bullet-grid") {
    return {
      ...base,
      bullets: bullets.slice(0, 6)
    };
  }

  if (toTemplateId === "layer-stack") {
    return {
      ...base,
      layers: bullets.slice(0, 5).map((item, index) => ({
        label: deriveProcessStepTitle(item, index, { sectionTitles: [content.title || ""] }),
        description: truncateText(item, 120)
      }))
    };
  }

  return {
    ...base,
    bullets: bullets.slice(0, 4)
  };
}

function extractBulletCandidatesFromContent(content, templateId) {
  const values = [];
  const push = (value) => {
    const text = truncateText(cleanInlineText(String(value || "")), 120);
    if (!text) return;
    values.push(text);
  };

  (content.bullets || []).forEach(push);
  (content.items || []).forEach((item) => push(typeof item === "string" ? item : item?.description || item?.label || item?.title));
  (content.commands || []).forEach((item) => push([item.command, item.description].filter(Boolean).join(" · ")));
  (content.steps || []).forEach((item) => push(item.description || item.title));
  (content.layers || []).forEach((item) => push([item.label, item.description].filter(Boolean).join(" · ")));
  (content.points || []).forEach((item) => push(item.description || item.label || item.title));
  (content.qaPairs || []).forEach((item) => push([item.question, item.answer].filter(Boolean).join(" · ")));
  (content.subMetrics || []).forEach((item) => push([item.value, item.label].filter(Boolean).join(" ")));
  (content.beforeBullets || []).forEach((item) => push(`Before · ${item}`));
  (content.afterBullets || []).forEach((item) => push(`After · ${item}`));

  if (!values.length && content.body) push(content.body);
  if (!values.length && content.metricLabel) push(content.metricLabel);
  if (!values.length && templateId === "command-board" && content.title) push(content.title);

  return [...new Set(values)].slice(0, 8);
}

function normalizeSlide(slide, index, outline) {
  if (!slide || typeof slide !== "object") {
    return null;
  }

  const templateId = normalizeTemplateId(slide.templateId, slide.intent);
  const content = normalizeContentForTemplate(templateId, slide.content || {});
  const sourceFocus = Array.isArray(slide.sourceFocus)
    ? slide.sourceFocus.map((item) => truncateText(String(item), 80)).filter(Boolean).slice(0, 4)
    : [];

  const normalized = {
    id: `slide-${String(index + 1).padStart(2, "0")}`,
    intent: truncateText(slide.intent || guessIntentFromTemplate(templateId), 32),
    templateId,
    reasoning: truncateText(slide.reasoning || TEMPLATE_PROMPTS[templateId] || "Template chosen by planner.", 220),
    sourceFocus,
    content
  };

  const fit = checkContentFit(templateId, content);
  if (!fit.fit && fit.violations?.length) {
    normalized.fitWarnings = fit.violations.slice(0, 4);
  }

  if (!hasMeaningfulContent(normalized.content)) {
    const backup = buildBackupContentFromOutline(templateId, outline.sections[index] || outline.sections[0] || {});
    normalized.content = normalizeContentForTemplate(templateId, backup);
  }

  return normalized;
}

function normalizeTemplateId(templateId, intent) {
  const intentMap = {
    hero: "hero-cover",
    cover: "hero-cover",
    narrative: "narrative-split",
    grid: "bullet-grid",
    process: "process-lane",
    progression: "process-lane",
    metric: "metric-board",
    stat: "stat-highlight",
    quote: "quote-insight",
    compare: "compare-dual",
    comparison: "compare-dual",
    warning: "warning-callout",
    checklist: "checklist-board",
    timeline: "horizontal-timeline",
    command: "command-board",
    table: "data-table",
    faq: "faq-panel",
    layers: "layer-stack",
    closing: "closing-card"
  };
  const requested = ALLOWED_TEMPLATES.includes(templateId)
    ? templateId
    : intentMap[String(intent || "").toLowerCase()] || "narrative-split";

  return coerceRenderableTemplate(requested);
}

function coerceRenderableTemplate(templateId) {
  return TEMPLATE_FALLBACKS[templateId] || templateId;
}

function normalizeContentForTemplate(templateId, content) {
  const spec = getTemplate(templateId);
  if (!spec) {
    return normalizeGenericContent(content);
  }

  const out = {};
  const keys = new Set([
    ...Object.keys(content || {}),
    ...Object.keys(spec.slots || {})
  ]);

  for (const key of keys) {
    const value = content?.[key];
    if (value === undefined || value === null || value === "") continue;
    const slotSpec = spec.slots?.[key] || null;
    out[key] = clipContentValue(value, slotSpec, key);
  }

  // Template-specific safety rails
  if (templateId === "hero-cover") {
    out.title = truncateTextLoose(out.title || out.headerTitle || "Untitled", 56);
    out.body = truncateText(out.body || out.subtitle || "", 220);
    out.bullets = textArray(out.bullets, 4, 72);
    out.tags = textArray(out.tags, 3, 16);
  }

  if (templateId === "narrative-split") {
    out.title = truncateTextLoose(out.title || "Key Insight", 60);
    out.body = truncateText(out.body || out.subtitle || "", 220);
    out.bullets = textArray(out.bullets, 5, 240);
    out.metric = truncateText(out.metric || "", 14);
    out.metricLabel = truncateText(out.metricLabel || "", 72);
    out.insight = truncateText(out.insight || "", 140);
    out.nextStep = truncateText(out.nextStep || "", 140);
  }

  if (templateId === "bullet-grid") {
    out.subtitle = truncateText(out.subtitle || out.body || "", 50);
    out.bullets = textArray(out.bullets || out.items, 8, 84);
    delete out.items;
  }

  if (templateId === "process-lane") {
    out.steps = normalizeObjectArray(out.steps, 5, { title: 28, description: 160 });
    if (!out.steps?.length) {
      const fallbackSteps = textArray(out.bullets, 5, 90).map((item, index) => ({
        title: `Step ${index + 1}`,
        description: item
      }));
      out.steps = fallbackSteps;
    }
    out.bullets = undefined;
  }

  if (templateId === "metric-board") {
    const metrics = extractMetricCandidatesFromText([out.metric, out.metricLabel, out.body, ...(out.bullets || [])].join(" "));
    out.metric = truncateText(out.metric || metrics[0] || "", 14);
    out.metricLabel = truncateText(out.metricLabel || out.body || "", 90);
    out.bullets = textArray(out.bullets, 3, 96);
    out.subMetrics = normalizeObjectArray(out.subMetrics, 4, { value: 10, label: 24 })
      .filter((item) => isMeaningfulMetricToken(item?.value || ""));
  }

  if (templateId === "quote-insight") {
    out.quote = truncateText(out.quote || out.body || out.subtitle || "", 180);
    out.attribution = truncateText(out.attribution || "", 80);
    out.tags = textArray(out.tags, 3, 18);
    out.contextCards = normalizeObjectArray(out.contextCards, 3, { title: 24, description: 140 });
  }

  if (templateId === "compare-dual") {
    out.beforeLabel = truncateText(out.beforeLabel || "BEFORE", 20);
    out.afterLabel = truncateText(out.afterLabel || "AFTER", 20);
    out.beforeBullets = textArray(out.beforeBullets, 5, 84);
    out.afterBullets = textArray(out.afterBullets, 5, 84);
    out.takeaway = truncateText(out.takeaway || "", 120);
  }

  if (templateId === "warning-callout") {
    out.warningTitle = truncateText(out.warningTitle || out.title || "Key Warning", 60);
    out.body = truncateText(out.body || out.subtitle || "", 180);
    out.bullets = textArray(out.bullets, 3, 72);
    out.riskCards = normalizeObjectArray(out.riskCards, 2, { title: 24, description: 120 });
  }

  if (templateId === "layer-stack") {
    out.layers = normalizeObjectArray(out.layers, 5, { label: 18, description: 120 });
    if (!out.layers?.length) {
      out.layers = textArray(out.bullets || out.items, 5, 84).map((item, index) => ({
        label: `LAYER ${index + 1}`,
        description: item
      }));
    }
    delete out.bullets;
    delete out.items;
  }

  if (templateId === "horizontal-timeline") {
    out.phases = normalizeObjectArray(out.phases || out.items, 6, { title: 20, description: 100 });
    if (!out.phases?.length) {
      out.phases = textArray(out.bullets, 6, 72).map((item, index) => ({
        title: `PHASE ${index + 1}`,
        description: item
      }));
    }
    delete out.bullets;
    delete out.items;
  }

  if (templateId === "faq-panel") {
    out.qaPairs = normalizeObjectArray(out.qaPairs, 4, { question: 60, answer: 120 });
  }

  if (templateId === "command-board") {
    out.commands = normalizeObjectArray(out.commands, 6, { command: 100, description: 120, result: 60 });
  }

  if (templateId === "data-table") {
    out.headers = textArray(out.headers, 5, 20);
    out.rows = normalizeTableRows(out.rows, 8, 5, 24);
  }

  if (templateId === "checklist-board") {
    out.items = textArray(out.items || out.bullets, 10, 50);
    out.notes = textArray(out.notes, 2, 40);
    out.milestones = normalizeObjectArray(out.milestones, 3, { title: 16, description: 40 });
    out.progress = truncateText(out.progress || "", 20);
  }

  if (templateId === "closing-card") {
    out.title = truncateTextLoose(out.title || "Thank You", 48);
    out.subtitle = truncateText(out.subtitle || out.body || "", 90);
    out.points = normalizeObjectArray(out.points, 4, { title: 8, description: 28 });
  }

  const bounded = applyTemplateSlotBudget(spec, out);

  return Object.fromEntries(Object.entries(bounded).filter(([, value]) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return Boolean(value.trim());
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }));
}

function applyTemplateSlotBudget(spec, content) {
  const out = { ...content };
  for (const [slotName, slotSpec] of Object.entries(spec.slots || {})) {
    if (!(slotName in out)) continue;
    out[slotName] = clipContentValue(out[slotName], slotSpec, slotName);
  }
  return out;
}

function normalizeGenericContent(content) {
  const out = {};
  for (const [key, value] of Object.entries(content || {})) {
    out[key] = clipContentValue(value, null, key);
  }
  return out;
}

function clipContentValue(value, slotSpec, key) {
  if (typeof value === "string") {
    if (shouldPreserveFullUrl(key, value)) {
      return String(value).trim();
    }
    const limit = slotSpec?.maxChars || inferStringLimit(key);
    return truncateText(value, limit);
  }

  if (Array.isArray(value)) {
    const limit = slotSpec?.maxItems || inferArrayLimit(key);
    if (value.some((item) => Array.isArray(item))) {
      return value
        .slice(0, limit)
        .map((row) => Array.isArray(row)
          ? row.slice(0, slotSpec?.maxCols || 5).map((cell) => truncateText(String(cell || ""), slotSpec?.maxCharsPerCell || 24))
          : row);
    }
    if (value.every((item) => typeof item === "string")) {
      return textArray(value, limit, slotSpec?.maxCharsPerItem || inferStringLimit(key));
    }
    if (value.every((item) => item && typeof item === "object")) {
      return normalizeObjectArray(value, limit, inferObjectShapeLimits(key, slotSpec));
    }
    return value.slice(0, limit);
  }

  if (value && typeof value === "object") {
    const shape = inferObjectShapeLimits(key, slotSpec);
    const out = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      if (typeof childValue === "string") {
        if (shouldPreserveFullUrl(childKey, childValue)) {
          out[childKey] = String(childValue).trim();
          continue;
        }
        out[childKey] = truncateText(childValue, shape[childKey] || inferStringLimit(childKey));
      } else {
        out[childKey] = childValue;
      }
    }
    return out;
  }

  return value;
}

function normalizeObjectArray(items, maxItems, fieldLimits) {
  return (items || [])
    .slice(0, maxItems)
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const out = {};
      for (const [key, value] of Object.entries(item)) {
        if (typeof value === "string") {
          out[key] = truncateText(value, fieldLimits[key] || inferStringLimit(key));
        } else {
          out[key] = value;
        }
      }
      return out;
    })
    .filter(Boolean);
}

function normalizeTableRows(rows, maxRows, maxCols, maxCharsPerCell) {
  return (rows || [])
    .slice(0, maxRows)
    .map((row) => {
      if (!Array.isArray(row)) {
        return null;
      }
      return row
        .slice(0, maxCols)
        .map((cell) => truncateText(String(cell || ""), maxCharsPerCell))
        .filter(Boolean);
    })
    .filter((row) => Array.isArray(row) && row.length > 0);
}

function inferStringLimit(key) {
  if (/^(src|url|href|resolvedSrc)$/i.test(key)) return 2048;
  if (/title/i.test(key)) return 32;
  if (/subtitle|label|header/i.test(key)) return 64;
  if (/body|summary|description|insight|evidence|next/i.test(key)) return 160;
  if (/quote/i.test(key)) return 180;
  if (/metric|value/i.test(key)) return 16;
  return 96;
}

function shouldPreserveFullUrl(key, value) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/^(src|url|href|resolvedSrc)$/i.test(key || "")) return true;
  return /^(https?:\/\/|file:\/\/|data:image\/|\/)/i.test(text);
}

function inferArrayLimit(key) {
  if (/bullets|items/i.test(key)) return 6;
  if (/points/i.test(key)) return 4;
  if (/steps/i.test(key)) return 5;
  if (/tags/i.test(key)) return 4;
  return 5;
}

function inferObjectShapeLimits(key, slotSpec) {
  if (/steps/i.test(key)) {
    return { title: 28, description: 150 };
  }
  if (/points/i.test(key)) {
    return { title: 8, description: 28 };
  }
  if (/subMetrics/i.test(key)) {
    return { value: 10, label: 24 };
  }
  if (/contextCards/i.test(key)) {
    return { title: 24, description: 140 };
  }
  if (/items/i.test(key)) {
    return { title: 28, description: 72, label: 24 };
  }
  return {
    title: slotSpec?.maxCharsPerItem || 32,
    description: 96,
    label: 28,
    value: 16
  };
}

function buildTemplateGuide() {
  return ALLOWED_TEMPLATES
    .map((id) => {
      const spec = getTemplate(id);
      const required = Object.entries(spec?.slots || {})
        .filter(([, slot]) => slot.required)
        .map(([slotName]) => slotName)
        .slice(0, 4)
        .join(", ");
      return `- ${id}: ${TEMPLATE_PROMPTS[id]}${required ? `; usually needs ${required}` : ""}`;
    })
    .join("\n");
}

function buildSourceDigest({ title, sourceUrl, outline, rawMarkdown, sourcePackage }) {
  const sections = outline.sections.slice(0, 12).map((section, index) => ({
    index: index + 1,
    title: section.title,
    level: section.level,
    paragraphSamples: section.paragraphs.slice(0, 2).map((item) => truncateText(item, 180)),
    bulletSamples: section.bullets.slice(0, 5).map((item) => truncateText(item, 100)),
    metrics: extractMetricCandidatesFromText([...section.paragraphs, ...section.bullets].join(" ")).slice(0, 5),
    hasCode: section.codeBlocks > 0,
    paragraphCount: section.paragraphs.length,
    bulletCount: section.bullets.length
  }));

  const digest = {
    title,
    sourceUrl,
    sectionCount: outline.sections.length,
    markdownLength: rawMarkdown.length,
    sections,
    lead: truncateText(extractLead(rawMarkdown), 240),
    closing: truncateText(extractClosing(rawMarkdown), 240)
  };

  if (sourcePackage) {
    digest.sourcePackage = {
      sectionCount: sourcePackage.sectionCount,
      codeAssetCount: sourcePackage.codeAssetCount,
      topSectionTitles: sourcePackage.topSectionTitles || [],
      sectionTitles: (sourcePackage.sectionTitles || []).slice(0, 20),
      metrics: (sourcePackage.metrics || []).slice(0, 20),
      commands: (sourcePackage.commands || []).slice(0, 20),
      codeKindCounts: sourcePackage.codeKindCounts || {},
      cleaningReport: sourcePackage.cleaningReport || null,
      signals: sourcePackage.signals || {}
    };
  }

  return digest;
}

function buildSourcePackageSummary(sourcePackage) {
  const strongSectionCount = sourcePackage?.signals?.strongSectionCount || 0;
  const codeAssetCount = sourcePackage?.codeAssetCount || 0;
  const metricCount = sourcePackage?.metrics?.length || 0;
  return `Fallback planner used cleaned source package with ${sourcePackage?.sectionCount || 0} sections, ${strongSectionCount} strong sections, ${codeAssetCount} code assets, and ${metricCount} metric candidates.`;
}

function prioritizeSourceSections(sections) {
  return (sections || [])
    .filter((section) => section && (section.paragraphs?.length || section.bullets?.length || section.codeAssets?.length));
}

function bundleSectionsByPressure(sections, maxBundles) {
  const items = (sections || []).filter(Boolean);
  if (!items.length) return [];
  if (items.length <= maxBundles) {
    return items.map((item) => [item]);
  }

  const totalPressure = items.reduce((sum, section) => sum + estimateSectionPressure(section), 0);
  const targetPressure = totalPressure / Math.max(1, maxBundles);
  const bundles = [];
  let current = [];
  let currentPressure = 0;

  items.forEach((section, index) => {
    current.push(section);
    currentPressure += estimateSectionPressure(section);

    const remainingSections = items.length - index - 1;
    const remainingBundles = maxBundles - bundles.length - 1;
    const shouldSplit = currentPressure >= targetPressure && remainingBundles > 0;
    const mustSplit = remainingSections === remainingBundles;

    if ((shouldSplit || mustSplit) && current.length) {
      bundles.push(current);
      current = [];
      currentPressure = 0;
    }
  });

  if (current.length) {
    bundles.push(current);
  }

  return bundles;
}

function estimateSectionPressure(section) {
  const paragraphPressure = Math.min(section.paragraphs?.length || 0, 2) * 0.9;
  const bulletPressure = Math.min(section.bullets?.length || 0, 5) * 0.7;
  const codePressure = Math.min(section.codeAssets?.length || 0, 3) * 1.2;
  return 1 + paragraphPressure + bulletPressure + codePressure + (section.importance || 0.3);
}

function buildHeroSlideFromSourcePackage({ title, sourceUrl, sourcePackage, heroSection, sections }) {
  const lead = heroSection?.coreClaim || extractLead(sourcePackage.cleanedMarkdown) || "";
  const bullets = heroSection?.supportingPoints?.length
    ? heroSection.supportingPoints
    : sections.flatMap((section) => section.supportingPoints || []).slice(0, 4);
  const heroImage = sourcePackage.heroImage || heroSection?.images?.find((image) => image.resolvedSrc) || null;

  return {
    id: "slide-01",
    intent: "hero",
    templateId: "hero-cover",
    reasoning: "Opening slide keeps the article title, first section thesis, and the best available image candidate so the deck starts with both context and atmosphere.",
    sourceFocus: [title, heroSection?.title].filter(Boolean),
    content: {
      headerTitle: "SOURCE STORY",
      headerSubtitle: sourceUrl ? "CLEANED ARTICLE TO PPT" : "CLEANED MARKDOWN TO PPT",
      title,
      body: lead,
      bullets: textArray(bullets, 4, 72),
      tags: collectTagsFromSourceSections(sections),
      insight: heroSection?.metrics?.[0] ? `Metric signal: ${heroSection.metrics[0]}` : heroSection?.commandSamples?.[0] || "",
      visual: heroImage ? {
        src: normalizeVisualSrc(heroImage),
        alt: heroImage.alt || heroSection?.title || title,
        copy: heroImage.alt || heroSection?.title || "Source visual"
      } : {
        label: truncateText(heroSection?.title || title, 28),
        copy: truncateText(heroSection?.supportingPoints?.[0] || lead, 64)
      },
      footerText: "Adaptive chain · cleaned source package"
    }
  };
}

function chooseTemplateForSourceBundle(bundle) {
  const aggregate = aggregateSourceBundle(bundle);
  const titles = aggregate.sectionTitles.join(" ");
  const text = [aggregate.coreClaims.join(" "), aggregate.supportingPoints.join(" "), aggregate.bullets.join(" ")].join(" ");
  const primaryTitle = aggregate.sectionTitles[0] || "";
  const isSingleSection = bundle.length === 1;

  if (aggregate.commands.length >= 1 || bundle.some((section) => (section.commandSamples || []).length >= 1 || (section.codeAssets || []).some((asset) => asset.kind === "command-sequence"))) return "command-board";
  if (aggregate.configKeys.length >= 3) return "data-table";
  if (aggregate.intentHints.includes("faq-panel") || aggregate.questionCount >= 2) return "faq-panel";
  if (hasStrongCompareBundleSignal(aggregate)) return "compare-dual";
  if (hasStrongLayerSignal(primaryTitle, text)) return "layer-stack";
  if (hasStrongMetricSignal(primaryTitle, text, aggregate)) return "metric-board";
  if (/^["“].+["”]$/.test(aggregate.coreClaims[0] || "")) return "quote-insight";
  if (hasStrongProcessSignal(primaryTitle, text, aggregate)) return "process-lane";
  if (aggregate.supportingPoints.length >= 3 || aggregate.bullets.length >= 3) return "bullet-grid";
  if (isSingleSection && /总结|最后|收束|结语|下一步|边界感/i.test(primaryTitle)) return "closing-card";
  return "narrative-split";
}

function buildSourceSectionSlide(section, slideNumber, { isLast = false } = {}) {
  const templateId = chooseTemplateForSourceBundle([section]);
  return buildSourceBundleSlide([section], slideNumber, isLast && templateId === "narrative-split"
    ? "closing-card"
    : templateId);
}

function buildSourceBundleSlide(bundle, slideNumber, templateId) {
  const aggregate = aggregateSourceBundle(bundle);
  const title = deriveBundleTitle(bundle, aggregate);
  const reasoning = `Bundle focuses on ${aggregate.sectionTitles.slice(0, 2).join(" / ") || "one main idea"}, so ${templateId} is the clearest current renderer for the extracted content.`;
  const slide = {
    id: `slide-${String(slideNumber).padStart(2, "0")}`,
    intent: guessIntentFromTemplate(templateId),
    templateId,
    reasoning,
    sourceFocus: aggregate.sectionTitles.slice(0, 4),
    content: {
      headerTitle: title.toUpperCase(),
      headerSubtitle: "CONTENT SECTION",
      footerText: title
    }
  };

  if (templateId === "command-board") {
    Object.assign(slide.content, buildCommandBoardContentFromBundle(title, aggregate, bundle));
    return slide;
  }

  if (templateId === "data-table") {
    Object.assign(slide.content, buildDataTableContentFromBundle(title, aggregate));
    return slide;
  }

  if (templateId === "faq-panel") {
    Object.assign(slide.content, buildFaqContentFromBundle(title, aggregate));
    return slide;
  }

  if (templateId === "compare-dual") {
    Object.assign(slide.content, buildCompareContentFromBundle(title, aggregate));
    return slide;
  }

  if (templateId === "layer-stack") {
    Object.assign(slide.content, buildLayerStackContentFromBundle(title, aggregate));
    return slide;
  }

  if (templateId === "process-lane") {
    Object.assign(slide.content, buildProcessContentFromBundle(title, aggregate));
    return slide;
  }

  if (templateId === "metric-board") {
    Object.assign(slide.content, buildMetricContentFromBundle(title, aggregate));
    return slide;
  }

  if (templateId === "quote-insight") {
    Object.assign(slide.content, buildQuoteContentFromBundle(title, aggregate));
    return slide;
  }

  if (templateId === "bullet-grid") {
    Object.assign(slide.content, buildBulletGridContentFromBundle(title, aggregate));
    return slide;
  }

  Object.assign(slide.content, buildNarrativeContentFromBundle(title, aggregate));
  return slide;
}

function buildClosingSlideFromSourcePackage({ title, sourceUrl, sourcePackage, sections, slideNumber }) {
  const strongest = sections
    .slice()
    .sort((left, right) => (right.importance || 0) - (left.importance || 0))
    .slice(0, 4);

  return {
    id: `slide-${String(slideNumber).padStart(2, "0")}`,
    intent: "closing",
    templateId: "closing-card",
    reasoning: "Closing slide compresses the strongest sections into a short recap so the deck ends with memorable takeaways instead of article leftovers.",
    sourceFocus: strongest.map((section) => section.title).filter(Boolean),
    content: {
      headerTitle: "WRAP UP",
      headerSubtitle: "SUMMARY",
      title: shortenTitle(title, 22),
      subtitle: sourcePackage.commands?.length
        ? `Commands ${sourcePackage.commands.length} · Metrics ${sourcePackage.metrics.length} · Strong sections ${sourcePackage.signals?.strongSectionCount || 0}`
        : "Turn the article into a compact set of memorable takeaways.",
      points: strongest.map((section, index) => ({
        title: String(index + 1).padStart(2, "0"),
        description: truncateText(section.title || section.coreClaim || "", 28)
      })),
      footerText: sourceUrl ? "Adaptive chain · source summary" : "Adaptive chain · summary close"
    }
  };
}

function aggregateSourceBundle(bundle) {
  const sectionTitles = bundle.map((section) => section.title).filter(Boolean);
  const paragraphs = bundle.flatMap((section) => section.paragraphs || []);
  const bullets = bundle.flatMap((section) => section.bullets || []);
  const coreClaims = bundle.map((section) => section.coreClaim).filter(Boolean);
  const supportingPoints = bundle.flatMap((section) => section.supportingPoints || []);
  const metrics = uniqueText(bundle.flatMap((section) => section.metrics || []));
  const codeAssets = bundle.flatMap((section) => section.codeAssets || []);
  const commands = uniqueText([
    ...codeAssets.flatMap((asset) => asset.commands || []),
    ...bundle.flatMap((section) => section.commandSamples || [])
  ]);
  const configKeys = uniqueText(codeAssets.flatMap((asset) => asset.keys || []));
  const intentHints = uniqueText(bundle.flatMap((section) => section.intentHints || []));
  const codeKinds = uniqueText(codeAssets.map((asset) => asset.kind));
  const codeSummaries = uniqueText(codeAssets.map((asset) => asset.summary));
  const questionCount = supportingPoints.filter((item) => /[?？]/.test(item)).length;

  return {
    sectionTitles,
    paragraphs,
    bullets,
    coreClaims,
    supportingPoints,
    metrics,
    codeAssets,
    commands,
    configKeys,
    intentHints,
    codeKinds,
    codeSummaries,
    questionCount
  };
}

function hasStrongCompareBundleSignal(aggregate) {
  const text = [
    aggregate.sectionTitles.join(" "),
    aggregate.coreClaims.join(" "),
    aggregate.supportingPoints.join(" "),
    aggregate.bullets.join(" ")
  ].join(" ");

  return /(?:对比|对照|优缺点|利弊|迁移前|迁移后|before\s*\/\s*after|before|after|vs|versus|旧方案|新方案|旧方式|新方式)/i.test(text) &&
    (aggregate.bullets.length >= 2 || aggregate.supportingPoints.length >= 2);
}

function hasStrongLayerSignal(primaryTitle, text) {
  return /层|架构|stack|layer|pipeline|模块|分层/i.test(`${primaryTitle} ${text}`);
}

function hasStrongProcessSignal(primaryTitle, text, aggregate) {
  const joined = `${primaryTitle} ${text}`;
  const explicit = /流程|步骤|阶段|process|workflow|roadmap|路径|顺序|先.*再|然后/i.test(joined);
  const hasStructure = numberedDensity(text) >= 2 || aggregate.commands.length >= 2 || aggregate.bullets.length >= 3 || aggregate.supportingPoints.length >= 3;
  return explicit && hasStructure;
}

function hasStrongMetricSignal(primaryTitle, text, aggregate) {
  const joined = `${primaryTitle} ${text}`;
  const metrics = (aggregate.metrics || []).filter(isMeaningfulMetricToken);
  return (/指标|数据|metric|增长|比例|效率|rate|百分比|提升|收益|成本|耗时|时长|成功率|通过率|命中率|覆盖率|转化率/i.test(joined) && metrics.length >= 1) ||
    metrics.length >= 2;
}

function normalizeVisualSrc(image) {
  const src = String(image?.resolvedSrc || image?.absolutePath || image?.src || "").trim();
  if (!src) return "";
  if (/^https?:\/\//i.test(src) || src.startsWith("data:")) return src;
  if (src.startsWith("file://")) return src;
  if (image?.exists && image?.absolutePath) {
    return `file://${image.absolutePath}`;
  }
  return "";
}

function deriveBundleTitle(bundle, aggregate) {
  const firstTitle = aggregate.sectionTitles[0] || bundle[0]?.title || "Key Insight";
  return truncateTextLoose(firstTitle, 28);
}

function buildNarrativeContentFromBundle(title, aggregate) {
  return {
    title,
    body: truncateText(aggregate.coreClaims[0] || aggregate.paragraphs[0] || aggregate.supportingPoints[0] || "", 220),
    bullets: textArray(aggregate.supportingPoints.length ? aggregate.supportingPoints : aggregate.bullets, 4, 240),
    metric: aggregate.metrics[0] || "",
    metricLabel: aggregate.metrics[0] ? truncateText(aggregate.coreClaims[0] || title, 72) : "",
    insight: truncateText(aggregate.codeSummaries[0] || aggregate.paragraphs[1] || "", 120),
    nextStep: truncateText(aggregate.commands[0] || aggregate.supportingPoints[4] || "", 120)
  };
}

function buildBulletGridContentFromBundle(title, aggregate) {
  return {
    title,
    subtitle: truncateText(aggregate.coreClaims[0] || "", 60),
    bullets: textArray(aggregate.supportingPoints.length ? aggregate.supportingPoints : aggregate.bullets, 6, 72)
  };
}

function buildProcessContentFromBundle(title, aggregate) {
  const stepSource = aggregate.commands.length
    ? aggregate.commands
    : aggregate.supportingPoints.length
      ? aggregate.supportingPoints
      : aggregate.bullets;

  return {
    title,
    steps: stepSource.slice(0, 5).map((item, index) => ({
      title: deriveProcessStepTitle(item, index, aggregate),
      description: truncateText(item, 140)
    }))
  };
}

function deriveProcessStepTitle(item, index, aggregate) {
  const raw = truncateTextLoose(item, 36);
  if (!raw) {
    return aggregate.sectionTitles[index] || `Stage ${index + 1}`;
  }

  const clause = raw
    .split(/[：:，,。；;|]/)
    .map((part) => part.trim())
    .find(Boolean) || raw;

  if (clause.length <= 18) {
    return clause;
  }

  return truncateTextLoose(clause, 24);
}

function buildMetricContentFromBundle(title, aggregate) {
  const metrics = aggregate.metrics.filter(isMeaningfulMetricToken);
  return {
    title,
    metric: metrics[0] || "",
    metricLabel: truncateText(aggregate.coreClaims[0] || aggregate.paragraphs[0] || title, 84),
    bullets: textArray(aggregate.supportingPoints.length ? aggregate.supportingPoints : aggregate.bullets, 3, 84),
    subMetrics: metrics.slice(1, 5).map((metric, index) => ({
      value: metric,
      label: `Signal ${index + 1}`
    }))
  };
}

function buildCompareContentFromBundle(title, aggregate) {
  const compareItems = textArray(aggregate.supportingPoints.length ? aggregate.supportingPoints : aggregate.bullets, 6, 72);
  const pairs = splitCompareBullets(compareItems);
  return {
    title,
    beforeLabel: "CURRENT",
    afterLabel: "BETTER",
    beforeBullets: pairs.before,
    afterBullets: pairs.after,
    takeaway: truncateText(aggregate.coreClaims[0] || aggregate.paragraphs[0] || "", 120)
  };
}

function buildCommandBoardContentFromBundle(title, aggregate, bundle = []) {
  const commands = [];
  const seen = new Set();

  const pushCommand = (command, description, result = "") => {
    const normalized = truncateTextLoose(command, 100);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    commands.push({
      command: normalized,
      description: truncateText(description || "Key command step", 88),
      result: truncateTextLoose(result || "", 60)
    });
  };

  aggregate.commands.slice(0, 6).forEach((command, index) => {
    pushCommand(
      command,
      aggregate.codeSummaries[index] || aggregate.supportingPoints[index] || aggregate.sectionTitles[index] || "Key command step",
      aggregate.metrics[index] || ""
    );
  });

  if (commands.length < 2) {
    aggregate.codeAssets.forEach((asset, index) => {
      if (commands.length >= 6) return;
      extractCommandBoardFallbackLines(asset.raw).forEach((line) => {
        if (commands.length >= 6) return;
        pushCommand(
          line,
          inferCommandBoardFallbackDescription(line, asset, aggregate, index),
          ""
        );
      });
    });
  }

  return {
    title,
    commands
  };
}

function extractCommandBoardFallbackLines(raw) {
  return String(raw || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[$>]\s*/, "").replace(/\s*\\\s*$/, "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

function inferCommandBoardFallbackDescription(line, asset, aggregate, index) {
  if (/^--[\w-]+/.test(line)) return "Required flag in the same execution flow";
  if (/^(?:\.{1,2}\/|~\/|\/)?dist\//.test(line)) return "Distribution output for the shared runtime";
  if (/^(?:\.{1,2}\/|~\/|\/)?[\w.-]+(?:\/[\w.-]+)+$/.test(line)) return "Local path or generated artifact";
  return truncateText(
    asset.summary ||
      aggregate.supportingPoints[index] ||
      aggregate.sectionTitles[index] ||
      "Key command step",
    88
  );
}

function buildDataTableContentFromBundle(title, aggregate) {
  const rows = aggregate.configKeys.slice(0, 6).map((key, index) => ([
    key,
    truncateText(aggregate.codeSummaries[index] || aggregate.supportingPoints[index] || "Key config field", 24)
  ]));

  return {
    title,
    subtitle: truncateText(aggregate.coreClaims[0] || "", 50),
    headers: ["KEY", "MEANING"],
    rows,
    footNote: aggregate.metrics[0] ? `Metric signal: ${aggregate.metrics[0]}` : ""
  };
}

function buildLayerStackContentFromBundle(title, aggregate) {
  if (aggregate.sectionTitles.length >= 3) {
    return {
      title,
      layers: aggregate.sectionTitles.slice(0, 5).map((item, index) => ({
        label: truncateTextLoose(item, 18) || `LAYER ${index + 1}`,
        description: truncateText(aggregate.codeSummaries[index] || aggregate.supportingPoints[index] || aggregate.paragraphs[index] || "", 120)
      }))
    };
  }

  const descriptions = textArray(
    aggregate.supportingPoints.length ? aggregate.supportingPoints : aggregate.bullets.length ? aggregate.bullets : aggregate.paragraphs,
    5,
    108
  );

  return {
    title,
    layers: descriptions.map((item, index) => ({
      label: `LAYER ${index + 1}`,
      description: item
    }))
  };
}

function buildFaqContentFromBundle(title, aggregate) {
  const qaPairs = [];
  const candidates = [...aggregate.supportingPoints, ...aggregate.bullets];
  candidates.forEach((item, index) => {
    if (qaPairs.length >= 4) return;
    if (/[?？]/.test(item)) {
      qaPairs.push({
        question: truncateText(item, 56),
        answer: truncateText(aggregate.paragraphs[index] || aggregate.coreClaims[index] || aggregate.supportingPoints[index + 1] || "", 108)
      });
    }
  });

  if (qaPairs.length < 2) {
    aggregate.sectionTitles.slice(0, 3).forEach((item, index) => {
      if (qaPairs.length >= 4) return;
      qaPairs.push({
        question: truncateText(`${item} 是什么？`, 56),
        answer: truncateText(aggregate.coreClaims[index] || aggregate.supportingPoints[index] || "", 108)
      });
    });
  }

  return {
    title,
    qaPairs
  };
}

function buildQuoteContentFromBundle(title, aggregate) {
  return {
    title,
    quote: truncateText(aggregate.coreClaims[0] || aggregate.paragraphs[0] || "", 140),
    attribution: truncateText(aggregate.sectionTitles[0] || "", 40),
    contextCards: textArray(aggregate.supportingPoints, 3, 72).map((item, index) => ({
      title: `POINT ${index + 1}`,
      description: item
    }))
  };
}

function collectTagsFromSourceSections(sections) {
  return (sections || [])
    .map((section) => section.title)
    .filter(Boolean)
    .slice(0, 3)
    .map((item) => truncateText(item, 14));
}

function uniqueText(values) {
  return [...new Set((values || []).map((item) => String(item || "").trim()).filter(Boolean))];
}

function parseMarkdownOutline(rawMarkdown, title = "Presentation") {
  const markdown = String(rawMarkdown || "").replace(/\r\n/g, "\n");
  const lines = markdown.split("\n");
  const sections = [];
  let current = null;
  let paragraphBuffer = [];
  let inCode = false;

  const flushParagraph = () => {
    if (!current) return;
    const text = paragraphBuffer.join(" ").replace(/\s+/g, " ").trim();
    paragraphBuffer = [];
    if (text) current.paragraphs.push(text);
  };

  const ensureSection = (fallbackTitle = "导语", level = 2) => {
    if (!current) {
      current = {
        title: fallbackTitle,
        level,
        paragraphs: [],
        bullets: [],
        codeBlocks: 0
      };
    }
  };

  const pushCurrent = () => {
    flushParagraph();
    if (current && (current.paragraphs.length || current.bullets.length || current.codeBlocks)) {
      sections.push(current);
    }
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^```/.test(line)) {
      flushParagraph();
      inCode = !inCode;
      if (inCode) {
        ensureSection(title, 1);
        current.codeBlocks += 1;
      }
      continue;
    }
    if (inCode) continue;
    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      pushCurrent();
      current = {
        title: truncateText(heading[2].trim(), 80),
        level: heading[1].length,
        paragraphs: [],
        bullets: [],
        codeBlocks: 0
      };
      continue;
    }

    const bullet = line.match(/^[-*+]\s+(.*)$/) || line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet) {
      ensureSection(title, 1);
      flushParagraph();
      current.bullets.push(cleanInlineText(bullet[1]));
      continue;
    }

    ensureSection(title, 1);
    paragraphBuffer.push(line.trim());
  }

  pushCurrent();

  return {
    title,
    rawMarkdown: markdown,
    sections: sections.filter((section) => section.title || section.paragraphs.length || section.bullets.length)
  };
}

function bundleSections(sections, maxSlides) {
  if (sections.length <= maxSlides) {
    return sections.map((section) => [section]);
  }

  const groupSize = Math.ceil(sections.length / maxSlides);
  const bundles = [];
  let current = [];
  for (const section of sections) {
    current.push(section);
    if (current.length >= groupSize) {
      bundles.push(current);
      current = [];
    }
  }
  if (current.length) {
    bundles.push(current);
  }
  return bundles;
}

function chooseTemplateForBundle(bundle) {
  const joinedTitle = bundle.map((item) => item.title).join(" ");
  const joinedText = bundle.flatMap((item) => [...item.paragraphs, ...item.bullets]).join(" ");
  const bulletCount = bundle.reduce((sum, item) => sum + item.bullets.length, 0);
  const metrics = extractMetricCandidatesFromText(joinedText);

  if (/对比|比较|before|after|vs|versus/i.test(joinedTitle)) return "compare-dual";
  if (/风险|注意|警告|warning|caution/i.test(joinedTitle)) return "warning-callout";
  if (/时间线|timeline/i.test(joinedTitle)) return "horizontal-timeline";
  if (/层|架构|stack|layer/i.test(joinedTitle)) return "layer-stack";
  if (/指标|数据|metric|增长|比例|效率|rate/i.test(joinedTitle) || metrics.length >= 2) return "metric-board";
  if (/原则|要点|核心|清单|原则/i.test(joinedTitle) && bulletCount >= 4) return "bullet-grid";
  if (bulletCount >= 4) return "bullet-grid";
  if (/流程|步骤|阶段|process|workflow|roadmap|路径/i.test(joinedTitle) && numberedDensity(joinedText) > 2) return "process-lane";
  return "narrative-split";
}

function buildFallbackSlideForBundle(bundle, slideNumber, templateId) {
  const title = bundle[0]?.title || `Section ${slideNumber}`;
  const paragraphs = bundle.flatMap((item) => item.paragraphs);
  const bullets = bundle.flatMap((item) => item.bullets);
  const joinedText = [...paragraphs, ...bullets].join(" ");
  const metrics = extractMetricCandidatesFromText(joinedText);
  const fallbackBody = paragraphs.slice(0, 2).join(" ").trim();

  const base = {
    id: `slide-${String(slideNumber).padStart(2, "0")}`,
    intent: guessIntentFromTemplate(templateId),
    templateId,
    reasoning: `This section bundle reads most clearly as ${templateId} because it emphasizes ${TEMPLATE_PROMPTS[templateId] || "a single structured message"}.`,
    sourceFocus: bundle.map((section) => section.title).filter(Boolean).slice(0, 3),
    content: {
      headerTitle: title.toUpperCase(),
      headerSubtitle: "CONTENT SECTION",
      title,
      subtitle: paragraphs[0] || "",
      body: paragraphs.slice(1, 3).join(" ") || fallbackBody,
      bullets: textArray(bullets, 6, 88),
      footerText: title
    }
  };

  if (templateId === "metric-board") {
    base.content.metric = metrics.find(isMeaningfulMetricToken) || "";
    base.content.metricLabel = truncateText(fallbackBody || paragraphs[0] || "Key metric summary", 80);
    base.content.metricDelta = metrics.find((item, index) => index > 0 && isMeaningfulMetricToken(item)) || "";
    base.content.subMetrics = buildMetricObjects(metrics.filter(isMeaningfulMetricToken).slice(1, 5));
  } else if (templateId === "process-lane") {
    base.content.steps = buildStepObjects(bundle);
    delete base.content.bullets;
  } else if (templateId === "compare-dual") {
    const pairs = splitCompareBullets(bullets);
    base.content.beforeLabel = "BEFORE";
    base.content.afterLabel = "AFTER";
    base.content.beforeBullets = pairs.before;
    base.content.afterBullets = pairs.after;
    base.content.takeaway = truncateText(paragraphs[0] || "", 120);
  } else if (templateId === "warning-callout") {
    base.content.warningTitle = truncateText(paragraphs[0] || title, 60);
    base.content.body = truncateText(paragraphs.slice(1, 3).join(" ") || fallbackBody, 180);
    base.content.riskCards = buildLabeledCards(bullets.slice(0, 2), "RISK");
  } else if (templateId === "layer-stack") {
    base.content.layers = buildLayerObjects(bundle);
    delete base.content.bullets;
  } else if (templateId === "horizontal-timeline") {
    base.content.phases = buildPhaseObjects(bundle);
    delete base.content.bullets;
  } else if (templateId === "closing-card") {
    base.content.points = buildClosingPoints(bundle);
  }

  return base;
}

function buildBackupContentFromOutline(templateId, section) {
  const title = section.title || "Untitled";
  const paragraphs = section.paragraphs || [];
  const bullets = section.bullets || [];
  const text = [...paragraphs, ...bullets].join(" ");

  if (templateId === "metric-board") {
    const metrics = extractMetricCandidatesFromText(text);
    return {
      title,
      metric: metrics[0] || "",
      metricLabel: paragraphs[0] || title,
      bullets: textArray(bullets, 3, 88),
      subMetrics: buildMetricObjects(metrics.slice(1, 5))
    };
  }

  if (templateId === "process-lane") {
    return {
      title,
      steps: buildStepObjects([section])
    };
  }

  if (templateId === "compare-dual") {
    const pairs = splitCompareBullets(bullets);
    return {
      title,
      beforeLabel: "BEFORE",
      afterLabel: "AFTER",
      beforeBullets: pairs.before,
      afterBullets: pairs.after
    };
  }

  if (templateId === "warning-callout") {
    return {
      title,
      warningTitle: truncateText(paragraphs[0] || title, 60),
      body: paragraphs.slice(1, 3).join(" "),
      bullets: textArray(bullets, 3, 72),
      riskCards: buildLabeledCards(bullets.slice(0, 2), "RISK")
    };
  }

  if (templateId === "layer-stack") {
    return {
      title,
      layers: buildLayerObjects([section])
    };
  }

  if (templateId === "horizontal-timeline") {
    return {
      title,
      phases: buildPhaseObjects([section])
    };
  }

  if (templateId === "closing-card") {
    return {
      title,
      subtitle: paragraphs[0] || "",
      points: buildClosingPoints([section])
    };
  }

  return {
    title,
    subtitle: paragraphs[0] || "",
    body: paragraphs.slice(1, 3).join(" "),
    bullets: textArray(bullets, 5, 88)
  };
}

function buildClosingPoints(sections) {
  const items = Array.isArray(sections) ? sections : [];
  return items
    .slice(0, 4)
    .map((section, index) => {
      const title = typeof section === "string" ? section : section.title || `0${index + 1}`;
      const description = typeof section === "string"
        ? section
        : section.paragraphs?.[0] || section.bullets?.[0] || "";
      return {
        title: String(index + 1).padStart(2, "0"),
        description: truncateText(title || description, 26)
      };
    });
}

function buildLabeledCards(items, prefix) {
  return textArray(items, 2, 84).map((item, index) => ({
    title: `${prefix} ${index + 1}`,
    description: item
  }));
}

function buildLayerObjects(bundle) {
  const bullets = textArray(bundle.flatMap((item) => item.bullets), 5, 84);
  if (bullets.length >= 3) {
    return bullets.map((item, index) => ({
      label: `LAYER ${index + 1}`,
      description: item
    }));
  }

  return bundle
    .slice(0, 5)
    .map((section, index) => ({
      label: truncateTextLoose(section.title || `LAYER ${index + 1}`, 18),
      description: truncateText(section.paragraphs?.[0] || section.bullets?.[0] || "", 120)
    }))
    .filter((item) => item.description);
}

function buildPhaseObjects(bundle) {
  const titles = bundle.map((section) => section.title).filter(Boolean);
  if (titles.length >= 3) {
    return titles.slice(0, 6).map((item, index) => ({
      title: truncateTextLoose(item, 20),
      description: truncateText(bundle[index]?.paragraphs?.[0] || bundle[index]?.bullets?.[0] || "", 100)
    }));
  }

  return textArray(bundle.flatMap((item) => item.bullets), 6, 72).map((item, index) => ({
    title: `PHASE ${index + 1}`,
    description: item
  }));
}

function buildStepObjects(sections) {
  const steps = [];
  for (const section of sections) {
    if (section.bullets.length) {
      section.bullets.forEach((bullet, index) => {
        if (steps.length >= 5) return;
        steps.push({
          title: deriveProcessStepTitle(bullet, index, { sectionTitles: [section.title || ""] }),
          description: truncateText(bullet, 140)
        });
      });
    } else if (section.paragraphs[0]) {
      steps.push({
        title: deriveProcessStepTitle(section.paragraphs[0], steps.length, { sectionTitles: [section.title || ""] }),
        description: truncateText(section.paragraphs[0], 140)
      });
    }
    if (steps.length >= 5) break;
  }
  return steps.slice(0, 5);
}

function splitCompareBullets(bullets) {
  const half = Math.ceil((bullets || []).length / 2);
  return {
    before: textArray((bullets || []).slice(0, half), 5, 84),
    after: textArray((bullets || []).slice(half), 5, 84)
  };
}

function buildMetricObjects(metrics) {
  return metrics.slice(0, 4).map((metric, index) => ({
    value: metric,
    label: `Metric ${index + 1}`
  }));
}

function collectCompactBullets(sections, maxItems) {
  const bullets = [];
  for (const section of sections) {
    for (const bullet of section.bullets || []) {
      bullets.push(bullet);
      if (bullets.length >= maxItems) return textArray(bullets, maxItems, 72);
    }
    if (section.paragraphs?.[0]) {
      bullets.push(section.paragraphs[0]);
      if (bullets.length >= maxItems) return textArray(bullets, maxItems, 72);
    }
  }
  return textArray(bullets, maxItems, 72);
}

function collectTags(sections) {
  return sections
    .map((section) => section.title)
    .filter(Boolean)
    .slice(0, 3)
    .map((item) => truncateText(item, 14));
}

function buildNarrativeSummary(sections) {
  const titles = (sections || []).map((section) => section.title).filter(Boolean).slice(0, 5);
  return titles.join(" -> ") || "opening -> analysis -> takeaway";
}

function extractLead(markdown) {
  return textToParagraphs(markdown)[0] || "";
}

function extractClosing(markdown) {
  const paragraphs = textToParagraphs(markdown);
  return paragraphs[paragraphs.length - 1] || "";
}

function textToParagraphs(markdown) {
  return String(markdown || "")
    .split(/\n\s*\n/g)
    .map((item) => cleanInlineText(item))
    .filter(Boolean);
}

function extractMetricCandidatesFromText(text) {
  return [...String(text || "").matchAll(/\b\d+(?:\.\d+)?(?:%|x|倍|万|亿|k|K|m|M)?\b/g)]
    .map((match) => match[0])
    .filter(isMeaningfulMetricToken);
}

function extractMetricCandidate(text) {
  return extractMetricCandidatesFromText(text)[0] || "";
}

function isMeaningfulMetricToken(token) {
  const value = String(token || "").trim();
  if (!value) return false;
  if (/%|x|倍|万|亿|k|K|m|M/.test(value)) return true;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 10;
}

function numberedDensity(text) {
  return [...String(text || "").matchAll(/\b(?:first|second|third|\d+[.)])\b/gi)].length;
}

function guessIntentFromTemplate(templateId) {
  const spec = getTemplate(templateId);
  return spec?.intent || "narrative";
}

function hasMeaningfulContent(content) {
  return Object.values(content || {}).some((value) => {
    if (!value) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });
}

function truncateForPrompt(text, maxChars) {
  const value = String(text || "");
  if (value.length <= maxChars) return value;
  const head = value.slice(0, Math.floor(maxChars * 0.7));
  const tail = value.slice(-Math.floor(maxChars * 0.25));
  return `${head}\n\n[... truncated for prompt ...]\n\n${tail}`;
}

function safeParseJson(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function cleanInlineText(text) {
  return String(text || "")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textArray(items, maxItems, maxCharsPerItem) {
  return (items || [])
    .map((item) => truncateText(cleanInlineText(item), maxCharsPerItem))
    .filter(Boolean)
    .slice(0, maxItems);
}

function truncateText(value, maxChars) {
  const text = cleanInlineText(value);
  if (!text || text.length <= maxChars) return text;
  if (maxChars <= 1) return text.slice(0, maxChars);
  const ellipsis = "…";
  return `${text.slice(0, Math.max(0, maxChars - ellipsis.length)).trimEnd()}${ellipsis}`;
}

function truncateTextLoose(value, maxChars) {
  const text = cleanInlineText(value);
  if (!text || text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()}`;
}

function shortenTitle(value, maxChars) {
  return truncateTextLoose(value, maxChars);
}
