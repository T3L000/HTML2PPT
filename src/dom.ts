import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import { Html2PptError } from "./errors.js";
import type { DomDeckExportResult, DomDeckOptions } from "./types.js";

let browserPromise: Promise<Browser> | undefined;
const require = createRequire(import.meta.url);

export const exportHtmlDeckDomPptx = Object.assign(
  async function exportHtmlDeckDomPptx(source: {
    html?: string;
    filePath?: string;
    baseDir?: string;
    options?: DomDeckOptions;
  }): Promise<DomDeckExportResult> {
    const width = source.options?.width ?? 1280;
    const height = source.options?.height ?? 720;
    const selector = source.options?.selector ?? "section.slide";
    const browser = await getBrowser();
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });

    try {
      await loadPage(page, source);
      await settlePage(page, source.options?.waitMs);
      await page.addScriptTag({ path: await resolveDomToPptxBundlePath() });
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            transition-duration: 0s !important;
            animation-delay: 0s !important;
            animation-duration: 0s !important;
          }
        `
      });

      const slideCount = await page.locator(selector).count();
      if (slideCount === 0) {
        throw new Html2PptError("No HTML slides found for DOM mode.", [
          {
            severity: "error",
            code: "missing-html-slide",
            message: `DOM mode could not find any elements matching "${selector}".`,
            suggestion: `Add <section class="slide">...</section> pages or pass dom.selector for your slide elements.`
          }
        ]);
      }

      const bytes = await page.evaluate(
        async ({ selector: slideSelector, autoEmbedFonts, svgAsVector }) => {
          const slides = Array.from(document.querySelectorAll<HTMLElement>(slideSelector));
          const exporter = (
            window as Window & {
              domToPptx?: {
                exportToPptx(
                  elements: HTMLElement[],
                  options: Record<string, unknown>
                ): Promise<Blob>;
              };
            }
          ).domToPptx;

          if (!exporter) {
            throw new Error("dom-to-pptx browser bundle did not expose window.domToPptx.");
          }

          const blob = await exporter.exportToPptx(slides, {
            fileName: "html2ppt-dom-export.pptx",
            skipDownload: true,
            autoEmbedFonts,
            svgAsVector,
            layout: "LAYOUT_WIDE"
          });
          return Array.from(new Uint8Array(await blob.arrayBuffer()));
        },
        {
          selector,
          autoEmbedFonts: source.options?.autoEmbedFonts ?? false,
          svgAsVector: source.options?.svgAsVector ?? true
        }
      );

      return {
        buffer: Buffer.from(bytes),
        slideCount
      };
    } catch (error) {
      if (error instanceof Html2PptError) {
        throw error;
      }
      throw new Html2PptError(error instanceof Error ? error.message : "DOM export failed.");
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

async function loadPage(
  page: Page,
  source: { html?: string; filePath?: string; baseDir?: string }
): Promise<void> {
  if (source.filePath) {
    await page.goto(pathToFileURL(path.resolve(source.filePath)).href, { waitUntil: "load" });
    return;
  }

  await page.setContent(withBaseHref(source.html ?? "", source.baseDir), { waitUntil: "load" });
}

async function settlePage(page: Page, waitMs = 250): Promise<void> {
  await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }
}

async function getBrowser(): Promise<Browser> {
  browserPromise ??= chromium.launch({ headless: true }).catch((error: unknown) => {
    browserPromise = undefined;
    throw error;
  });
  return browserPromise;
}

async function resolveDomToPptxBundlePath(): Promise<string> {
  const entryPath = require.resolve("dom-to-pptx");
  const bundlePath = path.join(path.dirname(entryPath), "dom-to-pptx.bundle.js");
  await readFile(bundlePath);
  return bundlePath;
}

function withBaseHref(html: string, baseDir: string | undefined): string {
  if (!baseDir) {
    return html;
  }

  const href = pathToFileURL(`${path.resolve(baseDir)}${path.sep}`).href;
  const base = `<base href="${href}">`;
  if (/<base\s/i.test(html)) {
    return html;
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${base}`);
  }
  return `${base}${html}`;
}
