import test from "ava";
import { NodeModulesContentProvider } from "npm-pkgbuild";

test("NodeModules entries", async t => {
  const content = new NodeModulesContentProvider({
    dir: new URL("fixtures/pkg", import.meta.url).pathname
  });

  const entries = [];
  for await (const entry of content) {
    entries[entry.name] = entry;
  }

  t.truthy(entries["node_modules/uti/LICENSE"]);

  t.is(Object.entries(entries).length, 4);
});
