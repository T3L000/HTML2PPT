import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
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

  test("converts the multi-slide showcase fixture", async () => {
    await rm("tmp/tests-cli", { recursive: true, force: true });
    await mkdir("tmp/tests-cli", { recursive: true });
    const outputPath = path.resolve("tmp/tests-cli/showcase.pptx");

    await execFileAsync(cmd, ["/c", "npm.cmd", "run", "build"]);
    const { stdout } = await execFileAsync("node", [
      "dist/cli.js",
      "fixtures/showcase.html",
      "-o",
      outputPath,
      "--base-dir",
      "."
    ]);

    expect(stdout).toContain("Wrote");
    expect(stdout).toContain("3 slides");
  });

  test("prints actionable diagnostics for invalid protocol", async () => {
    await rm("tmp/tests-cli", { recursive: true, force: true });
    await mkdir("tmp/tests-cli", { recursive: true });
    const inputPath = path.resolve("tmp/tests-cli/invalid.html");
    const outputPath = path.resolve("tmp/tests-cli/invalid.pptx");
    await writeFile(
      inputPath,
      `<ppt-deck>
  <ppt-slide>
    <ppt-text style="left:10%;top:0px;width:100px;height:30px;filter:blur(2px)">Nope</ppt-text>
  </ppt-slide>
</ppt-deck>`
    );

    await execFileAsync(cmd, ["/c", "npm.cmd", "run", "build"]);
    await expect(
      execFileAsync("node", ["dist/cli.js", inputPath, "-o", outputPath, "--base-dir", "."])
    ).rejects.toMatchObject({
      stderr: expect.stringContaining("fix:")
    });
  });
});
