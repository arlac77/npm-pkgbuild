import test from "ava";
import { access, mkdtemp } from "fs/promises";
import { constants } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { ReadableStreamContentEntry } from "content-entry";
import { keyValueTransformer } from "key-value-transformer";
import { aggregateFifo } from "aggregate-async-iterator";
import { FileContentProvider, copyEntries, transform } from "npm-pkgbuild";

test("copyEntries plain", async t => {
  const files = new FileContentProvider({
    base: new URL("fixtures/content", import.meta.url).pathname
  });

  const tmp = await mkdtemp(join(tmpdir(), "copy-"));

  await copyEntries(files, tmp, []);

  await access(join(tmp, "file1.txt"), constants.F_OK);

  t.true(true);
});

test.only("copyEntries with transform", async t => {
  const files = new FileContentProvider({
    base: new URL("fixtures/content", import.meta.url).pathname
  });

  function* kv(k, v) {
    if (k !== undefined) {
      yield [k, v + v];
    }
  }

  const tmp = await mkdtemp(join(tmpdir(), "copy-transform-"));

  await copyEntries(
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
  );

  await access(join(tmp, "file1.txt"), constants.F_OK);

  t.true(true);
});
