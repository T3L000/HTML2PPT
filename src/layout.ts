import { chromium, type Browser } from "playwright";
import { Html2PptError } from "./errors.js";
import { validateHtmlProtocol } from "./protocol.js";
import type { DeckLayout } from "./types.js";

let browserPromise: Promise<Browser> | undefined;

export const extractLayout = Object.assign(
  async function extractLayout(html: string): Promise<DeckLayout> {
    const validation = validateHtmlProtocol(html);
    if (!validation.valid) {
      throw new Html2PptError("HTML protocol validation failed.", validation.diagnostics);
    }

    const browser = await getBrowser();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    try {
      await page.setContent(wrapHtml(html), { waitUntil: "load" });
      return await page.evaluate<DeckLayout>(() => {
        const deck = document.querySelector("ppt-deck");
        if (!deck) {
          throw new Error("Missing ppt-deck after validation.");
        }

        const normalizeText = (value: string | null): string => (value ?? "").replace(/\s+/g, " ").trim();
        const toHex = (value: string): string | undefined => {
          const normalized = value.trim();
          if (!normalized || normalized === "transparent" || normalized === "rgba(0, 0, 0, 0)") {
            return undefined;
          }
          const rgb = normalized.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
          if (rgb) {
            return [rgb[1], rgb[2], rgb[3]]
              .map((part) => Number(part).toString(16).padStart(2, "0"))
              .join("")
              .toUpperCase();
          }
          const hex = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
          if (!hex) {
            return undefined;
          }
          const raw = hex[1] ?? "";
          return (raw.length === 3 ? raw.split("").map((char) => char + char).join("") : raw).toUpperCase();
        };
        const computedBox = (element: Element, slide: Element) => {
          const rect = element.getBoundingClientRect();
          const slideRect = slide.getBoundingClientRect();
          return {
            x: Number((rect.left - slideRect.left).toFixed(3)),
            y: Number((rect.top - slideRect.top).toFixed(3)),
            w: Number(rect.width.toFixed(3)),
            h: Number(rect.height.toFixed(3))
          };
        };
        const textOptionsFor = (element: Element) => {
          const style = window.getComputedStyle(element);
          const fontSize = Number(style.fontSize.replace("px", ""));
          const fontWeight = Number(style.fontWeight);
          return {
            fontFace: style.fontFamily.split(",")[0]?.replaceAll('"', "").trim() || undefined,
            fontSize,
            bold: Number.isNaN(fontWeight) ? style.fontWeight === "bold" : fontWeight >= 600,
            italic: style.fontStyle === "italic",
            color: toHex(style.color)
          };
        };
        const collectRuns = (root: Element) => {
          const runs: Array<{ text: string; options: ReturnType<typeof textOptionsFor> }> = [];
          const visit = (node: Node, styleSource: Element) => {
            if (node.nodeType === Node.TEXT_NODE) {
              let text = (node.textContent ?? "").replace(/\s+/g, " ");
              if (text.trim()) {
                if (runs.length === 0) {
                  text = text.trimStart();
                }
                runs.push({ text, options: textOptionsFor(styleSource) });
              }
              return;
            }
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              for (const child of Array.from(element.childNodes)) {
                visit(child, element);
              }
            }
          };
          for (const child of Array.from(root.childNodes)) {
            visit(child, root);
          }
          return runs.length > 0 ? runs : [{ text: normalizeText(root.textContent), options: textOptionsFor(root) }];
        };

        const renderableTags = ["ppt-text", "ppt-list", "ppt-image", "ppt-shape"];
        const layoutElement = (element: Element, slide: Element) => {
          const tag = element.tagName.toLowerCase();
          const box = computedBox(element, slide);
          const style = window.getComputedStyle(element);

          if (tag === "ppt-text") {
            const fontSize = Number(style.fontSize.replace("px", ""));
            const lineHeight = style.lineHeight === "normal" ? undefined : Number(style.lineHeight.replace("px", ""));
            const align = (style.textAlign === "center" || style.textAlign === "right" ? style.textAlign : "left") as
              | "left"
              | "center"
              | "right";
            const runs = collectRuns(element);
            return {
              type: "text" as const,
              text: normalizeText(element.textContent),
              ...box,
              style: {
                ...textOptionsFor(element),
                align,
                lineSpacingMultiple: lineHeight && fontSize ? Number((lineHeight / fontSize).toFixed(3)) : undefined
              },
              runs
            };
          }

          if (tag === "ppt-list") {
            const fontSize = Number(style.fontSize.replace("px", ""));
            const lineHeight = style.lineHeight === "normal" ? undefined : Number(style.lineHeight.replace("px", ""));
            const bulletIndent = Number(style.paddingLeft.replace("px", ""));
            return {
              type: "list" as const,
              ...box,
              items: Array.from(element.querySelectorAll(":scope > ppt-li")).map((item) => ({
                text: normalizeText(item.textContent),
                runs: collectRuns(item)
              })),
              style: {
                ...textOptionsFor(element),
                lineSpacingMultiple: lineHeight && fontSize ? Number((lineHeight / fontSize).toFixed(3)) : undefined,
                bulletIndent: Number.isNaN(bulletIndent) ? undefined : bulletIndent
              }
            };
          }

          if (tag === "ppt-image") {
            return {
              type: "image" as const,
              src: element.getAttribute("src") ?? "",
              fit: (element.getAttribute("fit") ?? "contain") as "contain" | "cover" | "fill",
              ...box
            };
          }

          const borderWidth = Number(style.borderLeftWidth.replace("px", ""));
          return {
            type: "shape" as const,
            kind: (element.getAttribute("kind") ?? "rect") as "rect" | "roundRect" | "ellipse" | "line",
            ...box,
            fill: toHex(style.backgroundColor),
            line:
              borderWidth > 0
                ? {
                    color: toHex(style.borderLeftColor),
                    width: borderWidth
                  }
                : undefined
          };
        };
        const collectElements = (container: Element, slide: Element): Array<ReturnType<typeof layoutElement>> => {
          const collected: Array<ReturnType<typeof layoutElement>> = [];
          for (const child of Array.from(container.children)) {
            const tag = child.tagName.toLowerCase();
            if (tag === "ppt-group") {
              collected.push(...collectElements(child, slide));
              continue;
            }
            if (renderableTags.includes(tag)) {
              collected.push(layoutElement(child, slide));
            }
          }
          return collected;
        };

        const slides = Array.from(deck.querySelectorAll(":scope > ppt-slide")).map((slide) => {
          const slideStyle = window.getComputedStyle(slide);
          const elements = collectElements(slide, slide);

          return {
            background: toHex(slideStyle.backgroundColor),
            elements
          };
        });

        return {
          size: (deck.getAttribute("size") ?? "wide") as "wide",
          slides
        };
      });
    } finally {
      await page.close();
    }
  },
  {
    async dispose(): Promise<void> {
      if (!browserPromise) {
        return;
      }
      const browser = await browserPromise;
      browserPromise = undefined;
      await browser.close();
    }
  }
);

async function getBrowser(): Promise<Browser> {
  browserPromise ??= chromium.launch({ headless: true }).catch((error: unknown) => {
    browserPromise = undefined;
    throw error;
  });
  return browserPromise;
}

function wrapHtml(html: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 1280px;
        height: 720px;
      }
      ppt-deck {
        display: block;
        width: 1280px;
      }
      ppt-slide {
        display: block;
        position: relative;
        width: 1280px;
        height: 720px;
        overflow: hidden;
        box-sizing: border-box;
      }
      ppt-text, ppt-list, ppt-image, ppt-shape, ppt-group {
        display: block;
        position: absolute;
        box-sizing: border-box;
      }
      ppt-li {
        display: list-item;
        list-style-position: outside;
      }
    </style>
  </head>
  <body>${html}</body>
</html>`;
}
