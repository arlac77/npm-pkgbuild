import test from "ava";
import { execa } from "execa";

test("cli", async t => {
  const p = await execa(
    new URL("../src/npm-pkgbuild-cli.mjs", import.meta.url).pathname,
    [
      "--deb",
      "-c",
      new URL("fixtures/content", import.meta.url).pathname,
      "-m",
      new URL("fixtures/deb", import.meta.url).pathname,
      "--destination", "/tmp"
    ]
  );

  t.true(p.stdout.endsWith("npm-pkgbuild_0.0.0-semantic-release_any.deb"))
});
