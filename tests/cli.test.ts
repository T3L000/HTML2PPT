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

  test("renders a template with JSON data", async () => {
    await rm("tmp/tests-cli", { recursive: true, force: true });
    await mkdir("tmp/tests-cli", { recursive: true });
    const inputPath = path.resolve("tmp/tests-cli/template.html");
    const dataPath = path.resolve("tmp/tests-cli/data.json");
    const outputPath = path.resolve("tmp/tests-cli/template.pptx");

    await writeFile(
      inputPath,
      `<ppt-deck>
  <ppt-slide>
    <ppt-text style="left:80px;top:60px;width:900px;height:120px;font-size:44px">{{title}}</ppt-text>
  </ppt-slide>
</ppt-deck>`
    );
    await writeFile(dataPath, JSON.stringify({ title: "Template CLI Deck" }));

    await execFileAsync(cmd, ["/c", "npm.cmd", "run", "build"]);
    const { stdout } = await execFileAsync("node", [
      "dist/cli.js",
      inputPath,
      "-o",
      outputPath,
      "--base-dir",
      ".",
      "--data",
      dataPath
    ]);

    expect(stdout).toContain("Wrote");
    expect(stdout).toContain("1 slide");
  });

  test("converts normal HTML slides with screenshot mode", async () => {
    await rm("tmp/tests-cli", { recursive: true, force: true });
    await mkdir("tmp/tests-cli", { recursive: true });
    const inputPath = path.resolve("tmp/tests-cli/html-deck.html");
    const outputPath = path.resolve("tmp/tests-cli/html-deck.pptx");
    await writeFile(
      inputPath,
      `<!doctype html>
<html>
  <head>
    <style>
      html, body { margin: 0; width: 1280px; height: 720px; overflow: hidden; }
      #deck { display: flex; width: 200vw; height: 100vh; }
      section.slide { width: 100vw; height: 100vh; flex: 0 0 100vw; display: grid; place-items: center; font: 64px serif; }
      .one { background: #102030; color: white; }
      .two { background: #f3efe7; color: #102030; }
    </style>
  </head>
  <body>
    <main id="deck">
      <section class="slide one">One</section>
      <section class="slide two">Two</section>
    </main>
  </body>
</html>`
    );

    await execFileAsync(cmd, ["/c", "npm.cmd", "run", "build"]);
    const { stdout } = await execFileAsync("node", [
      "dist/cli.js",
      inputPath,
      "-o",
      outputPath,
      "--mode",
      "screenshot"
    ]);

    expect(stdout).toContain("Wrote");
    expect(stdout).toContain("2 slides");
  });

  test("converts normal HTML slides with experimental DOM mode", async () => {
    await rm("tmp/tests-cli", { recursive: true, force: true });
    await mkdir("tmp/tests-cli", { recursive: true });
    const inputPath = path.resolve("tmp/tests-cli/dom-deck.html");
    const outputPath = path.resolve("tmp/tests-cli/dom-deck.pptx");
    await writeFile(
      inputPath,
      `<!doctype html>
<html>
  <head>
    <style>
      html, body { margin: 0; width: 1280px; height: 720px; background: #222; }
      section.slide { width: 1280px; height: 720px; position: relative; background: #f6f0e4; color: #111; overflow: hidden; }
      h1 { position: absolute; left: 80px; top: 60px; margin: 0; font-size: 64px; }
      .box { position: absolute; left: 96px; top: 210px; width: 480px; height: 180px; border-radius: 20px; background: white; padding: 28px; font-size: 30px; }
    </style>
  </head>
  <body>
    <section class="slide">
      <h1>DOM CLI Deck</h1>
      <div class="box">Editable DOM export</div>
    </section>
  </body>
</html>`
    );

    await execFileAsync(cmd, ["/c", "npm.cmd", "run", "build"]);
    const { stdout } = await execFileAsync("node", [
      "dist/cli.js",
      inputPath,
      "-o",
      outputPath,
      "--mode",
      "dom"
    ]);

    expect(stdout).toContain("Wrote");
    expect(stdout).toContain("1 slide");
  });
});
