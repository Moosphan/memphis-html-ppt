# Memphis HTML PPT

[中文文档](README.zh-CN.md)

![Memphis HTML PPT project banner](assets/readme-banner.jpg)

Memphis HTML PPT is a lightweight toolkit for turning Markdown files or web pages into a local HTML slide deck with a bold Memphis-inspired visual style.

It is designed for quick presentation prototyping, skill packaging, and visual storytelling experiments where you want a deck-like preview without opening PowerPoint, Keynote, or Google Slides.

## Highlights

- Generate HTML slide decks from local Markdown or remote web pages
- Uses a curated Memphis visual system with bold colors, geometric decoration, and editorial-style layouts
- Includes a template library for cover, narrative, comparison, checklist, timeline, metric, FAQ, and closing slides
- Ships with local packaging scripts for Codex / Claude skill distribution workflows
- Outputs a self-contained HTML preview that can be opened directly in a browser

## Project Status

This repository is currently best described as a practical generator and reusable project template rather than a polished npm package.

- The preview generator is usable now
- The packaging scripts are usable for local bundle generation
- The project includes a minimal `package.json` for Node.js script management

The repository now uses a single adaptive AI-planned pipeline.

- Migration map: [`docs/04-adaptive-chain-migration-map.md`](docs/04-adaptive-chain-migration-map.md)

## Preview

![Travel preview](assets/travel-preview.jpg)

## Directory Structure

```text
.
├── assets/                    # Shared CSS and template libraries
├── references/                # Style, workflow, and packaging notes
├── scripts/                   # Preview generation and release scripts
├── SKILL.md                   # Skill definition
├── juejin-skill-ppt.md        # Sample source content
├── juejin-skill-memphis.html  # Example generated preview
└── test-content.md            # Local test content
```

## Requirements

- Node.js 18 or later recommended

The generator uses:

- native `fetch`
- ES module syntax
- filesystem APIs from Node.js

## Quick Start

Generate an HTML preview from a local Markdown file:

```bash
npm run preview -- --input ./test-content.md --output ./preview.html
```

Or run the script directly:

```bash
node scripts/generate-adaptive-preview.js --input ./test-content.md --output ./preview.html --plan-output ./preview.plan.json --source-output ./preview.source.md --source-package-output ./preview.source-package.json
```

Generate an HTML preview from a web page:

```bash
node scripts/generate-adaptive-preview.js --input https://example.com/article --output ./preview.html --plan-output ./preview.plan.json --source-output ./preview.source.md --source-package-output ./preview.source-package.json
```

Run the adaptive validator:

```bash
npm run validate:preview -- --html ./preview.html --plan ./preview.plan.json
```

Run the content-quality validator:

```bash
npm run validate:content -- --plan ./preview.plan.json --source-package ./preview.source-package.json --html ./preview.html --out-report ./artifacts/content-quality.json
```

Run the adaptive visual regression checker:

```bash
npm run validate:visual -- --html ./preview.html --compare-svg true --out-dir ./artifacts/visual
```

The output folder now includes:

- `deck.html`: the final HTML PPT artifact
- `index.html`: a browsable visual validation report
- `visual-summary.json`: structured validation results
- Per-slide `html / ref / diff / compare` images

Then open the generated `preview.html` in your browser.

## Available Scripts

### `scripts/generate-adaptive-preview.js`

Generates the adaptive AI-planned preview plus cleaned markdown, a `source package`, and its `deckPlan` JSON.

```bash
node scripts/generate-adaptive-preview.js --input <url-or-markdown-file> --output <html-file> [--plan-output <deck-plan.json>] [--source-output <clean.md>] [--source-package-output <source-package.json>]
```

Behavior:

- For URLs, extracts readable source Markdown first
- Produces cleaned markdown first, then builds a structured `source package`
- Builds a structured `deckPlan` with `templateId`, `reasoning`, and slide content
- Renders the adaptive HTML deck using `render-adaptive.js`
- Writes HTML, plan JSON, and source package JSON that can be validated independently

### `scripts/validate-adaptive-preview.js`

Validates the adaptive HTML preview and optional `deckPlan` JSON.

```bash
node scripts/validate-adaptive-preview.js --html <preview.html> [--plan <deck-plan.json>] [--min-slides 1] [--strict-fit true]
```

Behavior:

- Checks adaptive HTML structure such as slide wrappers, nav, counter, and progress bar
- Verifies `deckPlan` metadata, template ids, and slide/template matching
- Uses template slot constraints to surface overflow, missing required content, and weak fits

### `scripts/validate-content-quality.js`

Validates cleaned markdown, the source package, and the deck plan.

```bash
node scripts/validate-content-quality.js --plan <deck-plan.json> [--source-package <source-package.json>] [--cleaned-markdown <clean.md>] [--html <preview.html>] [--out-report <report.json>]
```

Behavior:

- Checks for residual platform noise
- Verifies strong section coverage
- Verifies metric and command extraction
- Checks whether code assets were mapped to suitable slide templates
- Checks whether template semantics match the final slide content

### `scripts/build-release.js`

Builds release bundles under `dist/`.

```bash
npm run build
```

Or:

```bash
node scripts/build-release.js
```

Outputs:

- `dist/codex/memphis-html-ppt`
- `dist/claude/memphis-html-ppt`

### `scripts/publish-local.js`

Copies built bundles into local skill directories:

```bash
npm run publish:local
```

Or:

```bash
node scripts/publish-local.js
```

Targets:

- `~/.codex/skills/memphis-html-ppt`
- `~/.claude/skills/memphis-html-ppt`

## How It Works

The generator follows a single workflow:

1. Load a Markdown file or remote page.
2. Extract cleaned source Markdown.
3. Build a `source package` and `deckPlan`.
4. Render an adaptive HTML deck and validate it.

The current implementation prioritizes readable source extraction, template-fit checks, and stable HTML output.

## Design Direction

This project intentionally avoids generic corporate slide styling. The visual system emphasizes:

- bright accents
- cutout geometry
- playful asymmetry
- strong title hierarchy
- decorative rhythm with controlled density

For more context, see:

- [`references/memphis-style.md`](references/memphis-style.md)
- [`references/template-catalog.md`](references/template-catalog.md)
- [`references/html-preview-workflow.md`](references/html-preview-workflow.md)

## Limitations

- No npm publishing workflow yet
- No automated test suite yet
- HTML parsing is intentionally lightweight and may not preserve complex article structure
- Long sections are currently compressed into single slides instead of fully paginated overflow slides
- Remote page extraction depends on the raw HTML structure of the target page

## Roadmap Ideas

- Add screenshot-based visual regression checks
- Improve content chunking for long sections
- Support richer article extraction and metadata handling
- Export deck assets or interoperable slide formats

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
