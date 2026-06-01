import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { renderDeck } from "./lib/render-adaptive.js";
import { buildAdaptiveDeckPlan } from "./lib/adaptive-deck-planner.js";
import { buildSourcePackage } from "./lib/build-source-package.js";
import { extractUrlToSourceMarkdown } from "./lib/url-to-ppt-markdown.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.output) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  await loadOptionalEnv();

  const source = await loadSourceMaterial(args.input);
  const sourcePackage = buildSourcePackage(source.rawMarkdown, {
    title: source.title,
    sourceUrl: source.sourceUrl,
    heroImage: source.heroImage
  });
  const deckPlan = await buildAdaptiveDeckPlan({
    ...source,
    rawMarkdown: sourcePackage.cleanedMarkdown,
    sourcePackage,
    maxTemplateShare: args["max-template-share"]
  });
  const html = renderDeck(deckPlan);

  const outputPath = path.resolve(args.output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html, "utf8");

  const planOutput = path.resolve(args["plan-output"] || deriveSiblingPath(outputPath, ".plan.json"));
  await fs.writeFile(planOutput, JSON.stringify(deckPlan, null, 2), "utf8");

  const sourcePackageOutput = path.resolve(args["source-package-output"] || deriveSiblingPath(outputPath, ".source-package.json"));
  await fs.writeFile(sourcePackageOutput, JSON.stringify(sourcePackage, null, 2), "utf8");

  if (args["source-output"]) {
    const sourceOutput = path.resolve(args["source-output"]);
    await fs.mkdir(path.dirname(sourceOutput), { recursive: true });
    await fs.writeFile(sourceOutput, sourcePackage.cleanedMarkdown, "utf8");
  }

  console.log(`Generated adaptive preview: ${outputPath}`);
  console.log(`Generated deck plan JSON: ${planOutput}`);
  console.log(`Generated source package JSON: ${sourcePackageOutput}`);
  if (args["source-output"]) {
    console.log(`Generated cleaned source markdown: ${path.resolve(args["source-output"])}`);
  }
  console.log(`Slides planned: ${deckPlan.slides.length}`);
}

async function loadSourceMaterial(input) {
  if (isHttpUrl(input)) {
    const extracted = await extractUrlToSourceMarkdown(input);
    if (!extracted) {
      throw new Error(`Unable to extract source markdown from URL: ${input}`);
    }
    return extracted;
  }

  const resolved = path.resolve(input);
  const markdown = await fs.readFile(resolved, "utf8");
  return {
    title: extractTitleFromMarkdown(markdown) || path.basename(resolved, path.extname(resolved)) || "Presentation",
    sourceUrl: resolved,
    rawMarkdown: markdown
  };
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
  console.log("Usage: node scripts/generate-adaptive-preview.js --input <url-or-markdown-file> --output <html-file> [--plan-output <deck-plan.json>] [--source-output <clean.md>] [--source-package-output <source-package.json>] [--max-template-share 0.25]");
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value || "");
}

function extractTitleFromMarkdown(markdown) {
  const match = String(markdown || "").match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || "";
}

function deriveSiblingPath(filePath, suffix) {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  return path.join(dir, `${base}${suffix}`);
}

function parseDotEnv(content) {
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

async function loadOptionalEnv() {
  const envPath = path.join(process.env.HOME || "", ".baoyu-skills", ".env");
  try {
    const content = await fs.readFile(envPath, "utf8");
    const env = parseDotEnv(content);
    for (const [key, value] of Object.entries(env)) {
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Optional local env file; ignore when absent.
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
