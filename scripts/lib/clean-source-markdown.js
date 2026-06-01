const TRAILING_CHROME_HEADINGS = [
  /^##\s*(评论|相关推荐|相关文章|更多推荐|延伸阅读|热门评论|猜你喜欢|上一篇|下一篇)\s*$/u,
  /^##\s*(关注|下载|登录|注册|分享|收藏|点赞)\s*$/u,
  /^##\s*(作者|专栏|公告|广告|推广|赞助)\s*$/u,
  /^##\s*(目录|contents|table of contents)\s*$/iu
];

const NOISE_LINE_PATTERNS = [
  /^\[.*\]\(\/user\/.*\)$/u,
  /^\d{4}-\d{2}-\d{2}$/u,
  /^\d+$/u,
  /^(阅读|点赞|收藏|评论|转发|分享)\s*\d+$/u,
  /^(阅读|点赞|收藏|评论|转发|分享)\s*$/u,
  /^(原创|专栏|已于.+编辑|发布于|作者|编辑于|本文作者)$/u,
  /^(关注|关注作者|私信|加入讨论|阅读全文|收起全文|展开全文|目录|收起)$/u,
  /^相关推荐[:：]?$/u,
  /^相关文章[:：]?$/u,
  /^[-*+]\s+\[[^\]]+\]\(#heading-\d+[^)]*\)$/u,
  /\]\(\/user\/.+\).*?(文章|阅读|粉丝|点赞|收藏)/u
];

export function cleanSourceMarkdown(markdown, options = {}) {
  const title = String(options.title || "").trim();
  const sourceUrl = String(options.sourceUrl || "").trim();
  const raw = normalizeMarkdown(markdown);
  if (!raw) {
    return {
      markdown: "",
      report: {
        sourceUrl,
        title,
        totalLines: 0,
        keptLines: 0,
        removedLines: 0,
        removedCategories: {},
        notes: ["empty-input"]
      }
    };
  }

  const lines = raw.split("\n");
  const kept = [];
  const removedCategories = {};
  const notes = [];
  let inCode = false;
  let seenMeaningfulLine = false;
  let pendingBlank = false;

  const recordRemoval = (category) => {
    removedCategories[category] = (removedCategories[category] || 0) + 1;
  };

  const pushLine = (line) => {
    if (!line.trim()) {
      pendingBlank = true;
      return;
    }
    if (pendingBlank && kept.length && kept[kept.length - 1].trim()) {
      kept.push("");
    }
    pendingBlank = false;
    kept.push(line);
    seenMeaningfulLine = true;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (/^```/.test(trimmed)) {
      inCode = !inCode;
      pushLine(trimmed);
      continue;
    }

    if (inCode) {
      pushLine(line.replace(/\s+$/, ""));
      continue;
    }

    if (!trimmed) {
      pendingBlank = true;
      continue;
    }

    if (!seenMeaningfulLine && isTitleLine(trimmed, title)) {
      recordRemoval("duplicate-title");
      continue;
    }

    if (isNoiseLine(trimmed)) {
      recordRemoval("noise-line");
      continue;
    }

    if (isDirectoryStart(lines, index)) {
      recordRemoval("directory-trim");
      notes.push("directory-trimmed");
      break;
    }

    if (isTrailingProfileBlock(trimmed, index, seenMeaningfulLine)) {
      recordRemoval("profile-trim");
      notes.push("profile-block-trimmed");
      break;
    }

    if (isTrailingChromeHeading(trimmed) && index > 4 && seenMeaningfulLine) {
      recordRemoval("trailing-chrome");
      notes.push("trailing-chrome-trimmed");
      break;
    }

    if (isStandaloneImageLine(trimmed) && index < 25) {
      recordRemoval("metadata-image");
      continue;
    }

    if (/^>?\s*Source:\s*/i.test(trimmed) && index < 25) {
      recordRemoval("source-line");
      continue;
    }

    pushLine(line.replace(/\s+$/, ""));
  }

  const collapsed = collapseBlankLines(kept).trim();
  return {
    markdown: collapsed,
    report: {
      sourceUrl,
      title,
      totalLines: lines.length,
      keptLines: collapsed ? collapsed.split("\n").length : 0,
      removedLines: lines.length - (collapsed ? collapsed.split("\n").length : 0),
      removedCategories,
      notes
    }
  };
}

function normalizeMarkdown(markdown) {
  return `${markdown || ""}`
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function collapseBlankLines(lines) {
  const out = [];
  for (const line of lines) {
    if (!line.trim()) {
      if (out.length && out[out.length - 1].trim()) {
        out.push("");
      }
      continue;
    }
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

function isTitleLine(line, title) {
  if (!title) return false;
  const normalizedLine = normalizeLooseText(line);
  const normalizedTitle = normalizeLooseText(title);
  if (!normalizedLine || !normalizedTitle) return false;
  return normalizedLine === normalizedTitle || normalizedLine === `#${normalizedTitle}`;
}

function isNoiseLine(line) {
  return NOISE_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

function isTrailingChromeHeading(line) {
  return TRAILING_CHROME_HEADINGS.some((pattern) => pattern.test(line));
}

function isStandaloneImageLine(line) {
  return /^!\[[^\]]*]\([^)]+\)$/.test(line);
}

function isTrailingProfileBlock(line, index, seenMeaningfulLine) {
  if (!seenMeaningfulLine || index < 20) return false;
  return (
    /\]\(\/user\/[^)]+\)$/.test(line) ||
    /^\[!\[avatar\]/i.test(line) ||
    /(?:文章|阅读|粉丝|关注).*\]\(\/user\/[^)]+\)$/u.test(line) ||
    /^Mobile Developer$/u.test(line)
  );
}

function isDirectoryStart(lines, index) {
  if (index < 12) return false;
  const current = (lines[index] || "").trim();
  if (!/^(目录|contents|table of contents|收起)$/iu.test(current)) return false;

  const following = lines
    .slice(index + 1, index + 7)
    .map((line) => line.trim())
    .filter(Boolean);

  if (following.length < 2) return false;
  const anchorCount = following.filter((line) => /^[-*+]\s+\[[^\]]+\]\(#heading-\d+[^)]*\)$/u.test(line)).length;
  return anchorCount >= 2;
}

function normalizeLooseText(value) {
  return `${value || ""}`
    .toLowerCase()
    .replace(/[*_`>#]/g, " ")
    .replace(/[：:·•\-_|()\[\]{}。，、！!？?]/g, "")
    .replace(/\s+/g, "");
}
