import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini";

export async function extractUrlToPptMarkdown(input, options = {}) {
  const source = await extractUrlToSourceMarkdown(input);
  if (!source) {
    return null;
  }

  const paginatedMarkdown = options.useAi === false
    ? buildPaginatedPptMarkdown({ title: source.title, rawMarkdown: source.rawMarkdown, sourceUrl: source.sourceUrl })
    : await rewriteMarkdownToPpt({
        title: source.title,
        markdown: source.rawMarkdown,
        sourceUrl: source.sourceUrl
      });

  return {
    ...source,
    paginatedMarkdown
  };
}

export async function extractUrlToSourceMarkdown(input) {
  if (!isHttpUrl(input)) {
    return null;
  }

  const downloaded = await downloadRemoteSource(input);
  const markitdownMarkdown = await convertWithMarkItDown(downloaded);
  const rawMarkdown = cleanMarkItDownMarkdown(markitdownMarkdown);
  const title = extractPrimaryTitle(rawMarkdown) || inferTitleFromUrl(downloaded.finalUrl || input);
  const heroImage = extractHeroImageFromHtml(downloaded.htmlText || "", downloaded.finalUrl || input);

  return {
    title,
    sourceUrl: downloaded.finalUrl || input,
    rawMarkdown,
    heroImage
  };
}

async function downloadRemoteSource(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "";
  const htmlText = contentType.includes("html") ? bytes.toString("utf8") : "";

  return {
    bytes,
    contentType,
    finalUrl: response.url || url,
    htmlText
  };
}

async function convertWithMarkItDown({ bytes, contentType, finalUrl }) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "memphis-markitdown-"));
  const extension = inferFileExtension(finalUrl, contentType);
  const tempFile = path.join(tempDir, `source${extension}`);

  try {
    await fs.writeFile(tempFile, bytes);
    const { stdout, stderr } = await execFile("uv", [
      "run",
      "--with",
      "markitdown[all]",
      "markitdown",
      tempFile
    ], {
      maxBuffer: 24 * 1024 * 1024
    });

    const output = `${stdout || ""}`.trim();
    if (!output) {
      throw new Error(stderr || "MarkItDown returned empty output.");
    }
    return output;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function rewriteMarkdownToPpt({ title, markdown, sourceUrl }) {
  const fallback = buildPaginatedPptMarkdown({ title, rawMarkdown: markdown, sourceUrl });
  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  const systemPrompt = [
    "You convert webpage markdown into PPT-ready slide markdown.",
    "Your job has two parts:",
    "1. Remove website chrome such as navigation, login buttons, related links, comments, footer noise, repeated author badges, and non-article clutter.",
    "2. Reorganize the article into slide-friendly markdown for HTML/PPT rendering.",
    "",
    "Output rules:",
    "- Return markdown only.",
    "- Use one cover slide starting with a single '# ' title.",
    "- Separate every slide with '---'.",
    "- Use '## ' headings for content slides.",
    "- Keep each slide focused: 1 core idea, 1-2 short paragraphs, or 1-5 bullets.",
    "- If a section is too long, split it into '## 标题（续）'.",
    "- Preserve facts and intent from the source. Do not invent new content.",
    "- When code is long, summarize it into bullets instead of dumping large code blocks.",
    "- Keep concise quotes or commands only when they are important to understanding."
  ].join("\n");

  const userPrompt = [
    `Source URL: ${sourceUrl}`,
    `Preferred title: ${title}`,
    "",
    "Please clean and restructure the following raw markdown into PPT-ready paginated markdown:",
    "",
    "```markdown",
    markdown,
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
        model: process.env.OPENAI_TEXT_MODEL || OPENAI_MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const aiMarkdown = Array.isArray(content)
      ? content.map((item) => item?.text || "").join("")
      : `${content || ""}`.trim();

    if (!aiMarkdown) {
      return fallback;
    }

    return normalizeAiMarkdown(aiMarkdown, title, sourceUrl);
  } catch {
    return fallback;
  }
}

function normalizeAiMarkdown(markdown, title, sourceUrl) {
  let next = `${markdown || ""}`.trim();

  if (!/^#\s+/m.test(next)) {
    next = [`# ${title}`, "", `> Source: ${sourceUrl}`, "", next].join("\n");
  }

  if (!/\n---\n/.test(next)) {
    next = next.replace(/\n(?=##\s+)/g, "\n\n---\n\n");
  }

  return next.replace(/\n{4,}/g, "\n\n\n").trim();
}

function cleanMarkItDownMarkdown(markdown) {
  let next = `${markdown || ""}`.replace(/\r\n/g, "\n").trim();
  if (!next) {
    return next;
  }

  const lines = next.split("\n");
  const firstHeadingIndex = lines.findIndex((line) => /^#\s+\S/.test(line.trim()));
  if (firstHeadingIndex > 0) {
    next = lines.slice(firstHeadingIndex).join("\n").trim();
  }

  next = stripTitleMetadata(next);
  next = trimTrailingChrome(next);
  next = next.replace(/\n{4,}/g, "\n\n\n");

  return next.trim();
}

function stripTitleMetadata(markdown) {
  const lines = markdown.split("\n");
  const titleIndex = lines.findIndex((line) => /^#\s+\S/.test(line.trim()));
  if (titleIndex === -1) {
    return markdown;
  }

  const prefix = lines.slice(0, titleIndex + 1);
  const suffix = lines.slice(titleIndex + 1);
  let contentStart = 0;

  while (contentStart < suffix.length) {
    const current = suffix[contentStart]?.trim() || "";
    if (!current) {
      contentStart += 1;
      continue;
    }

    if (isLikelyMetadataLine(current) || isStandaloneImageLine(current)) {
      contentStart += 1;
      continue;
    }

    break;
  }

  return [...prefix, "", ...suffix.slice(contentStart)].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function trimTrailingChrome(markdown) {
  const lines = markdown.split("\n");
  const stopPatterns = [
    /^##\s*(评论|相关推荐|相关文章|更多推荐|延伸阅读|热门评论)\s*$/u,
    /^\*\s*\[.*\]\(\/user\/.*\)\s*$/u
  ];

  for (let index = 5; index < lines.length; index += 1) {
    const current = lines[index].trim();
    if (stopPatterns.some((pattern) => pattern.test(current))) {
      return lines.slice(0, index).join("\n").trim();
    }
  }

  return markdown;
}

function isLikelyMetadataLine(line) {
  return (
    /^\[.*\]\(\/user\/.*\)$/.test(line) ||
    /^\d{4}-\d{2}-\d{2}$/.test(line) ||
    /^\d+$/.test(line) ||
    /^(阅读|点赞|收藏|评论)\d+/.test(line) ||
    /^(原创|专栏|已于.+编辑)$/.test(line)
  );
}

function isStandaloneImageLine(line) {
  return /^!\[[^\]]*]\([^)]+\)$/.test(line);
}

function extractPrimaryTitle(markdown) {
  const match = `${markdown || ""}`.match(/^#\s+(.+)$/m);
  return cleanupInlineText(match?.[1] || "");
}

function inferTitleFromUrl(value) {
  try {
    const url = new URL(value);
    return cleanupInlineText(url.hostname.replace(/^www\./, ""));
  } catch {
    return "Presentation";
  }
}

function inferFileExtension(sourceUrl, contentType) {
  const pathname = safePathname(sourceUrl).toLowerCase();
  const ext = path.extname(pathname);
  if (ext) {
    return ext;
  }

  if (contentType.includes("html")) return ".html";
  if (contentType.includes("pdf")) return ".pdf";
  if (contentType.includes("markdown")) return ".md";
  if (contentType.includes("json")) return ".json";
  if (contentType.includes("xml")) return ".xml";
  if (contentType.includes("plain")) return ".txt";
  return ".html";
}

function extractHeroImageFromHtml(html, baseUrl) {
  const text = String(html || "");
  if (!text) return null;

  const articleImage = extractFirstMeaningfulArticleImage(text, baseUrl);
  if (articleImage) {
    return articleImage;
  }

  const candidates = [
    text.match(/<meta[^>]+property=["']og:image(?:url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1],
    text.match(/<meta[^>]+name=["']twitter:image(?:url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1],
    text.match(/<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1]
  ].filter(Boolean);

  for (const candidate of candidates) {
    const resolved = resolveUrl(candidate, baseUrl);
    if (resolved) {
      return {
        src: resolved,
        resolvedSrc: resolved,
        alt: "Article cover",
        title: "Article cover",
        kind: "hero-image"
      };
    }
  }

  return null;
}

function extractFirstMeaningfulArticleImage(html, baseUrl) {
  const segments = extractArticleHtmlSegments(html);
  const candidates = segments.flatMap((segment, segmentIndex) => extractImagesFromSegment(segment, baseUrl, segmentIndex));
  const ranked = candidates
    .filter((item) => isLikelyContentImage(item))
    .sort((left, right) => right.score - left.score || left.order - right.order);

  const winner = ranked[0];
  if (!winner?.resolvedSrc) return null;

  return {
    src: winner.resolvedSrc,
    resolvedSrc: winner.resolvedSrc,
    alt: winner.alt || "Article cover",
    title: winner.alt || "Article cover",
    kind: "hero-image"
  };
}

function extractArticleHtmlSegments(html) {
  const source = String(html || "");
  const segments = [];
  const seen = new Set();
  const patterns = [
    /<article\b[\s\S]*?<\/article>/gi,
    /<(main|section|div)\b[^>]*(?:id|class)=["'][^"']*(?:article|post|entry|content|markdown|rich-text|richtext|body)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const block = match[0];
      if (!block || seen.has(block)) continue;
      seen.add(block);
      segments.push(block);
    }
  }

  if (!segments.length) {
    segments.push(source);
  }

  return segments;
}

function extractImagesFromSegment(segmentHtml, baseUrl, segmentIndex) {
  const source = String(segmentHtml || "");
  const matches = [...source.matchAll(/<img\b[^>]*>/gi)];

  return matches.map((match, index) => {
    const tag = match[0] || "";
    const attrs = parseImageAttributes(tag);
    const resolvedSrc = resolveUrl(attrs.src || attrs["data-src"] || attrs["data-original"] || attrs["data-lazy-src"] || "", baseUrl);
    const context = source.slice(Math.max(0, match.index - 220), Math.min(source.length, match.index + tag.length + 220));
    return {
      src: attrs.src || "",
      resolvedSrc,
      alt: cleanupInlineText(attrs.alt || attrs.title || ""),
      className: attrs.class || "",
      width: Number(attrs.width || 0) || 0,
      height: Number(attrs.height || 0) || 0,
      context,
      order: segmentIndex * 1000 + index,
      score: scoreContentImageCandidate({ attrs, resolvedSrc, context, order: index })
    };
  });
}

function parseImageAttributes(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)) {
    attrs[match[1]] = decodeHtmlEntities(match[2]);
  }
  return attrs;
}

function scoreContentImageCandidate({ attrs, resolvedSrc, context, order }) {
  const src = String(resolvedSrc || attrs.src || "").trim();
  const alt = cleanupInlineText(attrs.alt || attrs.title || "");
  const className = String(attrs.class || "");
  const joined = `${src} ${alt} ${className} ${context}`.toLowerCase();
  let score = 0;

  if (!src) return -1000;
  if (/^data:image\//i.test(src)) return -1000;
  if (/\.svg(?:$|\?)/i.test(src)) score -= 120;
  if (/\b(?:logo|avatar|icon|favicon|badge|emoji|sprite|qr|banner-ad|ad-|advert)\b/i.test(joined)) score -= 220;
  if (/\b(?:cover|header|hero)\b/i.test(alt)) score += 80;
  if (/<p>\s*<img\b/i.test(context)) score += 120;
  if (/<figure\b[\s\S]*?<img\b/i.test(context)) score += 100;
  if (/\b(?:article|post|entry|content|markdown|rich-text|richtext)\b/i.test(context)) score += 70;
  if (/\b(?:logo-img|avatar-img|user-avatar)\b/i.test(className)) score -= 200;
  if (/\.(?:png|jpe?g|webp|gif)(?:$|\?)/i.test(src)) score += 36;
  if (/^https?:\/\//i.test(src)) score += 24;
  if (attrs.width && attrs.height && Number(attrs.width) <= 96 && Number(attrs.height) <= 96) score -= 160;
  if (order < 6) score += Math.max(0, 40 - order * 6);

  return score;
}

function isLikelyContentImage(candidate) {
  if (!candidate?.resolvedSrc) return false;
  const src = candidate.resolvedSrc.toLowerCase();
  const alt = String(candidate.alt || "").toLowerCase();
  const joined = `${src} ${alt} ${candidate.className || ""} ${candidate.context || ""}`;

  if (/^data:image\//i.test(src)) return false;
  if (/(\b|\/)(logo|avatar|icon|favicon|badge|emoji)(\b|[-_./])/i.test(joined)) return false;
  if (candidate.width && candidate.height && candidate.width <= 96 && candidate.height <= 96) return false;
  return candidate.score > -40;
}

function resolveUrl(value, baseUrl) {
  const src = decodeHtmlEntities(String(value || "").trim());
  if (!src) return "";
  if (/^https?:\/\//i.test(src) || src.startsWith("data:") || src.startsWith("file://")) return src;
  try {
    return new URL(src, baseUrl).toString();
  } catch {
    return src;
  }
}

function safePathname(value) {
  try {
    return new URL(value).pathname || "";
  } catch {
    return "";
  }
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&#x26;|&amp;/gi, "&")
    .replace(/&#x2f;/gi, "/")
    .replace(/&#x3a;/gi, ":")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"");
}

export function buildPaginatedPptMarkdown(article) {
  const title = article.title || "Presentation";
  const strippedMarkdown = removeLeadingTitle(article.rawMarkdown || "", title);
  const sections = parseMarkdownSections(strippedMarkdown);

  const introText = takeIntroExcerpt(sections);
  const slides = [renderTitleSlide(article, introText)];

  for (const section of sections) {
    const pages = paginateSection(section);
    pages.forEach((page, index) => {
      slides.push(renderSectionSlide(section.title, page, index > 0));
    });
  }

  return slides.filter(Boolean).join("\n\n---\n\n").trim();
}

function renderTitleSlide(article, introText) {
  const lines = [`# ${article.title || "Presentation"}`, ""];

  if (article.sourceUrl) lines.push(`> Source: ${article.sourceUrl}`);
  if (lines[lines.length - 1] !== "") lines.push("");

  if (introText) {
    lines.push(introText, "");
  }

  return lines.join("\n").trim();
}

function renderSectionSlide(title, units, isContinuation) {
  const lines = [`## ${title}${isContinuation ? "（续）" : ""}`, ""];

  for (const unit of units) {
    if (unit.type === "paragraph") {
      lines.push(unit.text, "");
      continue;
    }

    if (unit.type === "list") {
      unit.items.forEach((item) => lines.push(`- ${item}`));
      lines.push("");
      continue;
    }

    if (unit.type === "code") {
      lines.push(`\`\`\`${unit.lang || ""}`.trimEnd());
      lines.push(...unit.lines);
      lines.push("```", "");
    }
  }

  return lines.join("\n").trim();
}

function paginateSection(section) {
  const units = flattenBlocks(section.blocks || []);
  if (!units.length) {
    return [];
  }

  const pages = [];
  let current = [];
  let currentWeight = 0;
  let paragraphCount = 0;
  let bulletCount = 0;

  const flushPage = () => {
    if (!current.length) return;
    pages.push(current);
    current = [];
    currentWeight = 0;
    paragraphCount = 0;
    bulletCount = 0;
  };

  for (const unit of units) {
    const nextWeight = estimateUnitWeight(unit);
    const nextParagraphCount = paragraphCount + (unit.type === "paragraph" ? 1 : 0);
    const nextBulletCount = bulletCount + (unit.type === "list" ? unit.items.length : 0);
    const shouldBreak = current.length > 0 && (
      currentWeight + nextWeight > 6.2 ||
      nextParagraphCount > 3 ||
      nextBulletCount > 6 ||
      current.length >= 4
    );

    if (shouldBreak) {
      flushPage();
    }

    current.push(unit);
    currentWeight += nextWeight;
    paragraphCount += unit.type === "paragraph" ? 1 : 0;
    bulletCount += unit.type === "list" ? unit.items.length : 0;
  }

  flushPage();
  return pages;
}

function flattenBlocks(blocks) {
  const units = [];

  for (const block of blocks) {
    if (block.type === "paragraph") {
      units.push({ type: "paragraph", text: block.text });
      continue;
    }

    if (block.type === "list") {
      units.push(...splitListIntoUnits(block.items));
      continue;
    }

    if (block.type === "code") {
      units.push(...splitCodeIntoUnits(block.lang, block.text));
    }
  }

  return units;
}

function splitListIntoUnits(items) {
  const safeItems = (items || []).filter(Boolean);
  const units = [];
  let current = [];
  let weight = 0;

  for (const item of safeItems) {
    const itemWeight = Math.max(0.45, Math.min(1.2, item.length / 80));
    if (current.length > 0 && (current.length >= 4 || weight + itemWeight > 2.6)) {
      units.push({ type: "list", items: current });
      current = [];
      weight = 0;
    }
    current.push(item);
    weight += itemWeight;
  }

  if (current.length) {
    units.push({ type: "list", items: current });
  }

  return units;
}

function splitCodeIntoUnits(lang, text) {
  const lines = `${text || ""}`.split("\n").filter((line, index, all) => line.trim() || index < all.length - 1);
  if (!lines.length) {
    return [];
  }

  const units = [];
  const chunkSize = 8;

  for (let index = 0; index < lines.length; index += chunkSize) {
    units.push({
      type: "code",
      lang,
      lines: lines.slice(index, index + chunkSize)
    });
  }

  return units;
}

function estimateUnitWeight(unit) {
  if (unit.type === "paragraph") {
    if (unit.text.length > 180) return 2.1;
    if (unit.text.length > 110) return 1.6;
    return 1.0;
  }

  if (unit.type === "list") {
    return Math.max(1.0, Math.min(2.4, unit.items.reduce((sum, item) => sum + Math.max(0.4, item.length / 100), 0)));
  }

  if (unit.type === "code") {
    return 1.6 + Math.max(0, (unit.lines?.length || 0) - 4) * 0.2;
  }

  return 1.0;
}

function takeIntroExcerpt(sections) {
  const firstSection = sections[0];
  if (!firstSection || firstSection.title !== "导语" || !firstSection.blocks.length) {
    return "";
  }

  const firstParagraphIndex = firstSection.blocks.findIndex((block) => block.type === "paragraph" && block.text.length <= 140);
  if (firstParagraphIndex === -1) {
    return "";
  }

  const [block] = firstSection.blocks.splice(firstParagraphIndex, 1);
  if (!firstSection.blocks.length) {
    sections.shift();
  }

  return block.text;
}

function parseMarkdownSections(markdown) {
  const lines = normalizeMarkdown(markdown).split("\n");
  const sections = [];
  let current = null;
  let paragraphBuffer = [];
  let listBuffer = [];
  let inCode = false;
  let codeLang = "";
  let codeBuffer = [];

  const ensureSection = () => {
    if (!current) {
      current = { title: "导语", level: 2, blocks: [] };
    }
  };

  const flushParagraph = () => {
    const text = cleanupInlineText(paragraphBuffer.join(" ").trim());
    paragraphBuffer = [];
    if (!text) return;
    ensureSection();
    splitTextIntoChunks(text, 120, 160).forEach((chunk) => {
      current.blocks.push({ type: "paragraph", text: chunk });
    });
  };

  const flushList = () => {
    const items = listBuffer.flatMap((item) => splitTextIntoChunks(item, 72, 96)).filter(Boolean);
    listBuffer = [];
    if (!items.length) return;
    ensureSection();
    current.blocks.push({ type: "list", items });
  };

  const flushCode = () => {
    const text = codeBuffer.join("\n").replace(/\s+$/, "");
    codeBuffer = [];
    if (!text) return;
    ensureSection();
    current.blocks.push({ type: "code", lang: codeLang, text });
  };

  const pushCurrent = () => {
    if (current && current.blocks.length) {
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
        title: cleanupInlineText(headingMatch[2]),
        level: headingMatch[1].length,
        blocks: []
      };
      continue;
    }

    const bulletMatch = line.match(/^[-*+]\s+(.*)$/) || line.match(/^\d+[.)]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      listBuffer.push(cleanupInlineText(bulletMatch[1]));
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushList();
      paragraphBuffer.push(cleanupInlineText(line.replace(/^>\s?/, "")));
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

  return sections.filter((section) => section.title || section.blocks.length);
}

function removeLeadingTitle(markdown, title) {
  const lines = normalizeMarkdown(markdown).split("\n");
  let cursor = 0;

  while (cursor < lines.length && !lines[cursor].trim()) {
    cursor += 1;
  }

  const headingMatch = lines[cursor]?.match(/^#\s+(.*)$/);
  if (!headingMatch) {
    return lines.join("\n").trim();
  }

  if (!isSameLooseText(headingMatch[1], title)) {
    return lines.join("\n").trim();
  }

  cursor += 1;
  while (cursor < lines.length && !lines[cursor].trim()) {
    cursor += 1;
  }

  return lines.slice(cursor).join("\n").trim();
}

function normalizeMarkdown(markdown) {
  return `${markdown || ""}`
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, "  ");
}

function cleanupInlineText(text) {
  return `${text || ""}`
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTextIntoChunks(text, softMax, hardMax) {
  const normalized = cleanupInlineText(text);
  if (!normalized) {
    return [];
  }

  if (normalized.length <= hardMax) {
    return [normalized];
  }

  const sentenceParts = normalized.match(/[^。！？；.!?;]+[。！？；.!?;]?/g) || [normalized];
  const chunks = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) {
      chunks.push(current.trim());
    }
    current = "";
  };

  for (const part of sentenceParts.map((item) => item.trim()).filter(Boolean)) {
    if (!current) {
      current = part;
      continue;
    }

    const candidate = `${current} ${part}`.trim();
    if (candidate.length <= softMax || current.length < softMax * 0.6) {
      current = candidate;
      continue;
    }

    if (current.length >= hardMax) {
      pushCurrent();
      current = part;
      continue;
    }

    pushCurrent();
    current = part;
  }

  pushCurrent();

  return chunks.flatMap((chunk) => {
    if (chunk.length <= hardMax) {
      return [chunk];
    }
    return chunk.match(new RegExp(`.{1,${hardMax}}`, "g")) || [chunk];
  });
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value || "");
}

function isSameLooseText(left, right) {
  return normalizeLooseText(left) === normalizeLooseText(right);
}

function normalizeLooseText(value) {
  return cleanupInlineText(value)
    .toLowerCase()
    .replace(/[：:·•\-_|]/g, "")
    .replace(/\s+/g, "");
}
