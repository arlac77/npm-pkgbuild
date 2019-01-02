import test from "ava";
import { join } from "path";
import { utf8StreamOptions } from "../src/util";
import { createContext } from "../src/context";

const fixturesDir = join(__dirname, "..", "tests", "fixtures");

test("context plain", async t => {
  const context = await createContext(fixturesDir);

  t.is(context.properties.description, "a description");
});
