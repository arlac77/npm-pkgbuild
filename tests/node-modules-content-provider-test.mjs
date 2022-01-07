import test from "ava";
import { NodeModulesContentProvider } from "npm-pkgbuild";

test.skip("NodeModules entries", async t => {
  const content = new NodeModulesContentProvider({
    dir: new URL("fixtures/pkg", import.meta.url).pathname
  });

  const entries = [];
  for await (const entry of content) {
    entries.push(entry);
  }

  t.deepEqual(
    entries.map(e => e.name).filter((x, i) => i < 1),
    ["node_modules/a/file1.js"]
  );
});
