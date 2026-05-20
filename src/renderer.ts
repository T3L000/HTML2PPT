import PptxGenJS from "pptxgenjs";
import { resolveImageSource } from "./assets.js";
import type { DeckLayout, ListElement, ScreenshotSlide, ShapeElement, SlideElement, TextElement } from "./types.js";

const pxPerInch = 96;
const pointsPerPx = 0.75;
const PptxGen = PptxGenJS as unknown as new () => PptxRuntime;

interface PptxRuntime {
  layout: string;
  author: string;
  subject: string;
  title: string;
  ShapeType: Record<string, string>;
  addSlide(): PptxSlide;
  write(props: { outputType: "nodebuffer" }): Promise<Buffer | Uint8Array | ArrayBuffer>;
}

interface PptxSlide {
  background?: { color: string };
  addText(text: string | Array<{ text: string; options: Record<string, unknown> }>, options: Record<string, unknown>): void;
  addImage(options: Record<string, unknown>): void;
  addShape(shapeName: string, options: Record<string, unknown>): void;
}

export async function renderPptx(deck: DeckLayout, baseDir: string): Promise<Buffer> {
  const pptx = new PptxGen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "html2ppt";
  pptx.subject = "Generated from controlled HTML";
  pptx.title = "html2ppt deck";

  for (const deckSlide of deck.slides) {
    const slide = pptx.addSlide();
    if (deckSlide.background) {
      slide.background = { color: deckSlide.background };
    }

    for (const element of deckSlide.elements) {
      renderElement(pptx, slide, element, baseDir);
    }
  }

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as Uint8Array);
}

export async function renderScreenshotPptx(screenshots: ScreenshotSlide[]): Promise<Buffer> {
  const pptx = new PptxGen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "html2ppt";
  pptx.subject = "Generated from HTML deck screenshots";
  pptx.title = "html2ppt screenshot deck";

  for (const screenshot of screenshots) {
    const slide = pptx.addSlide();
    slide.addImage({
      data: `data:image/png;base64,${screenshot.png.toString("base64")}`,
      x: 0,
      y: 0,
      w: 1280 / pxPerInch,
      h: 720 / pxPerInch
    });
  }

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as Uint8Array);
}

function renderElement(
  pptx: PptxRuntime,
  slide: PptxSlide,
  element: SlideElement,
  baseDir: string
): void {
  if (element.type === "text") {
    renderText(slide, element);
    return;
  }

  if (element.type === "list") {
    renderList(slide, element);
    return;
  }

  if (element.type === "image") {
    const imageSource = resolveImageSource(element.src, baseDir);
    slide.addImage({
      ...imageSource,
      ...position(element),
      sizing:
        element.fit === "fill"
          ? undefined
          : {
              type: element.fit,
              ...position(element)
            }
    });
    return;
  }

  const shapeOptions: Record<string, unknown> = {
    ...position(element),
    line: element.line ? { color: element.line.color, width: element.line.width } : { transparency: 100 }
  };
  if (element.kind !== "line") {
    shapeOptions.fill = element.fill ? { color: element.fill } : { transparency: 100 };
  }
  slide.addShape(shapeNameFor(pptx, element), shapeOptions);
}

function renderList(slide: PptxSlide, element: ListElement): void {
  const fontSize = element.style.fontSize ?? 18;
  const lineSpacing = element.style.lineSpacingMultiple ?? 1.25;
  const itemHeightPx = fontSize * lineSpacing;
  const itemGapPx = Math.max(4, fontSize * 0.2);

  element.items.forEach((item, index) => {
    const y = (element.y + index * (itemHeightPx + itemGapPx)) / pxPerInch;
    const options: Record<string, unknown> = {
      ...position(element),
      y,
      h: itemHeightPx / pxPerInch,
      fontFace: element.style.fontFace,
      fontSize,
      bold: element.style.bold,
      italic: element.style.italic,
      color: element.style.color,
      bullet: {
        type: "bullet",
        indent: element.style.bulletIndent ? element.style.bulletIndent * pointsPerPx : undefined
      },
      fit: "shrink",
      breakLine: false
    };

    if (item.runs.length > 1) {
      slide.addText(
        item.runs.map((run) => ({
          text: run.text,
          options: run.options
        })),
        options
      );
      return;
    }

    slide.addText(item.text, options);
  });
}

function renderText(slide: PptxSlide, element: TextElement): void {
  const options: Record<string, unknown> = {
    ...position(element),
    fontFace: element.style.fontFace,
    fontSize: element.style.fontSize,
    bold: element.style.bold,
    italic: element.style.italic,
    color: element.style.color,
    align: element.style.align,
    breakLine: false,
    fit: "shrink"
  };

  if (element.runs.length > 1) {
    slide.addText(
      element.runs.map((run) => ({
        text: run.text,
        options: run.options
      })),
      options
    );
    return;
  }

  slide.addText(element.text, options);
}

function shapeNameFor(pptx: PptxRuntime, element: ShapeElement): string {
  switch (element.kind) {
    case "ellipse":
      return pptx.ShapeType.ellipse;
    case "line":
      return pptx.ShapeType.line;
    case "roundRect":
      return pptx.ShapeType.roundRect;
    case "rect":
    default:
      return pptx.ShapeType.rect;
  }
}

function position(element: { x: number; y: number; w: number; h: number }): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  return {
    x: element.x / pxPerInch,
    y: element.y / pxPerInch,
    w: element.w / pxPerInch,
    h: element.h / pxPerInch
  };
}
