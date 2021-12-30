import test from "ava";
import { join } from "path";
import { stat, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { execa } from "execa";

test("cli --deb", async t => {
  const destination = await mkdtemp(join(tmpdir(), "cli-deb"));

  const p = await execa(
    new URL("../src/npm-pkgbuild-cli.mjs", import.meta.url).pathname,
    [
      "--deb",
      "-c",
      new URL("fixtures/content", import.meta.url).pathname,
      "-m",
      new URL("fixtures/deb", import.meta.url).pathname,
      "--destination", destination
    ]
  );

  const fileName = join(destination,"npm-pkgbuild_0.0.0-semantic-release_all.deb");
  const s = await stat(fileName);
  t.true(s.size >= 900, `package file size ${s.size}`);
});
