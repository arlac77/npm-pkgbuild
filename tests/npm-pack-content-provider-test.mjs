import test from "ava";
import { createContext, NPMPackContentProvider } from "npm-pkgbuild";

test("NPMPack entries", async t => {
  const context = await createContext(new URL("..", import.meta.url).pathname);
  const content = new NPMPackContentProvider();

  const entries = [];
  for await (const entry of content.entries(context)) {
    entries.push(entry);
  }

  t.deepEqual(
    entries.map(e => e.name).filter((x, i) => i < 2),
    ["LICENSE", "package.json"]
  );
});
