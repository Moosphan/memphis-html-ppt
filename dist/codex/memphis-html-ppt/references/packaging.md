# Packaging Guide

## Goal

Keep one source of truth for the skill content, then generate platform-specific bundles.

## Bundle Targets

- `dist/claude/memphis-html-ppt`
- `dist/codex/memphis-html-ppt`

## Bundle Contents

- Shared: `SKILL.md`, `references/`, `scripts/`, `assets/`
- Codex only: `agents/openai.yaml`

## Release Rule

Only publish files from `dist/`. Do not hand-edit release output.
