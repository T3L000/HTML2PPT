export type DiagnosticSeverity = "error" | "warning";

export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  element?: string;
  property?: string;
  value?: string;
  path?: string;
}

export interface ProtocolValidationResult {
  valid: boolean;
  diagnostics: Diagnostic[];
}

export type DeckSize = "wide";

export type ElementType = "text" | "image" | "shape";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextRun {
  text: string;
  options: {
    fontFace?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
  };
}

export interface TextElement extends Box {
  type: "text";
  text: string;
  style: {
    fontFace?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
    align?: "left" | "center" | "right";
    lineSpacingMultiple?: number;
  };
  runs: TextRun[];
}

export interface ImageElement extends Box {
  type: "image";
  src: string;
  fit: "contain" | "cover" | "fill";
}

export interface ShapeElement extends Box {
  type: "shape";
  kind: "rect" | "roundRect" | "ellipse" | "line";
  fill?: string;
  line?: {
    color?: string;
    width?: number;
  };
}

export type SlideElement = TextElement | ImageElement | ShapeElement;

export interface SlideLayout {
  background?: string;
  elements: SlideElement[];
}

export interface DeckLayout {
  size: DeckSize;
  slides: SlideLayout[];
}

export interface ConvertHtmlToPptxSource {
  filePath?: string;
  html?: string;
  baseDir?: string;
  outputPath?: string;
}

export interface ConvertHtmlToPptxResult {
  buffer: Buffer;
  slideCount: number;
  diagnostics: Diagnostic[];
  writtenPath?: string;
}
