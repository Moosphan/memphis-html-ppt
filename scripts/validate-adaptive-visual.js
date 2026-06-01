import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const nodeModulesPath = "/Users/dorck/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const require = createRequire(import.meta.url);
const { chromium } = loadPackage("playwright");
const sharp = loadPackage("sharp");
const pixelmatch = loadPixelmatch();
const { PNG } = loadPackage("pngjs");

import { getTemplate } from "./lib/template-registry.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.html) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const htmlPath = path.resolve(args.html);
  const planPath = resolveOptionalPlan(args.plan, htmlPath);
  const outDir = path.resolve(args["out-dir"] || path.join(path.dirname(htmlPath), "adaptive-visual-report"));
  const baselineDir = args["baseline-dir"] ? path.resolve(args["baseline-dir"]) : "";
  const compareSvg = String(args["compare-svg"] ?? "true").toLowerCase() !== "false";
  const writeBaseline = String(args["write-baseline"] ?? "").toLowerCase() === "true";
  const maxSvgDiff = Number(args["max-svg-diff"] || 0.14);
  const minSafeInset = Number(args["min-safe-inset"] || 20);

  await fs.mkdir(outDir, { recursive: true });
  const slideDir = path.join(outDir, path.basename(htmlPath, path.extname(htmlPath)));
  await fs.rm(slideDir, { recursive: true, force: true });
  await fs.mkdir(slideDir, { recursive: true });

  const deckHtmlCopyPath = path.join(slideDir, "deck.html");
  await fs.copyFile(htmlPath, deckHtmlCopyPath);
  let deckPlanCopyPath = "";
  if (planPath) {
    deckPlanCopyPath = path.join(slideDir, "deck.plan.json");
    await fs.copyFile(planPath, deckPlanCopyPath);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(toFileUrl(htmlPath), { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForFunction(() => document.fonts ? document.fonts.status === "loaded" : true, null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(300);

  const slides = await page.evaluate(() => {
    return [...document.querySelectorAll(".mp-deck")].map((el, index) => ({
      index,
      id: el.getAttribute("data-slide") || `slide-${String(index + 1).padStart(2, "0")}`,
      templateId: el.getAttribute("data-template") || "",
      intent: el.getAttribute("data-intent") || "",
      slideId: el.getAttribute("data-slide-id") || "",
      active: el.classList.contains("active")
    }));
  });

  const results = [];
  for (const slide of slides) {
    await showSlide(page, slide.index);

    const metrics = await page.evaluate(() => {
      const slide = document.querySelector(".mp-deck.active");
      if (!slide) return null;
      const rect = slide.getBoundingClientRect();
      const candidates = [...slide.querySelectorAll('[data-safe-area], .mp-card, .mp-h1, .mp-h2, .mp-h3, .mp-h4, .mp-metric, .mp-bullets, .mp-tag')];
      const boxes = candidates
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
            height: r.height
          };
        })
        .filter((box) => box.width > 0 && box.height > 0);

      if (!boxes.length) {
        return { rect, hasContent: false };
      }

      const bounds = boxes.reduce((acc, box) => ({
        x: Math.min(acc.x, box.x),
        y: Math.min(acc.y, box.y),
        right: Math.max(acc.right, box.right),
        bottom: Math.max(acc.bottom, box.bottom)
      }), {
        x: Number.POSITIVE_INFINITY,
        y: Number.POSITIVE_INFINITY,
        right: Number.NEGATIVE_INFINITY,
        bottom: Number.NEGATIVE_INFINITY
      });

      return {
        rect,
        hasContent: true,
        bounds,
        insets: {
          top: bounds.y - rect.y,
          left: bounds.x - rect.x,
          right: rect.right - bounds.right,
          bottom: rect.bottom - bounds.bottom
        }
      };
    });

    const screenshotPath = path.join(slideDir, `${slide.id}.${slide.templateId || "unknown"}.html.png`);
    await page.locator(".mp-deck.active").screenshot({ path: screenshotPath });

    const report = {
      slideId: slide.id,
      templateId: slide.templateId,
      htmlScreenshot: screenshotPath
    };

    if (!metrics?.hasContent) {
      report.safeArea = { ok: false, reason: "No measurable content boxes found." };
      results.push(report);
      continue;
    }

    const minInset = Math.min(metrics.insets.top, metrics.insets.left, metrics.insets.right, metrics.insets.bottom);
    report.safeArea = {
      ok: minInset >= minSafeInset,
      minInset,
      insets: metrics.insets
    };

    const spec = getTemplate(slide.templateId);
    if (compareSvg && spec?.svgRef) {
      const svgPath = path.resolve(spec.svgRef);
      const svgPngPath = path.join(slideDir, `${slide.id}.${slide.templateId || "unknown"}.svg.png`);
      const diffPath = path.join(slideDir, `${slide.id}.${slide.templateId || "unknown"}.diff.png`);
      const comparePath = path.join(slideDir, `${slide.id}.${slide.templateId || "unknown"}.compare.png`);

      const htmlImage = await loadRgbaImage(screenshotPath);
      const svgImage = await renderSvgToRgba(svgPath, htmlImage.width, htmlImage.height, svgPngPath);
      const diff = await compareImages(htmlImage, svgImage, diffPath);
      await composeTriptych(screenshotPath, svgPngPath, diffPath, comparePath, htmlImage.width, htmlImage.height);

      report.svgComparison = {
        ok: diff.ratio <= maxSvgDiff,
        ratio: diff.ratio,
        diffPixels: diff.diffPixels,
        threshold: maxSvgDiff,
        svgPath,
        svgPngPath,
        diffPath,
        comparePath
      };
    } else if (baselineDir) {
      const baselinePath = path.join(baselineDir, `${slide.id}.${slide.templateId || "unknown"}.png`);
      const diffPath = path.join(slideDir, `${slide.id}.${slide.templateId || "unknown"}.baseline.diff.png`);
      const comparePath = path.join(slideDir, `${slide.id}.${slide.templateId || "unknown"}.baseline.compare.png`);

      try {
        await fs.access(baselinePath);
        const htmlImage = await loadRgbaImage(screenshotPath);
        const baselineImage = await loadRgbaImage(baselinePath, htmlImage.width, htmlImage.height);
        const diff = await compareImages(htmlImage, baselineImage, diffPath);
        await composeTriptych(screenshotPath, baselinePath, diffPath, comparePath, htmlImage.width, htmlImage.height);
        report.baselineComparison = {
          ok: diff.ratio <= maxSvgDiff,
          ratio: diff.ratio,
          diffPixels: diff.diffPixels,
          threshold: maxSvgDiff,
          baselinePath,
          diffPath,
          comparePath
        };
      } catch {
        if (writeBaseline) {
          await fs.copyFile(screenshotPath, baselinePath);
          report.baselineComparison = {
            ok: true,
            ratio: 0,
            diffPixels: 0,
            threshold: maxSvgDiff,
            baselinePath,
            note: "baseline written"
          };
        } else {
          report.baselineComparison = {
            ok: false,
            ratio: 1,
            diffPixels: 0,
            threshold: maxSvgDiff,
            baselinePath,
            note: "baseline missing"
          };
        }
      }
    }

    results.push(report);
  }

  await browser.close();

  const summary = summarize(results, { minSafeInset, maxSvgDiff, compareSvg, baselineDir });
  const summaryPath = path.join(slideDir, "visual-summary.json");
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  const reportIndexPath = path.join(slideDir, "index.html");
  await fs.writeFile(reportIndexPath, buildReportIndex({
    sourceHtmlPath: htmlPath,
    sourcePlanPath: planPath,
    deckHtmlCopyPath,
    deckPlanCopyPath,
    summary,
    slideDir
  }), "utf8");

  console.log(`Adaptive visual validation for ${htmlPath}`);
  for (const item of summary.items) {
    console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.slideId}  ${item.message}`);
  }
  console.log(`Summary: ${summary.failures} fail, ${summary.warnings} warn, ${summary.items.length} slides`);
  console.log(`Artifacts: ${slideDir}`);
  console.log(`HTML PPT: ${deckHtmlCopyPath}`);
  console.log(`Report: ${reportIndexPath}`);

  if (summary.failures > 0) {
    process.exitCode = 1;
  }
}

function summarize(results, { minSafeInset, maxSvgDiff, compareSvg, baselineDir }) {
  const items = [];
  let failures = 0;
  let warnings = 0;

  for (const report of results) {
    const messages = [];
    let ok = true;

    if (!report.safeArea?.ok) {
      ok = false;
      failures += 1;
      messages.push(`safe-area<${minSafeInset}px`);
    }

    if (compareSvg && report.svgComparison) {
      if (!report.svgComparison.ok) {
        ok = false;
        failures += 1;
        messages.push(`svg-diff=${formatPct(report.svgComparison.ratio)}>${formatPct(maxSvgDiff)}`);
      }
    } else if (baselineDir && report.baselineComparison) {
      if (!report.baselineComparison.ok) {
        ok = false;
        failures += 1;
        messages.push(`baseline-diff=${formatPct(report.baselineComparison.ratio)}>${formatPct(maxSvgDiff)}`);
      }
    }

    if (!messages.length) {
      messages.push("visual OK");
    }

    items.push({ slideId: report.slideId, ok, message: messages.join("; "), report });
  }

  return { failures, warnings, items, results };
}

function buildReportIndex({ sourceHtmlPath, sourcePlanPath, deckHtmlCopyPath, deckPlanCopyPath, summary, slideDir }) {
  const deckHtmlHref = relativeHref(slideDir, deckHtmlCopyPath);
  const deckPlanHref = deckPlanCopyPath ? relativeHref(slideDir, deckPlanCopyPath) : "";
  const rows = summary.items.map((item) => {
    const report = item.report || {};
    const compare = report.svgComparison?.comparePath || report.baselineComparison?.comparePath || "";
    const htmlShot = report.htmlScreenshot || "";
    const diff = report.svgComparison?.diffPath || report.baselineComparison?.diffPath || "";
    const ref = report.svgComparison?.svgPngPath || report.baselineComparison?.baselinePath || "";
    return `
      <tr>
        <td>${escapeHtml(item.slideId)}</td>
        <td>${escapeHtml(report.templateId || "")}</td>
        <td>${item.ok ? "PASS" : "FAIL"}</td>
        <td>${escapeHtml(item.message)}</td>
        <td>${htmlShot ? `<a href="${escapeHtml(relativeHref(slideDir, htmlShot))}">HTML</a>` : ""}</td>
        <td>${ref ? `<a href="${escapeHtml(relativeHref(slideDir, ref))}">REF</a>` : ""}</td>
        <td>${diff ? `<a href="${escapeHtml(relativeHref(slideDir, diff))}">DIFF</a>` : ""}</td>
        <td>${compare ? `<a href="${escapeHtml(relativeHref(slideDir, compare))}">COMPARE</a>` : ""}</td>
      </tr>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Adaptive Visual Report</title>
  <style>
    :root {
      --ink: #1A1A2E;
      --paper: #FFF8EE;
      --line: rgba(26, 26, 46, 0.12);
      --ok: #00C896;
      --fail: #FF6B4A;
      --chip: #FFF;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px;
      font-family: Arial, "Noto Sans SC", sans-serif;
      color: var(--ink);
      background: var(--paper);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 32px;
    }
    p {
      margin: 0 0 10px;
      line-height: 1.6;
    }
    .meta, .links, .summary {
      background: #fff;
      border: 2px solid var(--ink);
      border-radius: 16px;
      padding: 20px 22px;
      margin-bottom: 18px;
    }
    .links a, table a {
      color: var(--ink);
      font-weight: 700;
    }
    .chip {
      display: inline-block;
      padding: 6px 10px;
      margin-right: 8px;
      border: 2px solid var(--ink);
      border-radius: 999px;
      background: var(--chip);
      font-weight: 700;
    }
    .chip.ok { background: rgba(0, 200, 150, 0.12); }
    .chip.fail { background: rgba(255, 107, 74, 0.12); }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border: 2px solid var(--ink);
      border-radius: 16px;
      overflow: hidden;
    }
    th, td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
      font-size: 14px;
    }
    th {
      background: #f6efe4;
      font-size: 12px;
      letter-spacing: 0.08em;
    }
    tr:last-child td { border-bottom: none; }
  </style>
</head>
<body>
  <h1>Adaptive Visual Report</h1>
  <div class="meta">
    <p><strong>Source HTML:</strong> ${escapeHtml(sourceHtmlPath)}</p>
    ${sourcePlanPath ? `<p><strong>Source Plan:</strong> ${escapeHtml(sourcePlanPath)}</p>` : ""}
    <p><strong>Slides:</strong> ${summary.items.length}</p>
  </div>
  <div class="links">
    <p><a href="${escapeHtml(deckHtmlHref)}">Open HTML PPT</a></p>
    ${deckPlanHref ? `<p><a href="${escapeHtml(deckPlanHref)}">Open deck plan JSON</a></p>` : ""}
    <p><a href="visual-summary.json">Open raw visual summary JSON</a></p>
  </div>
  <div class="summary">
    <span class="chip ${summary.failures ? "fail" : "ok"}">fail: ${summary.failures}</span>
    <span class="chip">warn: ${summary.warnings}</span>
    <span class="chip">slides: ${summary.items.length}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Slide</th>
        <th>Template</th>
        <th>Status</th>
        <th>Message</th>
        <th>HTML</th>
        <th>Ref</th>
        <th>Diff</th>
        <th>Compare</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</body>
</html>`;
}

async function showSlide(page, index) {
  await page.evaluate((i) => {
    if (typeof window.show === "function") {
      window.show(i);
      return;
    }
    const slides = [...document.querySelectorAll(".mp-deck")];
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("active", slideIndex === i);
    });
  }, index);
  await page.waitForTimeout(150);
}

async function renderSvgToRgba(svgPath, width, height, outPath) {
  const svg = await fs.readFile(svgPath);
  const buffer = await sharp(svg).resize(width, height, { fit: "fill" }).png().toBuffer();
  await fs.writeFile(outPath, buffer);
  return loadRgbaImageFromBuffer(buffer, width, height);
}

async function loadRgbaImage(filePath, width, height) {
  const buffer = await fs.readFile(filePath);
  return loadRgbaImageFromBuffer(buffer, width, height);
}

function loadRgbaImageFromBuffer(buffer, width, height) {
  const png = PNG.sync.read(buffer);
  if (width && height && (png.width !== width || png.height !== height)) {
    const resized = sharp(buffer).resize(width, height, { fit: "fill" });
    return resized.png().toBuffer().then((buf) => loadRgbaImageFromBuffer(buf, width, height));
  }
  return { width: png.width, height: png.height, data: png.data, png };
}

async function compareImages(left, right, diffPath) {
  const width = left.width;
  const height = left.height;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(left.data, right.data, diff.data, width, height, {
    threshold: 0.12,
    includeAA: true
  });
  await fs.writeFile(diffPath, PNG.sync.write(diff));
  return { diffPixels, ratio: diffPixels / (width * height) };
}

async function composeTriptych(leftPath, middlePath, rightPath, outPath, width, height) {
  const canvas = sharp({
    create: {
      width: width * 3,
      height,
      channels: 4,
      background: "#FFF8EE"
    }
  });

  await canvas
    .composite([
      { input: await fs.readFile(leftPath), left: 0, top: 0 },
      { input: await fs.readFile(middlePath), left: width, top: 0 },
      { input: await fs.readFile(rightPath), left: width * 2, top: 0 }
    ])
    .png()
    .toFile(outPath);
}

function formatPct(value) {
  return `${(value * 100).toFixed(1)}%`;
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
  console.log("Usage: node scripts/validate-adaptive-visual.js --html <preview.html> [--plan <deck-plan.json>] [--out-dir <dir>] [--baseline-dir <dir>] [--compare-svg true|false] [--write-baseline true] [--max-svg-diff 0.14] [--min-safe-inset 20]");
}

function toFileUrl(filePath) {
  return `file://${filePath}`;
}

function loadPackage(name) {
  try {
    return require(name);
  } catch {
    return require(path.join(nodeModulesPath, name));
  }
}

function loadPixelmatch() {
  const mod = loadPackage("pixelmatch");
  return typeof mod === "function" ? mod : mod.default;
}

function resolveOptionalPlan(planArg, htmlPath) {
  if (planArg) {
    return path.resolve(planArg);
  }

  const sibling = htmlPath.replace(/\.html$/i, ".plan.json");
  try {
    require("node:fs").accessSync(sibling);
    return sibling;
  } catch {
    return "";
  }
}

function relativeHref(fromDir, targetPath) {
  return path.relative(fromDir, targetPath).split(path.sep).join("/");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
