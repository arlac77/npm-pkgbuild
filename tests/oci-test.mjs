import test from "ava";
import { join } from "node:path";
import { stat, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { FileContentProvider, OCI } from "npm-pkgbuild";

test("oci", async t => {
  const sources = ["fixtures/content", "fixtures/pkg"].map(source =>
    new FileContentProvider({
      base: new URL(source, import.meta.url).pathname
    })[Symbol.asyncIterator]()
  );

  const properties = {
    name: "abc",
    version: "1.0.0",
    description: "a description",
    license: "MIT"
  };

  const out = new OCI(properties);

  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const transformer = [];
  const dependencies = {};

  const fileName = await out.execute(sources, transformer, dependencies, {
    destination
  });

  t.is(fileName, join(destination, "abc-1.0.0.oci.tar.gz"));

  const s = await stat(fileName);
  t.true(s.size >= 770, `package file size ${s.size}`);
});
