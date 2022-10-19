import test from "ava";
import { NFTContentProvider } from "npm-pkgbuild";

test("NFTContentProvider entries", async t => {
  const destination = "/somwhere/";

  const content = new NFTContentProvider(
    {
      start: [new URL("fixtures/pkg/main.mjs", import.meta.url).pathname],
     // dir: new URL("fixtures/pkg", import.meta.url).pathname
    },
    { destination }
  );

  const entries = {};
  for await (const entry of content) {
    entries[entry.name] = entry;
  }

  t.truthy(entries["tests/fixtures/pkg/main.mjs"]);

  const e = entries["tests/fixtures/pkg/main.mjs"];
  t.is(e.mode, 420);
  t.is(e.destination, destination);
});
