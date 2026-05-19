import type { Diagnostic } from "./types.js";

export class Html2PptError extends Error {
  readonly diagnostics: Diagnostic[];

  constructor(message: string, diagnostics: Diagnostic[] = []) {
    super(message);
    this.name = "Html2PptError";
    this.diagnostics = diagnostics;
  }
}
