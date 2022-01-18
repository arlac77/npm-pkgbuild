import test from "ava";
import { NodeModulesContentProvider } from "npm-pkgbuild";

test("NodeModules entries", async t => {
  const content = new NodeModulesContentProvider({
    dir: new URL("fixtures/pkg", import.meta.url).pathname
  });

  const entries = [];
  for await (const entry of content) {
    console.log(entry.name);
    entries.push(entry);
  }

  t.deepEqual(
    entries.map(e => e.name).filter((x, i) => i < 1),
    ["node_modules/uti/LICENSE"]
  );
});
