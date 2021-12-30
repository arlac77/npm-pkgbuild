import test from "ava";
import { join } from "path";
import { stat, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { aggregateFifo } from "aggregate-async-iterator";
import { FileContentProvider, DEB } from "npm-pkgbuild";

test("deb", async t => {
  const sources = ["fixtures/content", "fixtures/pkg"].map(source =>
    new FileContentProvider({
      base: new URL(source, import.meta.url).pathname
    })[Symbol.asyncIterator]()
  );

  const properties = { name: "abc", version: "1.0.0" };

  const out = new DEB(properties);

  const transformer = [];
  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const fileName = await out.execute(aggregateFifo(sources), transformer, { destination });
  t.is(fileName, join(destination, "abc_1.0.0_all.deb"));

  const s = await stat(fileName);
  t.true(s.size >= 800, `package file size ${s.size}`);
});
