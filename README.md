# html2ppt

Convert a controlled HTML slide protocol into editable PowerPoint decks.

## Usage

```bash
npm.cmd install
npm.cmd run build
node dist/cli.js fixtures/basic.html -o tmp/basic.pptx --base-dir .
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
  </ppt-slide>
</ppt-deck>
```

V1 is strict and editable-first. Unsupported elements and CSS properties fail with diagnostics instead of falling back to screenshots.
