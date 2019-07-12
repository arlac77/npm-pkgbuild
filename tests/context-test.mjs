import test from "ava";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createContext } from "../src/context.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const fixturesDir = join(here, "..", "tests", "fixtures");

test("context plain", async t => {
  const context = await createContext(fixturesDir);

  t.is(context.properties.description, "a description");
});

test("context expand", async t => {
  const context = await createContext(fixturesDir);

  t.is(context.expand("a${name}b"), "amyserviceb");
  t.is(context.expand("${api.url}"), "http://somwhere.com/prefix/api");
  t.is(context.expand("${port}"), 8088);
  t.is(context.expand("${serviceURL}"), "/services/myservice");
  t.is(context.expand("${notfound}"), "");
});
