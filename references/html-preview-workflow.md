# HTML Preview Workflow

## Source Types

- Webpage URL: extract heading hierarchy, key claims, examples, and any reusable visuals.
- Markdown: preserve section order and turn each section into a slide candidate.

## Slide Shape

- Open with a strong title or thesis.
- Use middle slides for structured explanation, contrast, or proof.
- End with synthesis, takeaway, or next step.

## Rendering Rules

- Build as an HTML deck, not a static article.
- Use one dominant focal point per slide.
- Keep text short enough to read at a glance.
- Prefer visual rhythm over dense paragraph blocks.
- Use `node scripts/generate-preview.js --input <source> --output <preview.html>` when the user wants a first-pass artifact quickly.

## Quality Check

- Does every slide have one job?
- Does the deck feel Memphis, not random clip-art?
- Is the hierarchy obvious on desktop and mobile?
- Is the final HTML preview something the user can actually open and use?
