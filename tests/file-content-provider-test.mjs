import test from "ava";
import { createContext, FileContentProvider, utf8StreamOptions } from "npm-pkgbuild";
import { join } from "path";
import { cp, readFile } from "fs/promises";

test.only("FileContentProvider entries", async t => {
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

test("FileContentProvider copy", async t => {
  const context = await createContext(
    new URL("fixtures", import.meta.url).pathname
  );

  const content = new FileContentProvider({
    base: new URL("fixtures/content", import.meta.url).pathname,
    pattern: "**/*"
  });

  const tmpDir = new URL("../build", import.meta.url).pathname;

  for await (const entry of content.entries(context)) {
    console.log(join(tmpDir, entry.name));
    await cp(join(content.base, entry.name), join(tmpDir, entry.name));
  }

  /*
  const d1 = await readFile(
    join(tmpDir, "/usr/lib/tmpfiles.d/myservice.conf"),
    utf8StreamOptions
  );

  t.regex(d1, /\/run\/myservice/);
*/

  const d2 = await readFile(
    join(tmpDir, "/services/myservice/docroot1/content/file1.txt"),
    utf8StreamOptions
  );

  t.is(
    d2,
    `content of myservice file1.txt
{{ unknown value }}
/services/myservice
/services/myservice/api
`
  );

  const d3 = await readFile(
    join(tmpDir, "/services/myservice/docroot2/file2.json"),
    utf8StreamOptions
  );

  t.is(d3, "{}\n");
});
