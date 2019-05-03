import test from "ava";
import { join, dirname } from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { content } from "../src/content.mjs";
import { utf8StreamOptions } from "../src/util.mjs";
import { createContext } from "../src/context.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const fixturesDir = join(here, "..", "tests", "fixtures");

test("content simple", async t => {
  const context = await createContext(fixturesDir);

  const tmpDir = join(here, "..", "build");
  await content(context, tmpDir);

  const d = readFileSync(
    join(tmpDir, "/usr/lib/tmpfiles.d/myservice.conf"),
    utf8StreamOptions
  );

  t.regex(d, /\/run\/myservice/);

  const d2 = readFileSync(
    join(tmpDir, "/services/myservice/docroot1/content/file1.txt"),
    utf8StreamOptions
  );

  t.regex(d2, /file1.txt/);

  const d3 = readFileSync(
    join(tmpDir, "/services/myservice/docroot2/file2.json"),
    utf8StreamOptions
  );

  t.is(d3, "{}\n");
});
