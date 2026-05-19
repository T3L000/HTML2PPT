import { afterAll, describe, expect, test } from "vitest";
import { extractLayout } from "../src/layout.js";

describe("extractLayout", () => {
  afterAll(async () => {
    await extractLayout.dispose();
  });

  test("extracts slide elements with pixel geometry and computed text styles", async () => {
    const deck = await extractLayout(`
      <ppt-deck size="wide">
        <ppt-slide style="background:#fafafa">
          <ppt-text style="left:80px;top:60px;width:900px;height:120px;font-family:Arial;font-size:44px;font-weight:700;font-style:italic;color:#111;text-align:center;line-height:1.2">
            Hello <span style="color:#c00;font-weight:400">World</span>
          </ppt-text>
          <ppt-list style="left:100px;top:160px;width:720px;height:120px;font-family:Arial;font-size:26px;color:#222;line-height:1.35;padding-left:30px">
            <ppt-li>First point</ppt-li>
            <ppt-li>Second <span style="color:#0a6;font-weight:700">point</span></ppt-li>
          </ppt-list>
          <ppt-image src="data:image/png;base64,iVBORw0KGgo=" fit="cover" style="left:80px;top:220px;width:520px;height:300px"></ppt-image>
          <ppt-shape kind="ellipse" style="left:640px;top:220px;width:400px;height:300px;background:#f2f2f2;border:1px solid #ddd"></ppt-shape>
          <ppt-group style="left:700px;top:420px;width:300px;height:160px">
            <ppt-text style="left:20px;top:18px;width:240px;height:44px;font-family:Arial;font-size:22px;color:#123">Nested title</ppt-text>
            <ppt-shape kind="rect" style="left:20px;top:80px;width:120px;height:48px;background:#ddeeff"></ppt-shape>
          </ppt-group>
        </ppt-slide>
      </ppt-deck>
    `);

    expect(deck.size).toBe("wide");
    expect(deck.slides).toHaveLength(1);
    expect(deck.slides[0]?.background).toBe("FAFAFA");
    expect(deck.slides[0]?.elements[0]).toMatchObject({
      type: "text",
      text: "Hello World",
      x: 80,
      y: 60,
      w: 900,
      h: 120,
      style: {
        fontFace: "Arial",
        fontSize: 44,
        bold: true,
        italic: true,
        color: "111111",
        align: "center",
        lineSpacingMultiple: 1.2
      },
      runs: [
        expect.objectContaining({ text: "Hello ", options: expect.objectContaining({ color: "111111" }) }),
        expect.objectContaining({ text: "World", options: expect.objectContaining({ color: "CC0000", bold: false }) })
      ]
    });
    expect(deck.slides[0]?.elements[1]).toMatchObject({
      type: "list",
      x: 100,
      y: 160,
      w: 720,
      h: 120,
      style: {
        fontFace: "Arial",
        fontSize: 26,
        color: "222222",
        lineSpacingMultiple: 1.35,
        bulletIndent: 30
      },
      items: [
        expect.objectContaining({ text: "First point" }),
        expect.objectContaining({
          text: "Second point",
          runs: [
            expect.objectContaining({ text: "Second ", options: expect.objectContaining({ color: "222222" }) }),
            expect.objectContaining({ text: "point", options: expect.objectContaining({ color: "00AA66", bold: true }) })
          ]
        })
      ]
    });
    expect(deck.slides[0]?.elements[2]).toMatchObject({
      type: "image",
      src: "data:image/png;base64,iVBORw0KGgo=",
      fit: "cover",
      x: 80,
      y: 220,
      w: 520,
      h: 300
    });
    expect(deck.slides[0]?.elements[3]).toMatchObject({
      type: "shape",
      kind: "ellipse",
      fill: "F2F2F2",
      line: { color: "DDDDDD", width: 1 }
    });
    expect(deck.slides[0]?.elements[4]).toMatchObject({
      type: "text",
      text: "Nested title",
      x: 720,
      y: 438,
      w: 240,
      h: 44
    });
    expect(deck.slides[0]?.elements[5]).toMatchObject({
      type: "shape",
      kind: "rect",
      x: 720,
      y: 500,
      w: 120,
      h: 48,
      fill: "DDEEFF"
    });
  });
});
