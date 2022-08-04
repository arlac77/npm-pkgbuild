import test from "ava";
import { join } from "path";
import { stat, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
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
  t.true(s.size >= 800, `package file size ${s.size}`);
});
