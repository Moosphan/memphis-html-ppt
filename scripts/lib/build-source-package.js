import fs from "node:fs";
import path from "node:path";

import { cleanSourceMarkdown } from "./clean-source-markdown.js";

const COMMAND_WORDS = /^(?:[$>]\s*)?(?:npm|pnpm|yarn|node|git|curl|uv|pip|python|bash|sh|docker|juejin|cargo|go|make|npx|bun|deno)\b/i;
const CODE_LANG_HINTS = new Set([
  "bash", "shell", "sh", "zsh", "powershell", "ps1", "cmd",
  "json", "yaml", "yml", "toml", "ini", "env", "xml", "html", "md", "markdown"
]);

export function buildSourcePackage(input, options = {}) {
  const title = String(options.title || "").trim();
  const sourceUrl = String(options.sourceUrl || "").trim();
  const externalHeroImage = normalizeExternalHeroImage(options.heroImage);
  const cleaned = options.alreadyCleaned
    ? { markdown: String(input || ""), report: options.cleaningReport || null }
    : cleanSourceMarkdown(input, { title, sourceUrl });

  const markdown = cleaned.markdown;
  const sections = parseMarkdownSections(markdown);
  const enrichedSections = sections.map((section, index) => enrichSection(section, index));
  const codeAssets = enrichedSections.flatMap((section) => section.codeAssets || []).map((item, index) => ({
    ...item,
    id: item.id || `code-${String(index + 1).padStart(2, "0")}`
  }));
  const imageAssets = enrichedSections
    .flatMap((section) => section.images || [])
    .map((image) => resolveImageAsset(image, sourceUrl))
    .map((image, index) => ({
      ...image,
      id: image.id || `image-${String(index + 1).padStart(2, "0")}`
    }));
  const metrics = uniqueValues(enrichedSections.flatMap((section) => section.metrics || []));
  const commands = uniqueValues(codeAssets.flatMap((asset) => asset.commands || []));
  const sectionTitles = enrichedSections.map((section) => section.title).filter(Boolean);
  const topSectionTitles = enrichedSections
    .filter((section) => section.importance >= 0.6)
    .map((section) => section.title)
    .filter(Boolean)
    .slice(0, 8);
  const codeKindCounts = codeAssets.reduce((acc, asset) => {
    acc[asset.kind] = (acc[asset.kind] || 0) + 1;
    return acc;
  }, {});

  const totalWords = markdown.split(/\s+/).filter(Boolean).length;
  const signalCount = enrichedSections.reduce((sum, section) => sum + (section.intentHints?.length || 0), 0);

  return {
    title: title || enrichedSections[0]?.title || "Presentation",
    sourceUrl,
    cleanedMarkdown: markdown,
    markdownLength: markdown.length,
    wordCount: totalWords,
    sectionCount: enrichedSections.length,
    codeAssetCount: codeAssets.length,
    cleaningReport: cleaned.report || null,
    signals: {
      sectionSignals: signalCount,
      strongSectionCount: enrichedSections.filter((section) => section.importance >= 0.7).length
    },
    topSectionTitles,
    sectionTitles,
    metrics,
    commands,
    codeKindCounts,
    imageAssets: pickHeroImage(imageAssets)
      ? imageAssets
      : externalHeroImage
        ? [externalHeroImage, ...imageAssets]
        : imageAssets,
    heroImage: pickHeroImage(imageAssets) || externalHeroImage,
    sections: enrichedSections,
    codeAssets,
    generatedAt: new Date().toISOString()
  };
}

function enrichSection(section, index) {
  const text = [...section.paragraphs, ...section.bullets, ...section.codeBlocks.map((block) => block.text)].join(" ").trim();
  const metrics = extractMetricCandidatesFromText(text);
  const codeAssets = section.codeBlocks.map((block, blockIndex) => classifyCodeAsset(block, section, index, blockIndex));
  const commandSamples = uniqueValues(codeAssets.flatMap((asset) => asset.commands || []));
  const codeKinds = codeAssets.map((asset) => asset.kind);
  const images = (section.images || []).map((image, imageIndex) => ({
    ...image,
    id: image.id || `image-${String(index + 1).padStart(2, "0")}-${String(imageIndex + 1).padStart(2, "0")}`
  }));

  return {
    ...section,
    index,
    text,
    importance: scoreSection(section, text, codeAssets),
    intentHints: inferIntentHints(section, text, codeAssets),
    coreClaim: deriveCoreClaim(section, text),
    supportingPoints: deriveSupportingPoints(section),
    metrics: metrics.slice(0, 5),
    commandSamples,
    codeKinds,
    images,
    codeAssets,
    noiseFlags: detectNoiseFlags(text)
  };
}

function parseMarkdownSections(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const sections = [];
  let current = null;
  let paragraphBuffer = [];
  let listBuffer = [];
  let inCode = false;
  let codeLang = "";
  let codeBuffer = [];

  const ensureSection = () => {
    if (!current) {
      current = {
        title: "导语",
        level: 2,
        paragraphs: [],
        bullets: [],
        codeBlocks: [],
        images: []
      };
    }
  };

  const flushParagraph = () => {
    const text = normalizeInline(paragraphBuffer.join(" ").trim());
    paragraphBuffer = [];
    if (!text) return;
    ensureSection();
    current.paragraphs.push(text);
  };

  const flushList = () => {
    const items = listBuffer.map((item) => normalizeInline(item)).filter(Boolean);
    listBuffer = [];
    if (!items.length) return;
    ensureSection();
    current.bullets.push(...items);
  };

  const flushCode = () => {
    const text = codeBuffer.join("\n").replace(/\s+$/, "");
    codeBuffer = [];
    if (!text.trim()) return;
    ensureSection();
    current.codeBlocks.push({
      lang: codeLang,
      text,
      lineCount: text.split("\n").length
    });
  };

  const pushCurrent = () => {
    if (current && (current.paragraphs.length || current.bullets.length || current.codeBlocks.length)) {
      sections.push(current);
    }
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    const fenceMatch = line.match(/^```([\w-]*)\s*$/);
    if (fenceMatch) {
      flushParagraph();
      flushList();
      if (inCode) {
        flushCode();
        inCode = false;
        codeLang = "";
      } else {
        inCode = true;
        codeLang = fenceMatch[1] || "";
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      pushCurrent();
      current = {
        title: normalizeInline(headingMatch[2]),
        level: headingMatch[1].length,
        paragraphs: [],
        bullets: [],
        codeBlocks: [],
        images: []
      };
      continue;
    }

    const imageMatch = parseMarkdownImage(line.trim());
    if (imageMatch) {
      flushParagraph();
      flushList();
      ensureSection();
      current.images.push(imageMatch);
      continue;
    }

    const bulletMatch = line.match(/^[-*+]\s+(.*)$/) || line.match(/^\d+[.)]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      listBuffer.push(bulletMatch[1]);
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushList();
      paragraphBuffer.push(line.replace(/^>\s?/, ""));
      continue;
    }

    paragraphBuffer.push(line.trim());
  }

  flushParagraph();
  flushList();
  if (inCode) {
    flushCode();
  }
  pushCurrent();

  return sections;
}

function classifyCodeAsset(block, section, sectionIndex, blockIndex) {
  const raw = String(block.text || "");
  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  const lang = String(block.lang || "").toLowerCase();
  const commandCount = countCommandishLines(lines);
  const kvCount = lines.filter((line) => /^[\w.-]+\s*[:=]\s*.+$/.test(line)).length;
  const hasStructuralSyntax = /(?:function|class|const|let|var|import|export|return|=>|def |if \(|for \(|while \(|try|catch)/.test(raw);
  const isCommandLike = commandCount >= Math.max(1, Math.ceil(lines.length / 2)) || isCommandLanguage(lang);
  const isConfigLike = isConfigLanguage(lang) || kvCount >= Math.max(2, Math.ceil(lines.length / 2));
  const kind = isCommandLike
    ? "command-sequence"
    : isConfigLike
      ? "config-snippet"
      : hasStructuralSyntax
        ? "implementation-detail"
        : /^(?:https?:\/\/|curl\b|fetch\b|axios\b)/i.test(raw)
          ? "api-example"
          : "conceptual-structure";

  return {
    id: `code-${String(sectionIndex + 1).padStart(2, "0")}-${String(blockIndex + 1).padStart(2, "0")}`,
    kind,
    lang,
    lineCount: lines.length,
    importance: scoreCodeAsset(kind, lines.length, section),
    showRaw: kind === "command-sequence" || (kind === "config-snippet" && lines.length <= 10) || (kind === "api-example" && lines.length <= 8),
    preferredPresentation: preferredPresentationForCode(kind, section),
    summary: summarizeCodeAsset(kind, raw, section),
    commands: kind === "command-sequence" ? extractCommands(lines) : [],
    keys: kind === "config-snippet" ? extractKeys(lines) : [],
    raw
  };
}

function scoreSection(section, text, codeAssets) {
  let score = 0.2;
  if (section.level <= 2) score += 0.18;
  if (section.bullets.length >= 3) score += 0.12;
  if (section.paragraphs.length >= 2) score += 0.12;
  if (section.codeBlocks.length) score += 0.12;
  if (extractMetricCandidatesFromText(text).length) score += 0.12;
  if (codeAssets.some((asset) => asset.kind === "command-sequence")) score += 0.14;
  if (section.title && /结论|总结|关键|重点|建议|流程|步骤|风险|注意|对比|比较|命令|代码|配置|架构|层|阶段|指标/i.test(section.title)) {
    score += 0.12;
  }
  return Math.max(0.05, Math.min(0.99, score));
}

function scoreCodeAsset(kind, lineCount, section) {
  let score = 0.45;
  if (kind === "command-sequence") score += 0.28;
  if (kind === "config-snippet") score += 0.18;
  if (kind === "api-example") score += 0.12;
  if (kind === "implementation-detail") score -= 0.08;
  if (lineCount <= 6) score += 0.06;
  if (section.level <= 2) score += 0.04;
  return Math.max(0.05, Math.min(0.99, score));
}

function inferIntentHints(section, text, codeAssets) {
  const hints = [];
  const title = section.title || "";
  const joined = `${title} ${text}`;

  if (hasStrongCompareSignal(section, joined)) hints.push("compare-dual");
  if (/流程|步骤|阶段|process|workflow|roadmap|路径/i.test(joined) || section.codeBlocks.length > 0 && codeAssets.some((asset) => asset.kind === "command-sequence")) hints.push("process-lane");
  if (/风险|注意|警告|warning|caution/i.test(joined)) hints.push("warning-callout");
  if (/时间线|timeline|演进|发展|迭代/i.test(joined)) hints.push("horizontal-timeline");
  if (/层|架构|stack|layer|模块|分层|pipeline/i.test(joined)) hints.push("layer-stack");
  if (/指标|数据|metric|增长|比例|效率|rate|百分比|提升/i.test(joined) || extractMetricCandidatesFromText(joined).length >= 2) hints.push("metric-board");
  if (/原则|要点|核心|清单|checklist|核对/i.test(joined) && section.bullets.length >= 3) hints.push("bullet-grid");
  if (/faq|问答|question|answer|常见问题/i.test(joined)) hints.push("faq-panel");
  if (/命令|终端|cli|shell|脚本入口|运行命令/i.test(joined) || codeAssets.some((asset) => asset.kind === "command-sequence")) hints.push("command-board");
  if (/结尾|总结|wrap|closing|收束|下一步/i.test(joined)) hints.push("closing-card");

  return [...new Set(hints)];
}

function deriveCoreClaim(section, text) {
  if (section.paragraphs[0]) {
    return truncateSentence(section.paragraphs[0], 180);
  }
  if (section.bullets[0]) {
    return truncateSentence(section.bullets[0], 180);
  }
  if (section.codeBlocks[0]) {
    return summarizeCodeAsset(classifyCodeAsset(section.codeBlocks[0], section, 0, 0).kind, section.codeBlocks[0].text, section);
  }
  return truncateSentence(text, 180);
}

function deriveSupportingPoints(section) {
  const bullets = section.bullets.slice(0, 5).map((item) => truncateSentence(item, 240));
  if (bullets.length) {
    return bullets;
  }
  return section.paragraphs.slice(1, 4).map((item) => truncateSentence(item, 240));
}

function detectNoiseFlags(text) {
  const flags = [];
  if (/点赞|收藏|评论|关注|分享|相关推荐|相关文章|广告|推广|本文作者|阅读原文/i.test(text)) {
    flags.push("platform-noise");
  }
  if (/\b(欢迎|本文|我们)\b.*\b(公众号|关注|转发)\b/i.test(text)) {
    flags.push("cta-noise");
  }
  return flags;
}

function summarizeCodeAsset(kind, raw, section) {
  const cleaned = normalizeInline(raw);
  if (kind === "command-sequence") {
    const commands = extractCommands(cleaned.split("\n"));
    return commands.slice(0, 4).join(" · ") || truncateSentence(cleaned, 120);
  }
  if (kind === "config-snippet") {
    const keys = extractKeys(cleaned.split("\n"));
    return keys.slice(0, 4).join(" · ") || truncateSentence(cleaned, 120);
  }
  if (kind === "api-example") {
    return truncateSentence(cleaned, 120);
  }
  if (kind === "conceptual-structure") {
    return `Structure around ${section.title || "the current topic"}`;
  }
  return truncateSentence(cleaned, 120);
}

function preferredPresentationForCode(kind, section) {
  if (kind === "command-sequence") return "command-board";
  if (kind === "config-snippet") return "data-table";
  if (kind === "api-example") return "narrative-split";
  if (kind === "conceptual-structure") {
    return /层|stack|架构|分层|pipeline/i.test(section.title || "") ? "layer-stack" : "hierarchy-tree";
  }
  return "bullet-grid";
}

function extractCommands(lines) {
  const commands = [];
  let current = "";

  for (const rawLine of lines || []) {
    const line = String(rawLine || "").trim();
    if (!line) continue;

    if (isCommandStart(line)) {
      if (current) commands.push(normalizeCommandSnippet(current));
      current = line.replace(/^[$>]\s*/, "");
      continue;
    }

    if (current && isCommandContinuation(line)) {
      current = `${current.replace(/\\\s*$/, "").trim()} ${line.replace(/\\\s*$/, "").trim()}`.trim();
      continue;
    }

    if (current) {
      commands.push(normalizeCommandSnippet(current));
      current = "";
    }
  }

  if (current) {
    commands.push(normalizeCommandSnippet(current));
  }

  return uniqueValues(commands).slice(0, 8);
}

function extractKeys(lines) {
  return (lines || [])
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^["']?([\w.-]+)["']?\s*[:=]/);
      return match?.[1] || "";
    })
    .filter(Boolean)
    .slice(0, 10);
}

function isCommandLanguage(lang) {
  return ["bash", "shell", "sh", "zsh", "powershell", "ps1", "cmd", "terminal"].includes(lang);
}

function isConfigLanguage(lang) {
  return CODE_LANG_HINTS.has(lang);
}

function extractMetricCandidatesFromText(text) {
  return [...String(text || "").matchAll(/\b\d+(?:\.\d+)?(?:%|x|倍|万|亿|k|K|m|M)?\b/g)]
    .map((match) => match[0])
    .filter(isMeaningfulMetricToken);
}

function isMeaningfulMetricToken(token) {
  const value = String(token || "").trim();
  if (!value) return false;
  if (/%|x|倍|万|亿|k|K|m|M/.test(value)) return true;

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return false;

  return numeric >= 10;
}

function normalizeInline(text) {
  return String(text || "")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateSentence(text, maxChars) {
  const value = normalizeInline(text);
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function uniqueValues(values) {
  return [...new Set((values || []).map((item) => String(item || "").trim()).filter(Boolean))];
}

function parseMarkdownImage(line) {
  const match = line.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
  if (!match) return null;
  return {
    alt: match[1] || "",
    src: match[2] || "",
    title: match[3] || ""
  };
}

function hasStrongCompareSignal(section, joined) {
  const title = section.title || "";
  const bulletText = (section.bullets || []).join(" ");
  if (hasExplicitComparePhrase(title)) {
    return true;
  }
  if (/\b(before|after|vs|versus)\b/i.test(joined)) {
    return true;
  }
  return hasExplicitComparePhrase(joined) ||
    /(?:比较|对比).{0,12}(?:与|和|vs|versus|前后|新旧|旧版|新版)/i.test(joined) ||
    /^(?:before|after)[:：]/imu.test(bulletText);
}

function countCommandishLines(lines) {
  let count = 0;
  let activeCommand = false;

  for (const rawLine of lines || []) {
    const line = String(rawLine || "").trim();
    if (!line) continue;

    if (isCommandStart(line)) {
      activeCommand = true;
      count += 1;
      continue;
    }

    if (activeCommand && isCommandContinuation(line)) {
      count += 1;
      continue;
    }

    activeCommand = false;
  }

  return count;
}

function isCommandStart(line) {
  return COMMAND_WORDS.test(line) || /^[$>]\s*/.test(line);
}

function isCommandContinuation(line) {
  return /^\\$/.test(line) ||
    /^--[\w-]+(?:\s+.+)?$/.test(line) ||
    /^-[A-Za-z](?:\s+.+)?$/.test(line) ||
    /^https?:\/\//i.test(line) ||
    /^(?:\.{1,2}\/|~\/|\/)?[\w.-]+(?:\/[\w.-]+)+(?:\s+.+)?$/.test(line);
}

function normalizeCommandSnippet(command) {
  return String(command || "")
    .replace(/\s*\\\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasExplicitComparePhrase(text) {
  return /(?:对比|对照|前后|优缺点|利弊|迁移前|迁移后|旧方案|新方案|旧方式|新方式|before\s*\/?\s*after|\bvs\b|versus|a\/b)/i.test(String(text || ""));
}

function pickHeroImage(imageAssets) {
  return (imageAssets || []).find(isMeaningfulHeroImage) || null;
}

function isMeaningfulHeroImage(image) {
  const alt = `${image?.alt || ""} ${image?.title || ""}`.toLowerCase();
  const src = `${image?.src || ""}`.toLowerCase();
  if (!src || src.startsWith("data:")) return false;
  if (/avatar|logo|badge|等级|lv\.?|icon|qr|二维码/.test(alt)) return false;
  if (/avatar|badge|icon/.test(src)) return false;
  return true;
}

function resolveImageAsset(image, sourceUrl) {
  const src = String(image?.src || "").trim();
  if (!src) return { ...image, resolvedSrc: "" };

  if (/^https?:\/\//i.test(src) || src.startsWith("data:")) {
    return { ...image, resolvedSrc: src, isRemote: /^https?:\/\//i.test(src) };
  }

  if (/^https?:\/\//i.test(sourceUrl || "")) {
    try {
      return { ...image, resolvedSrc: new URL(src, sourceUrl).toString(), isRemote: true };
    } catch {
      return { ...image, resolvedSrc: src, isRemote: false };
    }
  }

  const basePath = String(sourceUrl || "").startsWith("file://")
    ? new URL(sourceUrl).pathname
    : sourceUrl;
  const absolutePath = basePath ? path.resolve(path.dirname(basePath), src) : path.resolve(src);
  const exists = fs.existsSync(absolutePath);
  return {
    ...image,
    resolvedSrc: exists ? absolutePath : src,
    absolutePath,
    exists,
    isRemote: false
  };
}

function normalizeExternalHeroImage(image) {
  const src = String(image?.resolvedSrc || image?.src || "").trim();
  if (!src) return null;
  return {
    ...image,
    src,
    resolvedSrc: src,
    isRemote: /^https?:\/\//i.test(src)
  };
}
