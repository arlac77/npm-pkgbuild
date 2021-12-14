import test from "ava";
import { join } from "path";
import { aggregateFifo } from "aggregate-async-iterator";
import { FileContentProvider, PKG } from "npm-pkgbuild";

test.skip("pkg", async t => {
  const sources = ["fixtures/content", "fixtures/pkg"].map(source =>
    new FileContentProvider({
      base: new URL(source, import.meta.url).pathname
    })[Symbol.asyncIterator]()
  );

  const properties = { name: "abc", version: "1.0.0" };

  const pkg = new PKG(properties);

  const destination = "/tmp";
  const fileName = await pkg.execute(aggregateFifo(sources), { destination });
  t.is(fileName, join(destination, "abc-1.0.0-0.any.pkg.tar.xz"));
});
