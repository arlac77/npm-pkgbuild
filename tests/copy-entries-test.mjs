import test from "ava";
import { access } from "fs/promises";
import { constants } from "fs";
import { ReadableStreamContentEntry } from "content-entry";
import { keyValueTransformer } from "key-value-transformer";

import { FileContentProvider, copyEntries } from "npm-pkgbuild";

test("copyEntries plain", async t => {
  const files = new FileContentProvider({
    base: new URL("fixtures/content", import.meta.url).pathname
  });

  await copyEntries(files, "/tmp", []);

  await access("/tmp/file1.txt", constants.F_OK);

  t.true(true);
});

test.only("copyEntries with transform", async t => {
  const files = new FileContentProvider({
    base: new URL("fixtures/content", import.meta.url).pathname
  });

  function* kv(k, v) {
    if (k !== undefined) {
      yield [k, v+v];
    }
  }

  await copyEntries(files, "/tmp", [
    {
      match: entry => entry.name === "file1.txt",
      transform: async entry =>
        new ReadableStreamContentEntry(
          entry.name,
          keyValueTransformer(await entry.readStream, kv)
        )
    }
  ]);

  await access("/tmp/file1.txt", constants.F_OK);

  t.true(true);
});
