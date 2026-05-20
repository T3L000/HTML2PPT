# html2ppt

Convert a controlled HTML slide protocol into editable PowerPoint decks.

## Usage

```bash
npm.cmd install
npm.cmd run build
node dist/cli.js fixtures/basic.html -o tmp/basic.pptx --base-dir .
node dist/cli.js fixtures/showcase.html -o tmp/showcase.pptx --base-dir .
node dist/cli.js fixtures/template.html -o tmp/template.pptx --data fixtures/template-data.json --base-dir .
node dist/cli.js path/to/html-deck.html -o tmp/html-deck.pptx --mode screenshot
node dist/cli.js path/to/html-deck.html -o tmp/html-deck-editable.pptx --mode dom
```

The package also exposes a library API:

```ts
import { convertHtmlToPptx } from "html2ppt";

await convertHtmlToPptx({
  filePath: "deck.html",
  outputPath: "deck.pptx",
  baseDir: ".",
  templateData: {
    title: "Quarterly Review"
  }
});
```

## Screenshot Mode For Existing HTML Decks

Default mode is `protocol`: it requires the editable `ppt-*` HTML protocol and exports native PowerPoint text, shapes, lists, and images.

For existing webpage-style decks, use screenshot mode:

```bash
node dist/cli.js tmp/guizang-ppt-skill/assets/template-swiss.html -o tmp/guizang-swiss.pptx --mode screenshot
```

Screenshot mode looks for `section.slide`, captures each slide at 1280x720, and inserts each capture as a full-slide PNG. This is compatibility/high-fidelity mode, so the resulting slide visuals are not editable PowerPoint objects yet.

Experimental DOM mode uses `dom-to-pptx` to convert normal `section.slide` HTML decks into editable PowerPoint text, shapes, and images when possible:

```bash
node dist/cli.js tmp/guizang-ppt-skill/assets/template-swiss.html -o tmp/guizang-swiss-editable.pptx --mode dom
```

DOM mode is best for existing HTML decks that need some editability. It is still experimental because arbitrary CSS, browser effects, fonts, and scripts can produce approximations. If visual fidelity matters more than editability, use `--mode screenshot`.

## V1 HTML Protocol

```html
<ppt-deck size="wide">
  <ppt-slide>
    <ppt-text style="left:80px;top:60px;width:900px;height:120px;font-size:44px;color:#111">
      Editable Title
    </ppt-text>
    <ppt-image src="./hero.png" fit="cover" style="left:80px;top:220px;width:520px;height:300px"></ppt-image>
    <ppt-shape kind="rect" style="left:640px;top:220px;width:400px;height:300px;background:#f2f2f2;border:1px solid #ddd"></ppt-shape>
    <ppt-group style="left:80px;top:390px;width:520px;height:120px">
      <ppt-shape kind="roundRect" style="left:0px;top:0px;width:520px;height:120px;background:#eef5ff;border:1px solid #aac2dd"></ppt-shape>
      <ppt-text style="left:28px;top:28px;width:420px;height:48px;font-size:28px;color:#111">
        Grouped editable card
      </ppt-text>
    </ppt-group>
    <ppt-list style="left:80px;top:540px;width:720px;height:120px;font-size:24px;color:#222;line-height:1.25">
      <ppt-li>Editable bullet item</ppt-li>
      <ppt-li>Inline <span style="font-weight:700;color:#c00">styled runs</span></ppt-li>
    </ppt-list>
  </ppt-slide>
</ppt-deck>
```

V1 is strict and editable-first. Unsupported elements and CSS properties fail with diagnostics instead of falling back to screenshots.
CLI diagnostics include the error code, source line/column when available, protocol path, offending property/value, and a `fix:` suggestion.
Template variables use `{{name}}` or `{{nested.value}}` and can be supplied with `--data data.json` or the library `templateData` option.

See [docs/protocol-v1.md](docs/protocol-v1.md) for the supported tags, attributes, styles, and diagnostics.
