import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import { Html2PptError } from "./errors.js";
import type { ScreenshotDeckOptions, ScreenshotSlide } from "./types.js";

let browserPromise: Promise<Browser> | undefined;

export const extractHtmlDeckScreenshots = Object.assign(
  async function extractHtmlDeckScreenshots(source: {
    html?: string;
    filePath?: string;
    baseDir?: string;
    options?: ScreenshotDeckOptions;
  }): Promise<ScreenshotSlide[]> {
    const width = source.options?.width ?? 1280;
    const height = source.options?.height ?? 720;
    const selector = source.options?.selector ?? "section.slide";
    const browser = await getBrowser();
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });

    try {
      await loadPage(page, source);
      await settlePage(page, source.options?.waitMs);

      const slideCount = await page.locator(selector).count();
      if (slideCount === 0) {
        throw new Html2PptError("No HTML slides found for screenshot mode.", [
          {
            severity: "error",
            code: "missing-html-slide",
            message: `Screenshot mode could not find any elements matching "${selector}".`,
            suggestion: `Add <section class="slide">...</section> pages or pass screenshot.selector for your slide elements.`
          }
        ]);
      }

      const screenshots: ScreenshotSlide[] = [];
      for (let index = 0; index < slideCount; index += 1) {
        await prepareSlideForScreenshot(page, selector, index, width, height);
        const png = await page.locator(selector).nth(index).screenshot({ type: "png" });
        screenshots.push({ png });
      }

      return screenshots;
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

async function settlePage(page: Page, waitMs = 150): Promise<void> {
  await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }
}

async function prepareSlideForScreenshot(
  page: Page,
  selector: string,
  index: number,
  width: number,
  height: number
): Promise<void> {
  await page.evaluate(
    ({ selector: slideSelector, index: slideIndex, width: viewportWidth, height: viewportHeight }) => {
      const slides = Array.from(document.querySelectorAll<HTMLElement>(slideSelector));
      const slide = slides[slideIndex];
      if (!slide) {
        throw new Error(`Missing slide at index ${slideIndex}.`);
      }

      const existing = document.getElementById("html2ppt-screenshot-style");
      existing?.remove();

      const style = document.createElement("style");
      style.id = "html2ppt-screenshot-style";
      style.textContent = `
        html, body {
          width: ${viewportWidth}px !important;
          height: ${viewportHeight}px !important;
          margin: 0 !important;
          overflow: hidden !important;
        }
        #deck {
          transform: translateX(-${slideIndex * 100}vw) !important;
          transition: none !important;
          animation: none !important;
        }
        *, *::before, *::after {
          transition-duration: 0s !important;
          animation-delay: 0s !important;
          animation-duration: 0s !important;
        }
      `;
      document.head.append(style);

      slide.scrollIntoView({ block: "nearest", inline: "nearest" });
    },
    { selector, index, width, height }
  );
  await page.waitForTimeout(50);
}

async function getBrowser(): Promise<Browser> {
  browserPromise ??= chromium.launch({ headless: true }).catch((error: unknown) => {
    browserPromise = undefined;
    throw error;
  });
  return browserPromise;
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
