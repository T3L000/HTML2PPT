import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);
const cmd = process.env.ComSpec ?? "cmd.exe";

describe("CLI", () => {
  test("converts a fixture HTML file to a PPTX", async () => {
    await rm("tmp/tests-cli", { recursive: true, force: true });
    await mkdir("tmp/tests-cli", { recursive: true });
    const outputPath = path.resolve("tmp/tests-cli/basic.pptx");

    await execFileAsync(cmd, ["/c", "npm.cmd", "run", "build"]);
    const { stdout } = await execFileAsync("node", [
      "dist/cli.js",
      "fixtures/basic.html",
      "-o",
      outputPath,
      "--base-dir",
      "."
    ]);

    expect(stdout).toContain("Wrote");
    expect(stdout).toContain("1 slide");
  });
});
