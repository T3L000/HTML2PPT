import type { Diagnostic, ProtocolValidationResult } from "./types.js";

const exportableTags = new Set(["ppt-text", "ppt-list", "ppt-image", "ppt-shape"]);
const allowedTags = new Set(["ppt-deck", "ppt-slide", "ppt-text", "ppt-list", "ppt-li", "ppt-image", "ppt-shape", "span"]);
const voidTags = new Set(["ppt-image"]);

const allowedStylesByTag: Record<string, Set<string>> = {
  "ppt-deck": new Set(),
  "ppt-slide": new Set(["background", "background-color"]),
  "ppt-text": new Set([
    "left",
    "top",
    "width",
    "height",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "color",
    "text-align",
    "line-height"
  ]),
  "ppt-list": new Set([
    "left",
    "top",
    "width",
    "height",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "color",
    "line-height",
    "padding-left"
  ]),
  "ppt-li": new Set(["font-family", "font-size", "font-weight", "font-style", "color"]),
  "ppt-image": new Set(["left", "top", "width", "height"]),
  "ppt-shape": new Set([
    "left",
    "top",
    "width",
    "height",
    "background",
    "background-color",
    "border",
    "border-color",
    "border-style",
    "border-width"
  ]),
  span: new Set(["font-family", "font-size", "font-weight", "font-style", "color"])
};

const geometryProperties = ["left", "top", "width", "height"] as const;

interface ParsedTag {
  name: string;
  attrs: Record<string, string>;
  closing: boolean;
  selfClosing: boolean;
}

export function validateHtmlProtocol(html: string): ProtocolValidationResult {
  const diagnostics: Diagnostic[] = [];
  const tokens = parseTags(html);
  const openStack: string[] = [];
  let deckCount = 0;
  let slideCount = 0;
  let firstElement: string | undefined;

  for (const token of tokens) {
    if (!firstElement && !token.closing) {
      firstElement = token.name;
    }

    if (token.closing) {
      unwindStack(openStack, token.name);
      continue;
    }

    const path = [...openStack, token.name].join(" > ");
    if (!allowedTags.has(token.name)) {
      diagnostics.push({
        severity: "error",
        code: "unsupported-element",
        message: `Unsupported element <${token.name}>. V1 only supports ppt-deck, ppt-slide, ppt-text, ppt-list, ppt-li, ppt-image, ppt-shape, and span.`,
        element: token.name,
        path
      });
    }

    if (token.name === "ppt-deck") {
      deckCount += 1;
      if (openStack.length > 0) {
        diagnostics.push({
          severity: "error",
          code: "invalid-parent",
          message: "<ppt-deck> must be the root element.",
          element: token.name,
          path
        });
      }
    }

    if (token.name === "ppt-slide") {
      slideCount += 1;
      if (openStack.at(-1) !== "ppt-deck") {
        diagnostics.push({
          severity: "error",
          code: "invalid-parent",
          message: "<ppt-slide> must be a direct child of <ppt-deck>.",
          element: token.name,
          path
        });
      }
    }

    if (exportableTags.has(token.name) && openStack.at(-1) !== "ppt-slide") {
      diagnostics.push({
        severity: "error",
        code: "invalid-parent",
        message: `<${token.name}> must be a direct child of <ppt-slide>.`,
        element: token.name,
        path
      });
    }

    if (token.name === "ppt-li" && openStack.at(-1) !== "ppt-list") {
      diagnostics.push({
        severity: "error",
        code: "invalid-parent",
        message: "<ppt-li> must be a direct child of <ppt-list>.",
        element: token.name,
        path
      });
    }

    if (token.name === "span" && !openStack.includes("ppt-text") && !openStack.includes("ppt-li")) {
      diagnostics.push({
        severity: "error",
        code: "invalid-parent",
        message: "<span> is only supported inside <ppt-text> or <ppt-li>.",
        element: token.name,
        path
      });
    }

    validateAttributes(token, path, diagnostics);

    if (!token.selfClosing && !voidTags.has(token.name)) {
      openStack.push(token.name);
    }
  }

  if (firstElement !== "ppt-deck" || deckCount === 0) {
    diagnostics.push({
      severity: "error",
      code: "missing-deck",
      message: "Input must contain a <ppt-deck> root element."
    });
  }

  if (deckCount > 1) {
    diagnostics.push({
      severity: "error",
      code: "multiple-decks",
      message: "Input must contain exactly one <ppt-deck> element.",
      element: "ppt-deck"
    });
  }

  if (deckCount > 0 && slideCount === 0) {
    diagnostics.push({
      severity: "error",
      code: "missing-slide",
      message: "<ppt-deck> must contain at least one <ppt-slide>.",
      element: "ppt-slide"
    });
  }

  return {
    valid: diagnostics.length === 0,
    diagnostics
  };
}

function validateAttributes(token: ParsedTag, path: string, diagnostics: Diagnostic[]): void {
  const style = parseStyle(token.attrs.style ?? "");
  const allowedStyles = allowedStylesByTag[token.name] ?? new Set<string>();

  for (const [property, value] of Object.entries(style)) {
    if (!allowedStyles.has(property)) {
      diagnostics.push({
        severity: "error",
        code: "unsupported-style",
        message: `Unsupported CSS property "${property}" on <${token.name}>.`,
        element: token.name,
        property,
        value,
        path
      });
      continue;
    }

    if (value.toLowerCase().includes("gradient(")) {
      diagnostics.push({
        severity: "error",
        code: "unsupported-style",
        message: `Unsupported CSS value "${value}" on <${token.name}>.`,
        element: token.name,
        property,
        value,
        path
      });
    }
  }

  if (exportableTags.has(token.name)) {
    for (const property of geometryProperties) {
      const value = style[property];
      if (!isPixelLength(value, property === "width" || property === "height")) {
        diagnostics.push({
          severity: "error",
          code: "invalid-geometry",
          message: `<${token.name}> requires explicit ${property} geometry in px.`,
          element: token.name,
          property,
          value,
          path
        });
      }
    }
  }

  if (token.name === "ppt-image") {
    const fit = token.attrs.fit ?? "contain";
    if (!["contain", "cover", "fill"].includes(fit)) {
      diagnostics.push({
        severity: "error",
        code: "invalid-attribute",
        message: '<ppt-image> fit must be "contain", "cover", or "fill".',
        element: token.name,
        property: "fit",
        value: fit,
        path
      });
    }
    if (!token.attrs.src) {
      diagnostics.push({
        severity: "error",
        code: "missing-asset",
        message: "<ppt-image> requires a src attribute.",
        element: token.name,
        property: "src",
        path
      });
    }
  }

  if (token.name === "ppt-list" && style["padding-left"] && !isPixelLength(style["padding-left"], false)) {
    diagnostics.push({
      severity: "error",
      code: "invalid-style-value",
      message: "<ppt-list> padding-left must be expressed in px.",
      element: token.name,
      property: "padding-left",
      value: style["padding-left"],
      path
    });
  }

  if (token.name === "ppt-shape") {
    const kind = token.attrs.kind ?? "rect";
    if (!["rect", "roundRect", "ellipse", "line"].includes(kind)) {
      diagnostics.push({
        severity: "error",
        code: "invalid-attribute",
        message: '<ppt-shape> kind must be "rect", "roundRect", "ellipse", or "line".',
        element: token.name,
        property: "kind",
        value: kind,
        path
      });
    }
  }
}

export function parseStyle(style: string): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const declaration of style.split(";")) {
    const [rawProperty, ...rawValue] = declaration.split(":");
    if (!rawProperty || rawValue.length === 0) {
      continue;
    }
    const property = rawProperty.trim().toLowerCase();
    const value = rawValue.join(":").trim();
    if (property && value) {
      entries[property] = value;
    }
  }
  return entries;
}

function isPixelLength(value: string | undefined, mustBePositive: boolean): boolean {
  if (!value) {
    return false;
  }
  const match = value.match(/^(-?\d+(?:\.\d+)?)px$/i);
  if (!match) {
    return false;
  }
  const numberValue = Number(match[1]);
  return mustBePositive ? numberValue > 0 : numberValue >= 0;
}

function parseTags(html: string): ParsedTag[] {
  const tags: ParsedTag[] = [];
  const tagPattern = /<\s*(\/)?\s*([a-zA-Z][\w-]*)\b([^>]*)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html))) {
    const rawAttrs = match[3] ?? "";
    if ((match[0] ?? "").startsWith("<!--")) {
      continue;
    }
    tags.push({
      name: (match[2] ?? "").toLowerCase(),
      attrs: parseAttributes(rawAttrs),
      closing: Boolean(match[1]),
      selfClosing: /\/\s*>$/.test(match[0])
    });
  }

  return tags;
}

function parseAttributes(rawAttrs: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(rawAttrs))) {
    const key = (match[1] ?? "").toLowerCase();
    attrs[key] = match[2] ?? match[3] ?? match[4] ?? "";
  }

  return attrs;
}

function unwindStack(openStack: string[], closingTag: string): void {
  const lastIndex = openStack.lastIndexOf(closingTag);
  if (lastIndex === -1) {
    return;
  }
  openStack.splice(lastIndex);
}
