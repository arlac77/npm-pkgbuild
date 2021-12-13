import test from "ava";
import { join } from "path";
import { aggregateFifo } from "aggregate-async-iterator";
import { FileContentProvider, RPM } from "npm-pkgbuild";

test("pkg", async t => {
  const sources = ["fixtures/content", "fixtures/rpm"].map(source =>
    new FileContentProvider({
      base: new URL(source, import.meta.url).pathname
    })[Symbol.asyncIterator]()
  );

  const properties = { name: "abc", version: "1.0.0" };

  const pkg = new RPM(properties);

  const destination = "/tmp";
  const fileName = await pkg.execute(aggregateFifo(sources), { destination });
  t.is(fileName, join(destination, "abc-1.0.0-0.any.rpm"));
});
