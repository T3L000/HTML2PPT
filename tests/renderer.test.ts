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
});
