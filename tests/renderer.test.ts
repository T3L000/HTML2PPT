import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, test } from "vitest";
import { convertHtmlToPptx } from "../src/index.js";

const tmpDir = path.resolve("tmp/tests-renderer");

describe("convertHtmlToPptx", () => {
  test("writes an editable PPTX containing native text and shape XML", async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(tmpDir, { recursive: true });
    const outputPath = path.join(tmpDir, "basic.pptx");

    const result = await convertHtmlToPptx({
      html: `
        <ppt-deck size="wide">
          <ppt-slide>
            <ppt-text style="left:80px;top:60px;width:900px;height:120px;font-size:44px;color:#111">Editable Title</ppt-text>
            <ppt-shape kind="rect" style="left:640px;top:220px;width:400px;height:300px;background:#f2f2f2;border:1px solid #ddd"></ppt-shape>
          </ppt-slide>
        </ppt-deck>
      `,
      outputPath
    });

    expect(result.slideCount).toBe(1);
    expect(result.diagnostics).toEqual([]);
    expect(result.writtenPath).toBe(outputPath);
    expect(result.buffer.length).toBeGreaterThan(1000);

    const zip = await JSZip.loadAsync(await readFile(outputPath));
    const slideXml = await zip.file("ppt/slides/slide1.xml")?.async("string");

    expect(slideXml).toContain("Editable Title");
    expect(slideXml).toContain("<a:solidFill>");
    expect(slideXml).toContain("F2F2F2");
  });

  test("returns diagnostics and does not write when protocol validation fails", async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(tmpDir, { recursive: true });
    const outputPath = path.join(tmpDir, "invalid.pptx");

    await expect(
      convertHtmlToPptx({
        html: `<ppt-deck><ppt-slide><ppt-text style="left:0px;top:0px;width:100px;height:30px;box-shadow:1px 1px #000">Nope</ppt-text></ppt-slide></ppt-deck>`,
        outputPath
      })
    ).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: "unsupported-style",
          property: "box-shadow"
        })
      ]
    });
  });

  test("embeds data URL images as native PPTX media", async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(tmpDir, { recursive: true });

    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
    const result = await convertHtmlToPptx({
      html: `
        <ppt-deck size="wide">
          <ppt-slide>
            <ppt-image src="${png}" fit="contain" style="left:80px;top:60px;width:120px;height:90px"></ppt-image>
          </ppt-slide>
        </ppt-deck>
      `
    });

    expect(result.slideCount).toBe(1);
    const zip = await JSZip.loadAsync(result.buffer);
    expect(Object.keys(zip.files).some((name) => name.startsWith("ppt/media/image"))).toBe(true);
  });

  test("writes editable bullet lists as native PPT text", async () => {
    const result = await convertHtmlToPptx({
      html: `
        <ppt-deck size="wide">
          <ppt-slide>
            <ppt-list style="left:80px;top:120px;width:760px;height:220px;font-size:28px;color:#222;line-height:1.25">
              <ppt-li>Editable bullets</ppt-li>
              <ppt-li>Styled <span style="color:#c00;font-weight:700">runs</span></ppt-li>
            </ppt-list>
          </ppt-slide>
        </ppt-deck>
      `
    });

    const zip = await JSZip.loadAsync(result.buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")?.async("string");

    expect(slideXml).toContain("Editable bullets");
    expect(slideXml).toContain("Styled ");
    expect(slideXml).toContain("runs");
    expect(slideXml).toContain("<a:bu");
  });

  test("flattens grouped elements into editable PPT objects", async () => {
    const result = await convertHtmlToPptx({
      html: `
        <ppt-deck size="wide">
          <ppt-slide>
            <ppt-group style="left:120px;top:120px;width:500px;height:220px">
              <ppt-shape kind="roundRect" style="left:0px;top:0px;width:500px;height:220px;background:#eef5ff;border:1px solid #aac2dd"></ppt-shape>
              <ppt-text style="left:32px;top:28px;width:390px;height:60px;font-size:30px;color:#111">Grouped card</ppt-text>
            </ppt-group>
          </ppt-slide>
        </ppt-deck>
      `
    });

    const zip = await JSZip.loadAsync(result.buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")?.async("string");

    expect(slideXml).toContain("Grouped card");
    expect(slideXml).toContain("EEF5FF");
  });

  test("renders template variables before layout extraction", async () => {
    const result = await convertHtmlToPptx({
      html: `
        <ppt-deck size="wide">
          <ppt-slide>
            <ppt-text style="left:80px;top:60px;width:900px;height:120px;font-size:44px;color:#111">{{deck.title}}</ppt-text>
            <ppt-list style="left:100px;top:180px;width:760px;height:160px;font-size:26px;color:#222">
              <ppt-li>{{points.first}}</ppt-li>
            </ppt-list>
          </ppt-slide>
        </ppt-deck>
      `,
      templateData: {
        deck: { title: "Quarterly Review" },
        points: { first: "Native editable output" }
      }
    });

    const zip = await JSZip.loadAsync(result.buffer);
    const slideXml = await zip.file("ppt/slides/slide1.xml")?.async("string");

    expect(slideXml).toContain("Quarterly Review");
    expect(slideXml).toContain("Native editable output");
  });

  test("reports missing template variables", async () => {
    await expect(
      convertHtmlToPptx({
        html: `
          <ppt-deck size="wide">
            <ppt-slide>
              <ppt-text style="left:80px;top:60px;width:900px;height:120px">{{missing.title}}</ppt-text>
            </ppt-slide>
          </ppt-deck>
        `,
        templateData: {}
      })
    ).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: "missing-template-value",
          property: "missing.title",
          suggestion: expect.stringContaining("templateData")
        })
      ]
    });
  });

  test("reports missing local image assets", async () => {
    await expect(
      convertHtmlToPptx({
        html: `
          <ppt-deck size="wide">
            <ppt-slide>
              <ppt-image src="./missing.png" fit="contain" style="left:80px;top:60px;width:120px;height:90px"></ppt-image>
            </ppt-slide>
          </ppt-deck>
        `,
        baseDir: tmpDir
      })
    ).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          code: "missing-asset",
          property: "src",
          value: "./missing.png",
          suggestion: expect.stringContaining("update src")
        })
      ]
    });
  });

  test("renders normal HTML sections as full-slide screenshots", async () => {
    const result = await convertHtmlToPptx({
      mode: "screenshot",
      html: `
        <!doctype html>
        <html>
          <head>
            <style>
              html, body { margin: 0; width: 1280px; height: 720px; overflow: hidden; }
              #deck { display: flex; width: 200vw; height: 100vh; }
              section.slide { width: 100vw; height: 100vh; flex: 0 0 100vw; display: grid; place-items: center; font: 72px Georgia; }
              .a { background: #111; color: white; }
              .b { background: #eee; color: #111; }
            </style>
          </head>
          <body>
            <main id="deck">
              <section class="slide a">Slide A</section>
              <section class="slide b">Slide B</section>
            </main>
          </body>
        </html>
      `
    });

    expect(result.slideCount).toBe(2);
    const zip = await JSZip.loadAsync(result.buffer);
    expect(zip.file("ppt/slides/slide1.xml")).toBeTruthy();
    expect(zip.file("ppt/slides/slide2.xml")).toBeTruthy();
    expect(Object.keys(zip.files).filter((name) => name.startsWith("ppt/media/image"))).toHaveLength(2);
  });

  test("renders normal HTML sections with experimental editable DOM mode", async () => {
    const result = await convertHtmlToPptx({
      mode: "dom",
      html: `
        <!doctype html>
        <html>
          <head>
            <style>
              html, body { margin: 0; width: 1280px; height: 720px; background: #222; }
              .stage { display: flex; flex-direction: column; gap: 24px; }
              section.slide { width: 1280px; height: 720px; position: relative; overflow: hidden; background: #f4efe6; color: #111; }
              h1 { position: absolute; left: 80px; top: 60px; margin: 0; font-size: 68px; }
              .card { position: absolute; left: 90px; top: 210px; width: 460px; height: 220px; border-radius: 24px; background: #ffffff; padding: 30px; }
              .metric { position: absolute; right: 100px; top: 230px; font-size: 54px; font-weight: 700; color: #0057ff; }
            </style>
          </head>
          <body>
            <main class="stage">
              <section class="slide">
                <h1>DOM Editable Test</h1>
                <div class="card">This text should remain editable.</div>
                <div class="metric">88%</div>
              </section>
              <section class="slide">
                <h1>Second DOM Slide</h1>
              </section>
            </main>
          </body>
        </html>
      `
    });

    expect(result.slideCount).toBe(2);
    const zip = await JSZip.loadAsync(result.buffer);
    const slideXml = [
      await zip.file("ppt/slides/slide1.xml")?.async("string"),
      await zip.file("ppt/slides/slide2.xml")?.async("string")
    ].join("\n");

    expect(slideXml).toContain("DOM Editable Test");
    expect(slideXml).toContain("This text should remain editable.");
    expect(slideXml).toContain("Second DOM Slide");
    expect(slideXml).toContain("<p:sp");
  });
});
