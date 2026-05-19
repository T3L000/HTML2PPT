# html2ppt V1 Protocol

V1 is an editable-first, controlled HTML protocol. It is not a general webpage renderer. Unsupported HTML and CSS fail with diagnostics so an agent or developer can fix the source before generating a PPTX.

## Document Shape

```html
<ppt-deck size="wide">
  <ppt-slide>
    ...
  </ppt-slide>
</ppt-deck>
```

- `ppt-deck` must be the single root element.
- `ppt-slide` must be a direct child of `ppt-deck`.
- The only supported deck size is `wide`, rendered as 1280x720 px and PowerPoint wide layout.

## Elements

All editable slide elements must live directly inside `ppt-slide` or `ppt-group` and must include explicit `left`, `top`, `width`, and `height` values in `px`.

### `ppt-group`

Creates an authoring-only layout container. Group children use coordinates relative to the group in HTML, then html2ppt flattens them into editable PowerPoint objects with slide-level coordinates. This keeps PPT output editable while making complex cards and repeated blocks easier to author.

Supported styles:

- `left`, `top`, `width`, `height`

Rules:

- `ppt-group` must be a direct child of `ppt-slide` or another `ppt-group`.
- `ppt-text`, `ppt-list`, `ppt-image`, `ppt-shape`, and nested `ppt-group` are supported inside `ppt-group`.
- The group itself is not emitted as a PowerPoint object.

### `ppt-text`

Creates an editable PowerPoint text box.

Supported styles:

- `left`, `top`, `width`, `height`
- `font-family`, `font-size`, `font-weight`, `font-style`
- `color`, `text-align`, `line-height`

Inline `span` is supported for styled text runs inside `ppt-text`.

### `ppt-list`

Creates editable PowerPoint bullet text. Each `ppt-li` becomes a native bullet text box.

Supported styles:

- `left`, `top`, `width`, `height`
- `font-family`, `font-size`, `font-weight`, `font-style`
- `color`, `line-height`, `padding-left`

Rules:

- `ppt-li` must be a direct child of `ppt-list`.
- Inline `span` is supported inside `ppt-li`.
- `padding-left`, when present, must use `px` and controls bullet text indentation.

### `ppt-image`

Creates a native PowerPoint image object.

Required attributes:

- `src`

Optional attributes:

- `fit`: `contain`, `cover`, or `fill`

Supported styles:

- `left`, `top`, `width`, `height`

### `ppt-shape`

Creates a native PowerPoint shape.

Optional attributes:

- `kind`: `rect`, `roundRect`, `ellipse`, or `line`

Supported styles:

- `left`, `top`, `width`, `height`
- `background`, `background-color`
- `border`, `border-color`, `border-style`, `border-width`

## Diagnostics

Common errors:

- `missing-deck`: the input does not contain a single `ppt-deck` root.
- `missing-slide`: the deck has no slides.
- `unsupported-element`: a tag is outside the V1 protocol.
- `unsupported-style`: a CSS property or value is unsupported.
- `invalid-parent`: an element is not in its required parent.
- `invalid-geometry`: an editable element is missing explicit pixel geometry.
- `missing-asset`: an image source is missing or cannot be read.

Diagnostics may include:

- `path`: the protocol path, such as `ppt-deck > ppt-slide > ppt-text`.
- `line` and `column`: 1-based source location for tag-level protocol errors.
- `property` and `value`: the CSS property, attribute, or value that triggered the error.
- `suggestion`: a short fix hint intended for humans and agent retry loops.

CLI output prints suggestions as a second line:

```text
[invalid-geometry] 3:5 at ppt-deck > ppt-slide > ppt-text (left: 10%) <ppt-text> requires explicit left geometry in px.
  fix: Set left with an explicit pixel value, for example left:80px.
```

## Template Variables

html2ppt can render simple scalar template variables before protocol validation and layout extraction.

```html
<ppt-text style="left:80px;top:60px;width:900px;height:120px">
  {{deck.title}}
</ppt-text>
```

CLI:

```bash
node dist/cli.js deck.html -o deck.pptx --data deck-data.json
```

Library:

```ts
await convertHtmlToPptx({
  filePath: "deck.html",
  templateData: {
    deck: { title: "Quarterly Review" }
  }
});
```

Rules:

- Supported paths use identifiers separated by dots, such as `{{title}}` or `{{deck.title}}`.
- Values must resolve to string, number, boolean, or null.
- Inserted values are HTML-escaped before layout extraction.
- Missing or non-scalar values fail with `missing-template-value` diagnostics and `fix:` suggestions.

## Example

See `fixtures/showcase.html` for a multi-slide deck that uses titles, paragraphs, bullet lists, groups, shapes, backgrounds, and inline styled runs.
