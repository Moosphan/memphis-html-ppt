---
name: memphis-html-ppt
description: Convert a user-provided web link or Markdown document into a high-quality Memphis style HTML presentation preview. Use when the user wants PPT-style storytelling, a Memphis visual language, or a local HTML deck preview for a source article, webpage, note, or markdown draft.
---

# Memphis HTML PPT Preview

Use this skill to turn a source document or webpage into a polished HTML presentation preview with a Memphis look.

## What To Build

- Input: webpage URL, pasted Markdown, or local Markdown file
- Output: a local HTML preview that feels like a PPT deck
- Style: high-quality Memphis, playful but controlled, bright, layered, geometric, and editorial

## Core Workflow

1. Extract the source into slide-worthy sections.
2. Preserve every source section and subsection; never cut content just to reduce page count.
3. Split overflow into continuation slides when a section exceeds a template's capacity.
4. Map each section to one or more templates from the skill template library.
5. Render the deck as an HTML preview with Memphis styling and responsive 16:9 framing.
6. Keep the presentation readable first, decorative second.

## Fast Path

Use the bundled generator when the user wants an immediate preview:

```bash
node scripts/generate-preview.js --input ./notes.md --output ./preview.html
node scripts/generate-preview.js --input https://example.com/article --output ./preview.html
```

The generated preview uses the shared Memphis stylesheet in `assets/memphis-preview.css`.

## Style Rules

- Use bold color blocking, cutout shapes, dots, squiggles, stripes, and asymmetry.
- Prefer warm off-white surfaces with saturated accents.
- Keep typography large, confident, and varied.
- Add layered depth with stickers, shadows, overlaps, and framed panels.
- Avoid generic corporate gradients, thin minimalist layouts, and sterile white pages.
- Do not overload slides; every slide should have one clear visual idea.
- Keep the section title block fixed in the top-left across all slides.
- Keep the page marker fixed in the bottom-right across all slides.
- Do not repeat the same source sentence in title, body, and decorative cards on the same slide.
- Decorative areas must carry source-derived content or remain purely graphic.

## Input Rules

- For a URL, first extract the readable article or page structure.
- For Markdown, preserve the author’s sequence and logic.
- If the source is weakly structured, create a clean outline before designing slides.
- Use the template-matching rules in `references/template-selection.md`.

## Output Rules

- Produce an HTML preview that can be opened locally.
- Include navigation, progress, and responsive behavior.
- Keep the final deck aligned to the Memphis system in `references/memphis-style.md`.
- Use only templates documented in `references/template-catalog.md`.

## References

- [HTML Preview Workflow](references/html-preview-workflow.md)
- [Memphis Style System](references/memphis-style.md)
- [Template Catalog](references/template-catalog.md)
- [Template Selection](references/template-selection.md)
- [Packaging Guide](references/packaging.md)
