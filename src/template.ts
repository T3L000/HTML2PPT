import type { Diagnostic, TemplateData, TemplateValue } from "./types.js";

export interface TemplateRenderResult {
  html: string;
  diagnostics: Diagnostic[];
}

export function renderTemplate(html: string, data: TemplateData | undefined): TemplateRenderResult {
  const diagnostics: Diagnostic[] = [];
  const rendered = html.replace(/\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g, (match, rawPath: string, offset: number) => {
    const value = resolveTemplatePath(data, rawPath);
    if (value === undefined || (typeof value === "object" && value !== null)) {
      diagnostics.push({
        severity: "error",
        code: "missing-template-value",
        message: `Template variable "{{${rawPath}}}" has no scalar value.`,
        property: rawPath,
        value: match,
        ...lineColumnAt(html, offset),
        suggestion: `Add "${rawPath}" to templateData or remove the placeholder.`
      });
      return match;
    }
    return escapeHtml(String(value));
  });

  return { html: rendered, diagnostics };
}

function resolveTemplatePath(data: TemplateData | undefined, path: string): TemplateValue | undefined {
  if (!data) {
    return undefined;
  }
  let current: TemplateValue | undefined = data;
  for (const segment of path.split(".")) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function lineColumnAt(text: string, index: number): { line: number; column: number } {
  const before = text.slice(0, index);
  const lines = before.split(/\r\n|\n|\r/);
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1
  };
}
