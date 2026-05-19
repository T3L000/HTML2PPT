# Codex Project Memory

## Project Snapshot
- Purpose: Build a TypeScript/Node html2ppt converter that maps a controlled HTML slide protocol into editable PPTX files.
- Main stack: TypeScript, Node.js, Playwright, pptxgenjs, Vitest.
- Important commands: Use `npm.cmd` on this Windows/PowerShell environment because `npm.ps1` is blocked by execution policy.
- Current focus: Expand V1.1 protocol coverage for common deck authoring patterns.

## User Preferences
- User wants a practical converter because existing PPT-making skills/tools are not good enough.
- Prefer editable PPT output over high-fidelity screenshot-only output.

## Stable Decisions
- V1 uses a controlled custom HTML protocol: `ppt-deck`, `ppt-slide`, `ppt-text`, `ppt-list`, `ppt-li`, `ppt-image`, `ppt-shape`.
- V1 supports only graphic/text/list layout, not tables, charts, animation, arbitrary webpages, or screenshot fallback.
- V1 strict mode reports unsupported tags/styles with actionable diagnostics.

## Project Conventions
- Source lives in `src/`, tests in `tests/`, fixtures in `fixtures/`.
- Use strict validation and diagnostics instead of screenshot fallback for V1.

## Known Risks And Gotchas
- PowerShell cannot execute `npm.ps1`; call `npm.cmd`.

## Current State
- V1.1 TypeScript package includes CLI, library API, protocol validation, Playwright layout extraction, pptxgenjs rendering, editable bullet lists, tests, fixtures, and README/docs.

## Recent Notes
- 2026-05-19: Implementation started from the approved html2ppt plan.
- 2026-05-19: Playwright Chromium runtime was installed into the user Playwright cache for local layout tests.
- 2026-05-19: Added `ppt-list`/`ppt-li`, a multi-slide showcase fixture, and protocol documentation.
