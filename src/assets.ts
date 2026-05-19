import { access } from "node:fs/promises";
import path from "node:path";
import type { DeckLayout, Diagnostic } from "./types.js";

export async function validateAssets(deck: DeckLayout, baseDir: string): Promise<Diagnostic[]> {
  const diagnostics: Diagnostic[] = [];

  for (const [slideIndex, slide] of deck.slides.entries()) {
    for (const [elementIndex, element] of slide.elements.entries()) {
      if (element.type !== "image" || element.src.startsWith("data:")) {
        continue;
      }

      const filePath = path.resolve(baseDir, element.src);
      try {
        await access(filePath);
      } catch {
        diagnostics.push({
          severity: "error",
          code: "missing-asset",
          message: `Image asset was not found: ${element.src}`,
          element: "ppt-image",
          property: "src",
          value: element.src,
          path: `ppt-deck > ppt-slide:nth-child(${slideIndex + 1}) > ppt-image:nth-child(${elementIndex + 1})`,
          suggestion: `Place the image at ${filePath}, update src to the correct relative path, or use a data:image/... URL.`
        });
      }
    }
  }

  return diagnostics;
}

export function resolveImageSource(src: string, baseDir: string): { path?: string; data?: string } {
  if (src.startsWith("data:")) {
    return { data: src.replace(/^data:/, "") };
  }
  return { path: path.resolve(baseDir, src) };
}
