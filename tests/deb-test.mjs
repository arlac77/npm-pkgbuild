import test from "ava";
import { join } from "path";
import { aggregateFifo } from "aggregate-async-iterator";
import { FileContentProvider, DEB } from "npm-pkgbuild";

test("deb", async t => {
  const sources = ["fixtures/content", "fixtures/deb"].map(source =>
    new FileContentProvider({
      base: new URL(source, import.meta.url).pathname
    }).entries()
  );

  const properties = { name: "abc", version: "1.0.0" };

  const deb = new DEB(aggregateFifo(sources), properties);

  const destination = "/tmp";
  const fileName = await deb.execute({ destination });
  t.is(fileName, join(destination, "abc_1.0.0_any.deb"));
});
