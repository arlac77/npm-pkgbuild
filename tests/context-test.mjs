import test from "ava";
import { join, dirname } from "path";
import { utf8StreamOptions } from "../src/util";
import { createContext } from "../src/context";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));

const fixturesDir = join(here, "..", "tests", "fixtures");

test("context plain", async t => {
  const context = await createContext(fixturesDir);

  t.is(context.properties.description, "a description");
});
