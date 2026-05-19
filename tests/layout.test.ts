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
          <ppt-image src="data:image/png;base64,iVBORw0KGgo=" fit="cover" style="left:80px;top:220px;width:520px;height:300px"></ppt-image>
          <ppt-shape kind="ellipse" style="left:640px;top:220px;width:400px;height:300px;background:#f2f2f2;border:1px solid #ddd"></ppt-shape>
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
      type: "image",
      src: "data:image/png;base64,iVBORw0KGgo=",
      fit: "cover",
      x: 80,
      y: 220,
      w: 520,
      h: 300
    });
    expect(deck.slides[0]?.elements[2]).toMatchObject({
      type: "shape",
      kind: "ellipse",
      fill: "F2F2F2",
      line: { color: "DDDDDD", width: 1 }
    });
  });
});
