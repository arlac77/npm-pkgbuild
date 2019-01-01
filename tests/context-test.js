import test from "ava";
import { createContext } from "../src/util";
import { join } from "path";

const fixturesDir = join(__dirname, "..", "tests", "fixtures");

test("context plain", async t => {
  const context = await createContext(fixturesDir);

  t.is(context.properties.description, "a description");
});
