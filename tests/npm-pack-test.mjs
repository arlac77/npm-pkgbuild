import test from "ava";
import { createContext } from "../src/context.mjs";
import { NPMPack } from "../src/content/npm-pack.mjs";

test("NPMPack entries", async t => {
  const context = await createContext(new URL("..", import.meta.url).pathname);
  const content = new NPMPack();

  const entries = [];
  for await (const entry of content.entries(context)) {
    entries.push(entry);
  }

  t.deepEqual(
    entries.map(e => e.name).filter((x, i) => i < 2),
    ["LICENSE", "package.json"]
  );
});
