import test from "ava";
import { NPMPackContentProvider } from "npm-pkgbuild";

test.skip("NPMPack entries", async t => {
  const content = new NPMPackContentProvider();

  const entries = [];
  for await (const entry of content) {
    entries.push(entry);
  }

  t.deepEqual(
    entries.map(e => e.name).filter((x, i) => i < 2),
    ["LICENSE", "package.json"]
  );
});
