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

  t.truthy(entries["node_modules/uti/package.json"]);

  t.is(Object.entries(entries).length, 3);
});


test("NodeModules entries withoutDevelpmentDependencies=false", async t => {
  const content = new NodeModulesContentProvider({
    withoutDevelpmentDependencies: false,
    dir: new URL("fixtures/pkg", import.meta.url).pathname
  });

  const entries = [];
  for await (const entry of content) {
    entries[entry.name] = entry;
  }

 // t.truthy(entries["node_modules/uti/package.json"]);

 // console.log(Object.entries(entries).length);

  t.is(Object.entries(entries).length, 0); // not actually filled node-modules
});
