import test from "ava";
import { join } from "node:path";
import { stat, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execa } from "execa";

test("cli --debian", async t => {
  const destination = await mkdtemp(join(tmpdir(), "cli-debian"));

  const p = await execa(
    new URL("../src/npm-pkgbuild-cli.mjs", import.meta.url).pathname,
    [
      "--verbose",
      "--debian",
      "-c",
      '/myservice:' + new URL("fixtures/content", import.meta.url).pathname,
      "-p",
      new URL("fixtures/pkg", import.meta.url).pathname,
      "--publish",
      destination
    ]
  );

  const fileName = join(
    destination,
    "myservice_1.2.3_all.deb"
  );

  const s = await stat(fileName);
  t.true(s.size >= 900, `package file size ${s.size}`);
});
