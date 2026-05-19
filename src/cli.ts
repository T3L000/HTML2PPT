#!/usr/bin/env node
import path from "node:path";
import { Html2PptError, convertHtmlToPptx, extractLayout } from "./index.js";

interface CliOptions {
  inputPath: string;
  outputPath: string;
  baseDir?: string;
}

async function main(argv: string[]): Promise<void> {
  try {
    const options = parseArgs(argv);
    const result = await convertHtmlToPptx({
      filePath: options.inputPath,
      outputPath: options.outputPath,
      baseDir: options.baseDir
    });
    const slideLabel = result.slideCount === 1 ? "slide" : "slides";
    console.log(`Wrote ${result.writtenPath} (${result.slideCount} ${slideLabel})`);
  } finally {
    await extractLayout.dispose();
  }
}

function parseArgs(argv: string[]): CliOptions {
  const args = [...argv];
  const inputPath = args.shift();
  if (!inputPath || inputPath === "-h" || inputPath === "--help") {
    throw new Html2PptError(usage());
  }

  let outputPath: string | undefined;
  let baseDir: string | undefined;

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === "-o" || arg === "--output") {
      outputPath = args.shift();
      continue;
    }
    if (arg === "--base-dir") {
      baseDir = args.shift();
      continue;
    }
    throw new Html2PptError(`Unknown argument: ${arg}\n${usage()}`);
  }

  if (!outputPath) {
    throw new Html2PptError(`Missing required -o/--output path.\n${usage()}`);
  }

  return {
    inputPath: path.resolve(inputPath),
    outputPath: path.resolve(outputPath),
    baseDir
  };
}

function usage(): string {
  return "Usage: html2ppt <input.html> -o <output.pptx> [--base-dir <dir>]";
}

main(process.argv.slice(2)).catch((error: unknown) => {
  if (error instanceof Html2PptError) {
    console.error(error.message);
    for (const diagnostic of error.diagnostics) {
      const location = diagnostic.path ? ` at ${diagnostic.path}` : "";
      const property = diagnostic.property ? ` (${diagnostic.property}${diagnostic.value ? `: ${diagnostic.value}` : ""})` : "";
      console.error(`[${diagnostic.code}]${location}${property} ${diagnostic.message}`);
    }
  } else {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  }
  process.exitCode = 1;
});
