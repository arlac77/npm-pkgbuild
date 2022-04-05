import test from "ava";
import { NPMPackContentProvider } from "npm-pkgbuild";

test("NPMPack entries", async t => {
  const destination = "/somwhere/";

  const content = new NPMPackContentProvider(
    {
      dir: new URL("fixtures/pkg", import.meta.url).pathname
    },
    { destination }
  );

  const entries = {};
  for await (const entry of content) {
    entries[entry.name] = entry;
  }

  t.truthy(entries["package.json"]);

  const e = entries["package.json"];
  t.is(e.mode, 420);
  t.is(e.destination, destination);
});
