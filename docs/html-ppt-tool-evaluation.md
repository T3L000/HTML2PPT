# HTML To PPTX Tool Evaluation

Date: 2026-05-20

## Goal

Evaluate whether an existing project can provide editable PPTX export for normal HTML decks, especially `section.slide` decks such as `guizang-ppt-skill`.

The key requirement is not just "can export a PPTX". The output should contain editable PowerPoint text/shapes when possible. Screenshot-only output is already covered by `html2ppt --mode screenshot`.

## Candidates

| Candidate | Version Tested | Result | Recommendation |
| --- | --- | --- | --- |
| `dom-to-pptx` | `1.1.9` | Successfully exported normal HTML decks to PPTX with editable text and native shape XML. | Use as the first experimental editable normal-HTML adapter. |
| `html2pptx` | `0.0.5` | Converts HTML text snippets to PptxGenJS rich text runs only. It is not a page/layout converter. | Do not use for full-slide HTML deck conversion. It may be useful only for rich text parsing ideas. |

## `dom-to-pptx` Findings

Local eval command:

```bash
node tmp/html-ppt-eval/run-dom-to-pptx-eval.mjs
```

Outputs were written under `tmp/html-ppt-eval/outputs/`.

| Test Case | Status | Slides | Media | Shapes | Pictures | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `simple-dom-deck` | OK | 2 | 5 | 10 | 2 | Preserved editable text such as `Editable HTML Test`, `42%`, and `Second Slide`. |
| `dom-to-pptx-example` | OK | 8 | 59 | 239 | 29 | Official example exported successfully with large editable text coverage. |
| `guizang-template-swiss` | OK | 2 | 5 | 17 | 3 | Exported placeholder template content as editable text. One relative script path logged a CORS/file warning, but export completed. |

Important nuance: `dom-to-pptx` can improve editability, but it cannot improve design quality by itself. If the source HTML is a placeholder template, the output PPTX will still look like a placeholder template.

## `html2pptx` Findings

The npm package describes itself as converting HTML into PptxGenJS text. Its API is:

```js
const items = html2pptxgenjs.htmlToPptxText("Hello, <b>world</b>!");
slide.addText(items, { x: 0.5, y: 0, w: 9.5, h: 6 });
```

It supports text tags like `b`, `i`, `ul`, `ol`, `h1` to `h6`, and basic inline styles. It does not measure DOM layout, render grids/flexbox, position elements, or export full slides.

## Decision

Keep the current split:

- `protocol` mode: strict, stable, editable-first `ppt-*` authoring protocol.
- `screenshot` mode: high-fidelity compatibility for arbitrary `section.slide` HTML decks.
- Proposed next mode: `dom` or `html-editable`, powered by `dom-to-pptx`, for experimental editable export of normal HTML decks.

## Implemented Next Step

V1.7 implements this as an experimental adapter:

```bash
node dist/cli.js deck.html -o deck-editable.pptx --mode dom
```

The first version:

- Use Playwright to load the HTML.
- Inject the local `dom-to-pptx` bundle.
- Select `section.slide` by default.
- Call `domToPptx.exportToPptx(slides, { skipDownload: true, autoEmbedFonts: false, svgAsVector: true })`.
- Write the returned Blob as the output PPTX.
- Keep this mode explicitly experimental because arbitrary HTML/CSS can still produce approximations.
