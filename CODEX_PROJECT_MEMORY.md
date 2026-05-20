# Codex Project Memory

## Project Snapshot
- Purpose: Build a TypeScript/Node html2ppt converter that maps a controlled HTML slide protocol into editable PPTX files.
- Main stack: TypeScript, Node.js, Playwright, pptxgenjs, Vitest.
- Important commands: Use `npm.cmd` on this Windows/PowerShell environment because `npm.ps1` is blocked by execution policy.
- Current focus: V1.7 experimental DOM editable mode for existing HTML decks.

## User Preferences
- User wants a practical converter because existing PPT-making skills/tools are not good enough.
- Prefer editable PPT output over high-fidelity screenshot-only output.

## Stable Decisions
- V1 uses a controlled custom HTML protocol: `ppt-deck`, `ppt-slide`, `ppt-group`, `ppt-text`, `ppt-list`, `ppt-li`, `ppt-image`, `ppt-shape`.
- V1 supports only graphic/text/list/group layout, not tables, charts, animation, arbitrary webpages, or screenshot fallback.
- V1 strict mode reports unsupported tags/styles and template issues with actionable diagnostics, source line/column where available, and fix suggestions.
- Screenshot mode is a separate compatibility path for existing `section.slide` HTML decks. It exports full-slide PNGs, prioritizing visual fidelity over editability.
- DOM mode is an experimental compatibility path powered by `dom-to-pptx`. It exports normal `section.slide` HTML decks as editable PPTX objects when possible, but arbitrary CSS can still be approximate.

## Project Conventions
- Source lives in `src/`, tests in `tests/`, fixtures in `fixtures/`.
- Use strict validation and diagnostics instead of screenshot fallback for V1.

## Known Risks And Gotchas
- PowerShell cannot execute `npm.ps1`; call `npm.cmd`.

## Current State
- V1.5 TypeScript package includes CLI, library API, protocol validation, template variables, Playwright layout extraction, pptxgenjs rendering, editable bullet lists, grouped relative layout, actionable diagnostics, screenshot mode for `section.slide` HTML decks, tests, fixtures, and README/docs.
- V1.6 evaluation found `dom-to-pptx@1.1.9` can export normal HTML decks with editable text/shapes. `html2pptx@0.0.5` is only a rich-text snippet converter, not a full-slide layout converter.
- V1.7 adds `--mode dom` as an experimental editable normal-HTML adapter using `dom-to-pptx`.

## Recent Notes
- 2026-05-19: Implementation started from the approved html2ppt plan.
- 2026-05-19: Playwright Chromium runtime was installed into the user Playwright cache for local layout tests.
- 2026-05-19: Added `ppt-list`/`ppt-li`, a multi-slide showcase fixture, and protocol documentation.
- 2026-05-19: Added diagnostic line/column metadata and `suggestion` fix hints surfaced by the CLI.
- 2026-05-19: Added `ppt-group` as an authoring-only relative layout container flattened into editable PPT objects.
- 2026-05-19: Added `{{variable}}` / `{{nested.value}}` template rendering through library `templateData` and CLI `--data`.
- 2026-05-20: Added screenshot mode for existing HTML decks such as `guizang-ppt-skill`, using `section.slide` screenshots as full-slide PPT images.
- 2026-05-20: Evaluated existing editable HTML-to-PPTX candidates. `dom-to-pptx` is the best next adapter candidate; `html2pptx` is not suitable for whole-slide conversion.
- 2026-05-20: Added experimental `--mode dom` for normal HTML decks via `dom-to-pptx`.
