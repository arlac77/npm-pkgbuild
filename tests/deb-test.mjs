import test from "ava";
import { aggregateFifo } from "aggregate-async-iterator";
import { FileContentProvider, Deb } from "npm-pkgbuild";

test("deb", async t => {
  const sources = ["fixtures/content", "fixtures/deb"].map(source =>
    new FileContentProvider({
      base: new URL(source, import.meta.url).pathname
    }).entries()
  );

  const properties = { name: "abc", version: "1.0.0" };

  const deb = new Deb(aggregateFifo(sources), properties);

  const fileName = await deb.execute();
  t.true(fileName.endsWith("abc-1.0.0.deb"));
});
