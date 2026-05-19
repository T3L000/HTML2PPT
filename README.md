# html2ppt

Convert a controlled HTML slide protocol into editable PowerPoint decks.

## Usage

```bash
npm.cmd install
npm.cmd run build
node dist/cli.js fixtures/basic.html -o tmp/basic.pptx --base-dir .
node dist/cli.js fixtures/showcase.html -o tmp/showcase.pptx --base-dir .
```

The package also exposes a library API:

```ts
import { convertHtmlToPptx } from "html2ppt";

await convertHtmlToPptx({
  filePath: "deck.html",
  outputPath: "deck.pptx",
  baseDir: "."
});
```

## V1 HTML Protocol

```html
<ppt-deck size="wide">
  <ppt-slide>
    <ppt-text style="left:80px;top:60px;width:900px;height:120px;font-size:44px;color:#111">
      Editable Title
    </ppt-text>
    <ppt-image src="./hero.png" fit="cover" style="left:80px;top:220px;width:520px;height:300px"></ppt-image>
    <ppt-shape kind="rect" style="left:640px;top:220px;width:400px;height:300px;background:#f2f2f2;border:1px solid #ddd"></ppt-shape>
    <ppt-list style="left:80px;top:540px;width:720px;height:120px;font-size:24px;color:#222;line-height:1.25">
      <ppt-li>Editable bullet item</ppt-li>
      <ppt-li>Inline <span style="font-weight:700;color:#c00">styled runs</span></ppt-li>
    </ppt-list>
  </ppt-slide>
</ppt-deck>
```

V1 is strict and editable-first. Unsupported elements and CSS properties fail with diagnostics instead of falling back to screenshots.
CLI diagnostics include the error code, source line/column when available, protocol path, offending property/value, and a `fix:` suggestion.

See [docs/protocol-v1.md](docs/protocol-v1.md) for the supported tags, attributes, styles, and diagnostics.
