import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateAssets } from "./assets.js";
import { Html2PptError } from "./errors.js";
import { extractLayout } from "./layout.js";
import { renderPptx } from "./renderer.js";
import type { ConvertHtmlToPptxResult, ConvertHtmlToPptxSource, Diagnostic } from "./types.js";

export type {
  ConvertHtmlToPptxResult,
  ConvertHtmlToPptxSource,
  DeckLayout,
  Diagnostic,
  ImageElement,
  ListElement,
  ListItem,
  ShapeElement,
  SlideElement,
  SlideLayout,
  TextElement
} from "./types.js";
export { Html2PptError } from "./errors.js";
export { extractLayout } from "./layout.js";
export { validateHtmlProtocol } from "./protocol.js";

export async function convertHtmlToPptx(source: ConvertHtmlToPptxSource): Promise<ConvertHtmlToPptxResult> {
  const html = await loadHtml(source);
  const baseDir = path.resolve(source.baseDir ?? (source.filePath ? path.dirname(source.filePath) : "."));

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
