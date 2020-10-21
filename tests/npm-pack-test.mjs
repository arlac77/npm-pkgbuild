import test from "ava";
import { createContext } from "../src/context.mjs";
import { NPMPack } from "../src/content/npm-pack.mjs";

test("NPMPack entries", async t => {
  const context = await createContext(new URL('..',import.meta.url).pathname);
  const content = new NPMPack();

  let e;
  for await (const entry of content.entries(context)) {
      e = entry;
  }

  console.log(e);
  t.truthy(e)
});
