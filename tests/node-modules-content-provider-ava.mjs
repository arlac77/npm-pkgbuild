import test from "ava";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { constants } from "node:fs";
import { NodeModulesContentProvider } from "npm-pkgbuild";
import { access, mkdtemp } from "node:fs/promises";
import { copyEntries } from "npm-pkgbuild";

test("NodeModules entries", async t => {
  const content = new NodeModulesContentProvider({
    dir: new URL("fixtures/pkg", import.meta.url).pathname
  });

  t.is(content.dir, new URL("fixtures/pkg", import.meta.url).pathname);

  const tmp = await mkdtemp(
    join(tmpdir(), "NodeModulesContentProvider-destination")
  );

  const entries = await Array.fromAsync(copyEntries(content, tmp));

  await access(join(tmp, "uti/package.json"), constants.F_OK);
  await access(join(tmp, "uti/src/uti.mjs"), constants.F_OK);
  await access(join(tmp, "uti/src/well-known-utis.mjs"), constants.F_OK);
  t.true(true);
});

test("NodeModules entries withoutDevelpmentDependencies=false", async t => {
  const content = new NodeModulesContentProvider({
    withoutDevelpmentDependencies: false,
    dir: new URL("fixtures/pkg", import.meta.url).pathname
  });

  const entries = await Array.fromAsync(content);

  console.log(entries);

  t.is(entries.length, 0); // not actually filled node-modules
});
