import test from "ava";
import { access, mkdtemp, readFile } from "fs/promises";
import { constants } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { ReadableStreamContentEntry, StringContentEntry } from "content-entry";
import { transform } from "content-entry-transform";
import { keyValueTransformer } from "key-value-transformer";
import { aggregateFifo } from "aggregate-async-iterator";
import { FileContentProvider, copyEntries } from "npm-pkgbuild";


test("copyEntries destination base dir", async t => {
  async function * files() {
    const a = new StringContentEntry("a");
    a.destination = "/d1/d11/";
    yield a;

    const b = new StringContentEntry("b");
    b.destination = "/d2/d21";
    yield b;
  }

  const tmp = await mkdtemp(join(tmpdir(), "copy-"));

  for await (const entry of copyEntries(files(), tmp)) {
    switch(entry.name) {
      case 'a': t.is(entry.destination,"/d1/d11/a");
      break;
      case 'b': t.is(entry.destination,"/d2/d21");
      break;
    }
  }

  await access(join(tmp, "d1/d11/a"), constants.F_OK);
  await access(join(tmp, "d2/d21"), constants.F_OK);
  t.true(true);
});

test("copyEntries plain", async t => {
  const files = new FileContentProvider({
    base: new URL("fixtures/content", import.meta.url).pathname
  });

  const tmp = await mkdtemp(join(tmpdir(), "copy-"));

  for await (const entry of copyEntries(files, tmp)) {
    //console.log(entry.name, entry.destination);
  }

  await access(join(tmp, "file1.txt"), constants.F_OK);

  t.true(true);
});

test("copyEntries with transform", async t => {
  const files = new FileContentProvider({
    base: new URL("fixtures/content", import.meta.url).pathname
  });

  function* kv(k, v) {
    if (k !== undefined) {
      yield [k, v + v];
    }
  }

  const tmp = await mkdtemp(join(tmpdir(), "copy-transform-"));

  for await (const file of copyEntries(
    transform(aggregateFifo([files[Symbol.asyncIterator]()]), [
      {
        match: entry => entry.name === "file1.txt",
        transform: async entry =>
          new ReadableStreamContentEntry(
            entry.name,
            keyValueTransformer(await entry.readStream, kv)
          )
      }
    ]),
    tmp
  )) {
  }

  const content = await readFile(join(tmp, "file1.txt"), { encoding: "utf8" });
  t.truthy(content.match(/value1value1/));
});
