import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateAssets } from "./assets.js";
import { exportHtmlDeckDomPptx } from "./dom.js";
import { Html2PptError } from "./errors.js";
import { extractLayout } from "./layout.js";
import { renderPptx, renderScreenshotPptx } from "./renderer.js";
import { extractHtmlDeckScreenshots } from "./screenshot.js";
import { renderTemplate } from "./template.js";
import type { ConvertHtmlToPptxResult, ConvertHtmlToPptxSource, Diagnostic } from "./types.js";

export type {
  ConvertHtmlToPptxResult,
  ConvertHtmlToPptxSource,
  DeckLayout,
  Diagnostic,
  DomDeckExportResult,
  DomDeckOptions,
  ImageElement,
  ListElement,
  ListItem,
  ShapeElement,
  SlideElement,
  SlideLayout,
  ScreenshotDeckOptions,
  ScreenshotSlide,
  TemplateData,
  TemplatePrimitive,
  TemplateValue,
  TextElement
} from "./types.js";
export { Html2PptError } from "./errors.js";
export { exportHtmlDeckDomPptx } from "./dom.js";
export { extractLayout } from "./layout.js";
export { extractHtmlDeckScreenshots } from "./screenshot.js";
export { renderTemplate } from "./template.js";
export { validateHtmlProtocol } from "./protocol.js";

export async function convertHtmlToPptx(source: ConvertHtmlToPptxSource): Promise<ConvertHtmlToPptxResult> {
  const loadedHtml = await loadHtml(source);
  const template = renderTemplate(loadedHtml, source.templateData);
  if (template.diagnostics.length > 0) {
    throw new Html2PptError("Template rendering failed.", template.diagnostics);
  }
  const html = template.html;
  const baseDir = path.resolve(source.baseDir ?? (source.filePath ? path.dirname(source.filePath) : "."));

  if (source.mode === "screenshot") {
    const shouldUseRenderedHtml = Boolean(source.html || source.templateData);
    const screenshots = await extractHtmlDeckScreenshots({
      html: shouldUseRenderedHtml ? html : undefined,
      filePath: shouldUseRenderedHtml ? undefined : source.filePath,
      baseDir,
      options: source.screenshot
    });
    const buffer = await renderScreenshotPptx(screenshots);
    if (source.outputPath) {
      await mkdir(path.dirname(source.outputPath), { recursive: true });
      await writeFile(source.outputPath, buffer);
    }

    return {
      buffer,
      slideCount: screenshots.length,
      diagnostics: [] satisfies Diagnostic[],
      writtenPath: source.outputPath
    };
  }

  if (source.mode === "dom") {
    const shouldUseRenderedHtml = Boolean(source.html || source.templateData);
    const result = await exportHtmlDeckDomPptx({
      html: shouldUseRenderedHtml ? html : undefined,
      filePath: shouldUseRenderedHtml ? undefined : source.filePath,
      baseDir,
      options: source.dom
    });
    if (source.outputPath) {
      await mkdir(path.dirname(source.outputPath), { recursive: true });
      await writeFile(source.outputPath, result.buffer);
    }

    return {
      buffer: result.buffer,
      slideCount: result.slideCount,
      diagnostics: [] satisfies Diagnostic[],
      writtenPath: source.outputPath
    };
  }

  let deck;
  try {
    deck = await extractLayout(html);
  } catch (error) {
    if (error instanceof Html2PptError) {
      throw error;
    }
    throw new Html2PptError(error instanceof Error ? error.message : "Layout extraction failed.");
  }

  const assetDiagnostics = await validateAssets(deck, baseDir);
  if (assetDiagnostics.length > 0) {
    throw new Html2PptError("Asset validation failed.", assetDiagnostics);
  }

  const buffer = await renderPptx(deck, baseDir);
  if (source.outputPath) {
    await mkdir(path.dirname(source.outputPath), { recursive: true });
    await writeFile(source.outputPath, buffer);
  }

  return {
    buffer,
    slideCount: deck.slides.length,
    diagnostics: [] satisfies Diagnostic[],
    writtenPath: source.outputPath
  };
}

async function loadHtml(source: ConvertHtmlToPptxSource): Promise<string> {
  if (source.html && source.filePath) {
    throw new Html2PptError("Provide either html or filePath, not both.");
  }
  if (source.html) {
    return source.html;
  }
  if (source.filePath) {
    return readFile(source.filePath, "utf8");
  }
  throw new Html2PptError("Provide html or filePath.");
}
