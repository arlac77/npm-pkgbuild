import test from "ava";
import { join } from "path";
import { stat, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { aggregateFifo } from "aggregate-async-iterator";
import { FileContentProvider, DEB } from "npm-pkgbuild";

test("deb", async t => {
  const sources = ["fixtures/content", "fixtures/deb"].map(source =>
    new FileContentProvider({
      base: new URL(source, import.meta.url).pathname
    })[Symbol.asyncIterator]()
  );

  const properties = { name: "abc", version: "1.0.0" };

  const deb = new DEB(properties);

  const destination = await mkdtemp(join(tmpdir(), deb.constructor.name));
  const fileName = await deb.execute(aggregateFifo(sources), { destination });
  t.is(fileName, join(destination, "abc_1.0.0_all.deb"));

  const s = await stat(fileName);
  t.true(s.size > 900, "package file size");
});
