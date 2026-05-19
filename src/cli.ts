#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Html2PptError, convertHtmlToPptx, extractLayout } from "./index.js";
import type { TemplateData } from "./types.js";

interface CliOptions {
  inputPath: string;
  outputPath: string;
  baseDir?: string;
  dataPath?: string;
}

async function main(argv: string[]): Promise<void> {
  try {
    const options = parseArgs(argv);
    const templateData = options.dataPath ? await loadTemplateData(options.dataPath) : undefined;
    const result = await convertHtmlToPptx({
      filePath: options.inputPath,
      outputPath: options.outputPath,
      baseDir: options.baseDir,
      templateData
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
  let dataPath: string | undefined;

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
    if (arg === "--data") {
      dataPath = args.shift();
      if (!dataPath) {
        throw new Html2PptError(`Missing required --data path.\n${usage()}`);
      }
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
    baseDir,
    dataPath: dataPath ? path.resolve(dataPath) : undefined
  };
}

function usage(): string {
  return "Usage: html2ppt <input.html> -o <output.pptx> [--base-dir <dir>] [--data <data.json>]";
}

async function loadTemplateData(dataPath: string): Promise<TemplateData> {
  try {
    const parsed = JSON.parse(await readFile(dataPath, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Html2PptError("Template data JSON must be an object.");
    }
    return parsed as TemplateData;
  } catch (error) {
    if (error instanceof Html2PptError) {
      throw error;
    }
    throw new Html2PptError(`Failed to read template data from ${dataPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  if (error instanceof Html2PptError) {
    console.error(error.message);
    for (const diagnostic of error.diagnostics) {
      const location = diagnostic.path ? ` at ${diagnostic.path}` : "";
      const source = diagnostic.line ? ` ${diagnostic.line}:${diagnostic.column ?? 1}` : "";
      const property = diagnostic.property ? ` (${diagnostic.property}${diagnostic.value ? `: ${diagnostic.value}` : ""})` : "";
      console.error(`[${diagnostic.code}]${source}${location}${property} ${diagnostic.message}`);
      if (diagnostic.suggestion) {
        console.error(`  fix: ${diagnostic.suggestion}`);
      }
    }
  } else {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  }
  process.exitCode = 1;
});
