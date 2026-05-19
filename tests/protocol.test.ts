import { describe, expect, test } from "vitest";
import { validateHtmlProtocol } from "../src/protocol.js";

describe("validateHtmlProtocol", () => {
  test("accepts a minimal deck with explicit editable element geometry", () => {
    const result = validateHtmlProtocol(`
      <ppt-deck size="wide">
        <ppt-slide>
          <ppt-text style="left:80px;top:60px;width:900px;height:120px;font-size:44px;color:#111">Title</ppt-text>
          <ppt-shape kind="rect" style="left:10px;top:20px;width:30px;height:40px;background:#fff"></ppt-shape>
        </ppt-slide>
      </ppt-deck>
    `);

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  test("rejects decks without a ppt-deck root", () => {
    const result = validateHtmlProtocol(`<div><ppt-slide></ppt-slide></div>`);

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "missing-deck",
        message: expect.stringContaining("ppt-deck")
      })
    );
  });

  test("rejects unsupported elements with a path", () => {
    const result = validateHtmlProtocol(`
      <ppt-deck>
        <ppt-slide>
          <table><tr><td>Nope</td></tr></table>
        </ppt-slide>
      </ppt-deck>
    `);

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "unsupported-element",
        element: "table",
        path: "ppt-deck > ppt-slide > table"
      })
    );
  });

  test("rejects unsupported CSS properties", () => {
    const result = validateHtmlProtocol(`
      <ppt-deck>
        <ppt-slide>
          <ppt-text style="left:0px;top:0px;width:100px;height:30px;filter:blur(2px)">Nope</ppt-text>
        </ppt-slide>
      </ppt-deck>
    `);

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "unsupported-style",
        element: "ppt-text",
        property: "filter",
        value: "blur(2px)"
      })
    );
  });

  test("rejects elements that do not resolve to explicit pixel geometry", () => {
    const result = validateHtmlProtocol(`
      <ppt-deck>
        <ppt-slide>
          <ppt-text style="left:10%;top:0px;width:100px;height:30px">Nope</ppt-text>
        </ppt-slide>
      </ppt-deck>
    `);

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "invalid-geometry",
        property: "left",
        value: "10%"
      })
    );
  });
});
