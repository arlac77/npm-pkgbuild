import test from "ava";
import { join } from "path";
import { content } from "../src/content";
import { readFileSync } from "fs";
import { createContext, utf8StreamOptions } from "../src/util";

const fixturesDir = join(__dirname, "..", "tests", "fixtures");

test("content simple", async t => {
  const context = await createContext(fixturesDir);

  const tmpDir = join(__dirname, "..", "build");
  await content(context, tmpDir);

  const d = readFileSync(
    join(tmpDir, "/usr/lib/tmpfiles.d/myservice.conf"),
    utf8StreamOptions
  );

  t.regex(d, /\/run\/myservice/);
});
