import test from "ava";
import { createContext, FileContentProvider } from "npm-pkgbuild";

test("FileContentProvider entries", async t => {
  const context = await createContext(new URL("..", import.meta.url).pathname);
  const content = new FileContentProvider({
    base: new URL("fixtures/content", import.meta.url).pathname,
    pattern: "**/*"
  });

  const entries = [];
  for await (const entry of content.entries(context)) {
    entries.push(entry);
  }

  t.deepEqual(
    entries.map(e => e.name).filter((x, i) => i < 2),
    ["LICENSE", "package.json"]
  );
});
