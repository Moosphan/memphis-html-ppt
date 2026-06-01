import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { checkContentFit, getTemplate } from "./lib/template-registry.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.html) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const htmlPath = path.resolve(args.html);
  const html = await fs.readFile(htmlPath, "utf8");
  const slideCount = countMatches(html, /class="mp-deck\b/g);
  const templateMarkers = [...html.matchAll(/data-template="([^"]+)"/g)].map((match) => match[1]);
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
  const sourceLabel = html.match(/<!--\s*source:\s*([\s\S]*?)\s*-->/i)?.[1]?.trim() || "";
  const themeLabel = html.match(/<!--\s*theme:\s*([\s\S]*?)\s*-->/i)?.[1]?.trim() || "";
  const minSlides = Number(args["min-slides"] || 1);
  const strictFit = String(args["strict-fit"] || "").toLowerCase() === "true";

  const results = [];

  pushResult(results, slideCount >= minSlides, "FAIL", `slide count >= ${minSlides}`, `${slideCount}`);
  pushResult(results, html.includes('id="progress"'), "FAIL", "progress bar exists", "id=progress");
  pushResult(results, html.includes('id="prev"') && html.includes('id="next"'), "FAIL", "navigation buttons exist", "prev/next");
  pushResult(results, html.includes('id="counter"'), "FAIL", "counter exists", "id=counter");
  pushResult(results, html.includes('class="mp-stage slide-deck"') || html.includes('class="slide-deck mp-stage"'), "FAIL", "deck container exists", "class=slide-deck");
  pushResult(results, html.includes("width:1280px;height:720px"), "WARN", "slides keep 1280x720 frame", "1280x720");
  pushResult(results, title.length > 0, "FAIL", "document title exists", title || "(empty)");
  pushResult(results, sourceLabel.length > 0, "WARN", "source label exists", sourceLabel || "(missing)");
  pushResult(results, themeLabel === "memphis-editorial", "WARN", "theme metadata is memphis-editorial", themeLabel || "(missing)");
  pushResult(results, templateMarkers.length === slideCount, "WARN", "every slide exposes data-template", `${templateMarkers.length} / ${slideCount}`);

  if (args.plan) {
    const planPath = path.resolve(args.plan);
    const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
    validateDeckPlan(plan, {
      slideCount,
      templateMarkers,
      strictFit,
      results
    });
  }

  const failed = results.filter((item) => item.level === "FAIL" && !item.ok);
  const warned = results.filter((item) => item.level === "WARN" && !item.ok);

  console.log(`Adaptive preview validation for ${htmlPath}`);
  for (const result of results) {
    console.log(`${result.ok ? "PASS" : result.level}  ${result.label}  ${result.detail}`);
  }
  console.log(`Summary: ${failed.length} fail, ${warned.length} warn, ${slideCount} slides`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

function validateDeckPlan(plan, { slideCount, templateMarkers, strictFit, results }) {
  const slides = Array.isArray(plan?.slides) ? plan.slides : [];
  const deckMeta = plan?.deckMeta || {};
  const seenIds = new Set();

  pushResult(results, slides.length > 0, "FAIL", "plan contains slides", `${slides.length}`);
  pushResult(results, slides.length === slideCount, "FAIL", "HTML slide count matches plan", `${slideCount} html / ${slides.length} plan`);
  pushResult(results, typeof deckMeta.title === "string" && deckMeta.title.trim().length > 0, "FAIL", "plan deckMeta.title exists", deckMeta.title || "(empty)");
  pushResult(results, deckMeta.theme === "memphis-editorial", "WARN", "plan theme is memphis-editorial", deckMeta.theme || "(missing)");

  slides.forEach((slide, index) => {
    const label = slideLabel(index, slide);
    const templateId = String(slide?.templateId || "");
    const slideId = String(slide?.id || "");
    const slideReasoning = String(slide?.reasoning || "").trim();
    const spec = getTemplate(templateId);

    pushResult(results, slideId.length > 0, "FAIL", `${label} id exists`, slideId || "(missing)");
    pushResult(results, !seenIds.has(slideId), "FAIL", `${label} id unique`, slideId || "(missing)");
    pushResult(results, !!spec, "FAIL", `${label} template exists`, templateId || "(missing)");
    pushResult(results, slideReasoning.length >= 12, "WARN", `${label} reasoning is present`, slideReasoning || "(missing)");
    pushResult(results, typeof slide?.content === "object" && !!slide.content, "FAIL", `${label} content exists`, typeof slide?.content);
    pushResult(results, templateMarkers[index] === templateId, "WARN", `${label} HTML template marker matches plan`, `${templateMarkers[index] || "(missing)"} / ${templateId || "(missing)"}`);

    if (slideId) {
      seenIds.add(slideId);
    }

    if (!spec || !slide?.content) {
      return;
    }

    const fit = checkContentFit(templateId, slide.content);
    if (fit.fit) {
      pushResult(results, true, "WARN", `${label} template fit`, "clean");
      return;
    }

    const detail = fit.violations
      .map((item) => `${item.slot}:${item.issue}`)
      .join(", ");

    const hasHardViolation = fit.violations.some((item) => item.issue === "missing-required" || item.issue === "too-few-items");
    const level = strictFit || hasHardViolation ? "FAIL" : "WARN";
    pushResult(results, false, level, `${label} template fit`, detail);
  });
}

function pushResult(results, ok, level, label, detail) {
  results.push({ ok, level, label, detail });
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
  console.log("Usage: node scripts/validate-adaptive-preview.js --html <preview.html> [--plan <plan.json>] [--min-slides 1] [--strict-fit true]");
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function slideLabel(index, slide) {
  return slide?.id || `slide-${String(index + 1).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
