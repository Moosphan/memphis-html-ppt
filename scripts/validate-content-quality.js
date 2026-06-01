import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { buildSourcePackage } from "./lib/build-source-package.js";
import { checkContentFit, getTemplate } from "./lib/template-registry.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.plan) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const plan = JSON.parse(await fs.readFile(path.resolve(args.plan), "utf8"));
  const sourcePackage = await loadSourcePackage(args);
  const html = args.html ? await fs.readFile(path.resolve(args.html), "utf8") : "";

  const report = validateContentQuality({ plan, sourcePackage, html });
  const reportPath = args["out-report"] ? path.resolve(args["out-report"]) : "";

  if (reportPath) {
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  }

  console.log(`Content quality validation for ${path.resolve(args.plan)}`);
  for (const item of report.items) {
    console.log(`${item.ok ? "PASS" : item.level}  ${item.label}  ${item.detail}`);
  }
  console.log(`Summary: ${report.failures} fail, ${report.warnings} warn`);
  if (reportPath) {
    console.log(`Report: ${reportPath}`);
  }

  if (report.failures > 0) {
    process.exitCode = 1;
  }
}

async function loadSourcePackage(args) {
  if (args["source-package"]) {
    return JSON.parse(await fs.readFile(path.resolve(args["source-package"]), "utf8"));
  }

  if (args["cleaned-markdown"]) {
    const markdownPath = path.resolve(args["cleaned-markdown"]);
    const markdown = await fs.readFile(markdownPath, "utf8");
    return buildSourcePackage(markdown, {
      title: args.title || path.basename(markdownPath, path.extname(markdownPath)),
      sourceUrl: args["source-url"] || ""
    });
  }

  return buildSourcePackage("", {
    title: args.title || "Presentation",
    sourceUrl: args["source-url"] || "",
    alreadyCleaned: true
  });
}

function validateContentQuality({ plan, sourcePackage, html }) {
  const items = [];
  const slides = Array.isArray(plan?.slides) ? plan.slides : [];
  const deckText = JSON.stringify(plan || {});
  const cleanedMarkdown = String(sourcePackage?.cleanedMarkdown || "");
  const sourceSections = Array.isArray(sourcePackage?.sections) ? sourcePackage.sections : [];
  const strongSections = sourceSections.filter((section) => (section.importance || 0) >= 0.6);
  const maxShare = resolveMaxTemplateShare(plan?.deckMeta?.templateConstraints?.maxShare);

  pushResult(items, slides.length > 0, "FAIL", "plan contains slides", `${slides.length}`);
  pushResult(items, typeof plan?.deckMeta?.title === "string" && plan.deckMeta.title.trim().length > 0, "FAIL", "deck title exists", plan?.deckMeta?.title || "(empty)");
  pushResult(items, typeof sourcePackage?.cleanedMarkdown === "string", "FAIL", "source package available", sourcePackage?.cleanedMarkdown ? "yes" : "missing");
  const distributionReport = checkTemplateDistribution(slides, maxShare);
  pushResult(items, distributionReport.ok, "FAIL", `template frequency cap <= ${Math.max(1, Math.floor(slides.length * maxShare))}`, distributionReport.detail);

  const noiseReport = checkNoise(cleanedMarkdown);
  pushResult(items, noiseReport.ok, "WARN", "noise removed", noiseReport.detail);

  const coverageReport = checkSectionCoverage(slides, strongSections);
  pushResult(items, coverageReport.ok, "FAIL", "strong section coverage", coverageReport.detail);

  const metricReport = checkMetricCoverage(deckText, sourcePackage?.metrics || []);
  pushResult(items, metricReport.ok, "WARN", "metric coverage", metricReport.detail);

  const commandReport = checkCommandCoverage(slides, sourcePackage);
  pushResult(items, commandReport.ok, commandReport.level, "command extraction", commandReport.detail);

  const codeReport = checkCodeAbstraction(slides, sourcePackage);
  pushResult(items, codeReport.ok, codeReport.level, "code abstraction", codeReport.detail);

  const semanticReport = checkTemplateSemantics(slides);
  pushResult(items, semanticReport.ok, "FAIL", "template semantics", semanticReport.detail);

  const fitReport = checkPlanFit(slides);
  pushResult(items, fitReport.ok, fitReport.level, "template fit", fitReport.detail);

  const htmlReport = html ? checkHtmlMirror(html, slides) : { ok: true, detail: "html not provided" };
  if (html) {
    pushResult(items, htmlReport.ok, "WARN", "html mirror", htmlReport.detail);
  }

  const failures = items.filter((item) => item.level === "FAIL" && !item.ok).length;
  const warnings = items.filter((item) => item.level === "WARN" && !item.ok).length;

  return {
    generatedAt: new Date().toISOString(),
    sourcePackage: {
      title: sourcePackage?.title || "",
      sectionCount: sourcePackage?.sectionCount || 0,
      codeAssetCount: sourcePackage?.codeAssetCount || 0
    },
    plan: {
      title: plan?.deckMeta?.title || "",
      slideCount: slides.length
    },
    items,
    failures,
    warnings
  };
}

function checkNoise(cleanedMarkdown) {
  const noisePatterns = [
    /^(?:点赞|收藏|分享|评论|关注|阅读原文|打开App|相关推荐|相关文章|更多推荐|热门评论|广告|推广)(?:\s|$)/u,
    /^(?:\*+\s*)?(?:阅读原文|打开App|相关推荐|相关文章|更多推荐|热门评论|广告|推广)(?:\s|$)/u,
    /^.*(?:关注作者|加入讨论|收起全文|展开全文|阅读全文).*$/
  ];
  const lines = cleanedMarkdown.split("\n").map((line) => line.trim()).filter(Boolean);
  const hits = lines.filter((line) => noisePatterns.some((pattern) => pattern.test(line)));
  const ratio = lines.length ? hits.length / lines.length : 0;
  const ok = hits.length === 0 || ratio <= 0.03;
  return {
    ok,
    detail: hits.length ? `${hits.length} noisy lines detected` : "clean"
  };
}

function checkTemplateDistribution(slides, maxShare) {
  const counts = new Map();
  for (const slide of slides || []) {
    const templateId = String(slide?.templateId || "");
    if (!templateId) continue;
    counts.set(templateId, (counts.get(templateId) || 0) + 1);
  }

  const cap = Math.max(1, Math.floor((slides?.length || 0) * maxShare));
  const offenders = [...counts.entries()].filter(([templateId, count]) => !["hero-cover", "closing-card"].includes(templateId) && count > cap);
  return {
    ok: offenders.length === 0,
    detail: offenders.length ? offenders.map(([templateId, count]) => `${templateId}:${count}/${cap}`).join("; ") : `all templates within cap ${cap}`
  };
}

function resolveMaxTemplateShare(value) {
  const parsed = Number(value ?? process.env.ADAPTIVE_TEMPLATE_MAX_SHARE ?? process.env.MAX_TEMPLATE_SHARE ?? 0.25);
  return Number.isFinite(parsed) ? Math.max(0.1, Math.min(1, parsed)) : 0.25;
}

function checkSectionCoverage(slides, strongSections) {
  if (!strongSections.length) {
    return { ok: true, detail: "no strong sections to verify" };
  }

  const matched = strongSections.filter((section) => {
    const title = normalizeLooseText(section.title);
    const claim = normalizeLooseText(section.coreClaim);
    return slides.some((slide) => {
      const focus = (slide.sourceFocus || []).map(normalizeLooseText);
      const contentText = normalizeLooseText(JSON.stringify(slide.content || {}));
      return focus.includes(title) || (title && contentText.includes(title)) || (claim && contentText.includes(claim));
    });
  });

  const ratio = matched.length / strongSections.length;
  return {
    ok: ratio >= 0.7,
    detail: `${matched.length}/${strongSections.length} strong sections covered`
  };
}

function checkMetricCoverage(deckText, metrics) {
  const uniqueMetrics = [...new Set((metrics || []).map((item) => String(item || "").trim()).filter(Boolean))];
  if (!uniqueMetrics.length) {
    return { ok: true, detail: "no metrics detected" };
  }

  const matched = uniqueMetrics.filter((metric) => deckText.includes(metric));
  const ratio = matched.length / uniqueMetrics.length;
  return {
    ok: ratio >= 0.5,
    detail: `${matched.length}/${uniqueMetrics.length} metrics surfaced`
  };
}

function checkCommandCoverage(slides, sourcePackage) {
  const commands = [...new Set((sourcePackage?.commands || []).map((item) => String(item || "").trim()).filter(Boolean))];
  if (!commands.length) {
    return { ok: true, level: "WARN", detail: "no command assets detected" };
  }

  const commandSections = (sourcePackage?.sections || []).filter((section) => (section.codeAssets || []).some((asset) => asset.kind === "command-sequence"));
  const commandSlides = slides.filter((slide) => ["command-board", "process-lane"].includes(slide.templateId));
  const surfaced = commands.filter((command) => commandSlides.some((slide) => JSON.stringify(slide.content || {}).includes(command)));
  const commandRatio = surfaced.length / commands.length;
  const sectionCoverage = commandSections.filter((section) => commandSlides.some((slide) => {
    const focus = (slide.sourceFocus || []).map(normalizeLooseText);
    const title = normalizeLooseText(section.title);
    return focus.includes(title) || JSON.stringify(slide.content || {}).includes(section.commandSamples?.[0] || "");
  })).length;
  const sectionRatio = commandSections.length ? sectionCoverage / commandSections.length : 1;

  return {
    ok: commandSlides.length > 0 && sectionRatio >= 0.75 && commandRatio >= 0.35,
    level: commandSlides.length > 0 && sectionRatio >= 0.75 ? "WARN" : "FAIL",
    detail: `${surfaced.length}/${commands.length} commands surfaced, ${sectionCoverage}/${commandSections.length || 0} command sections covered`
  };
}

function checkCodeAbstraction(slides, sourcePackage) {
  const codeAssets = Array.isArray(sourcePackage?.codeAssets) ? sourcePackage.codeAssets : [];
  if (!codeAssets.length) {
    return { ok: true, level: "WARN", detail: "no code assets detected" };
  }

  const slideText = slides.map((slide) => JSON.stringify(slide.content || {})).join("\n");
  const commandAssets = codeAssets.filter((asset) => asset.kind === "command-sequence");
  const configAssets = codeAssets.filter((asset) => asset.kind === "config-snippet");
  const conceptAssets = codeAssets.filter((asset) => asset.kind === "conceptual-structure");
  const implAssets = codeAssets.filter((asset) => asset.kind === "implementation-detail");

  const commandOk = commandAssets.length === 0 || slides.some((slide) => ["command-board", "process-lane"].includes(slide.templateId));
  const configOk = configAssets.length === 0 || slides.some((slide) => slide.templateId === "data-table" || slide.templateId === "bullet-grid" || slide.templateId === "narrative-split");
  const conceptOk = conceptAssets.length === 0 || slides.some((slide) => ["layer-stack", "narrative-split", "bullet-grid", "compare-dual", "process-lane", "command-board"].includes(slide.templateId));
  const implRawCodeLeak = implAssets.some((asset) => slideText.includes(asset.raw.slice(0, 40)));

  const ok = commandOk && configOk && conceptOk && !implRawCodeLeak;
  const level = ok ? "WARN" : "FAIL";
  return {
    ok,
    level,
    detail: `${commandAssets.length} command, ${configAssets.length} config, ${conceptAssets.length} concept, ${implAssets.length} impl assets`
  };
}

function checkTemplateSemantics(slides) {
  const issues = [];

  for (const slide of slides) {
    const content = slide.content || {};
    const templateId = String(slide.templateId || "");
    if (!getTemplate(templateId)) {
      issues.push(`${slide.id}:template-missing`);
      continue;
    }

    const fit = checkContentFit(templateId, content);
    if (!fit.fit) {
      issues.push(`${slide.id}:${fit.violations.map((item) => `${item.slot}:${item.issue}`).join(",")}`);
      continue;
    }

    if (templateId === "command-board" && (!Array.isArray(content.commands) || content.commands.length < 1)) {
      issues.push(`${slide.id}:command-board needs commands`);
    }
    if (templateId === "process-lane" && (!Array.isArray(content.steps) || content.steps.length < 2)) {
      issues.push(`${slide.id}:process-lane needs steps`);
    }
    if (templateId === "data-table" && (!Array.isArray(content.headers) || !Array.isArray(content.rows) || content.headers.length < 2 || content.rows.length < 2)) {
      issues.push(`${slide.id}:data-table needs headers and rows`);
    }
    if (templateId === "layer-stack" && (!Array.isArray(content.layers) || content.layers.length < 3)) {
      issues.push(`${slide.id}:layer-stack needs layers`);
    }
    if (templateId === "faq-panel" && (!Array.isArray(content.qaPairs) || content.qaPairs.length < 2)) {
      issues.push(`${slide.id}:faq-panel needs qa pairs`);
    }
    if (templateId === "compare-dual" && (!Array.isArray(content.beforeBullets) || !Array.isArray(content.afterBullets))) {
      issues.push(`${slide.id}:compare-dual needs before/after bullets`);
    }
  }

  return {
    ok: issues.length === 0,
    detail: issues.length ? issues.join("; ") : "all slides semantically valid"
  };
}

function checkPlanFit(slides) {
  const issues = [];
  for (const slide of slides) {
    const fit = checkContentFit(slide.templateId, slide.content || {});
    if (!fit.fit) {
      issues.push(`${slide.id}:${fit.violations.map((item) => `${item.slot}:${item.issue}`).join(",")}`);
    }
  }
  return {
    ok: issues.length === 0,
    level: issues.some((issue) => /missing-required|too-few-items/.test(issue)) ? "FAIL" : "WARN",
    detail: issues.length ? issues.join("; ") : "fit clean"
  };
}

function checkHtmlMirror(html, slides) {
  const slideCount = countMatches(html, /class="mp-deck\b/g);
  const markers = [...html.matchAll(/data-template="([^"]+)"/g)].map((match) => match[1]);
  const ok = slideCount === slides.length && markers.length === slides.length;
  return {
    ok,
    detail: `${slideCount} html slides, ${markers.length} template markers`
  };
}

function normalizeLooseText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[*_`>#]/g, " ")
    .replace(/[：:·•\-_|()\[\]{}。，、！!？?]/g, "")
    .replace(/\s+/g, "");
}

function countMatches(text, pattern) {
  return [...String(text || "").matchAll(pattern)].length;
}

function pushResult(items, ok, level, label, detail) {
  items.push({ ok, level, label, detail });
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index];
    if (!part.startsWith("--")) continue;
    result[part.slice(2)] = argv[index + 1];
    index += 1;
  }
  return result;
}

function printUsage() {
  console.log("Usage: node scripts/validate-content-quality.js --plan <deck-plan.json> [--source-package <source-package.json>] [--cleaned-markdown <clean.md>] [--html <preview.html>] [--out-report <report.json>]");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
