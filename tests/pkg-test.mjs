import test from "ava";
import { join } from "path";
import { stat } from "fs/promises";
import { aggregateFifo } from "aggregate-async-iterator";
import { FileContentProvider, PKG } from "npm-pkgbuild";

test("pkg", async t => {
  const sources = ["fixtures/content", "fixtures/pkg"].map(source =>
    new FileContentProvider({
      base: new URL(source, import.meta.url).pathname
    })[Symbol.asyncIterator]()
  );

  const properties = { name: "abc", version: "1.0.0" };

  const pkg = new PKG(properties);

  const destination = "/tmp";
  const fileName = await pkg.execute(aggregateFifo(sources), { destination });
  t.is(fileName, join(destination, "abc-1.0.0-0-any.pkg.tar.zst"));

  const s = await stat(fileName);
  t.true(s.size >= 7440, `package file size ${s.size}`);
});
