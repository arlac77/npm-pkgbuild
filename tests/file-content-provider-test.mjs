import test from "ava";
import { createContext } from "../src/context.mjs";
import { FileContentProvider } from "../src/content/file-content-provider.mjs";

test("FileContentProvider entries", async t => {
  const context = await createContext(new URL("..", import.meta.url).pathname);
  const content = new FileContentProvider({ dir: ""});

  const entries = [];
  for await (const entry of content.entries(context)) {
    entries.push(entry);
  }

  t.deepEqual(
    entries.map(e => e.name).filter((x, i) => i < 2),
    ["LICENSE", "package.json"]
  );
});
