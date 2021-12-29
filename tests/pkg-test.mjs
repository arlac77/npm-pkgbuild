import test from "ava";
import { join } from "path";
import { stat, mkdtemp } from "fs/promises";
import { tmpdir } from "os";

import { aggregateFifo } from "aggregate-async-iterator";
import { FileContentProvider, PKG } from "npm-pkgbuild";

test("pkg", async t => {
  const sources = ["fixtures/content", "fixtures/pkg"].map(source =>
    new FileContentProvider({
      base: new URL(source, import.meta.url).pathname
    })[Symbol.asyncIterator]()
  );

  const properties = { name: "abc", version: "1.0.0" };

  const out = new PKG(properties);

  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const fileName = await out.execute(aggregateFifo(sources), { destination });
  t.is(fileName, join(destination, "abc-1.0.0-0-any.pkg.tar.zst"));

  const s = await stat(fileName);
  t.true(s.size >= 1500, `package file size ${s.size}`);
});
