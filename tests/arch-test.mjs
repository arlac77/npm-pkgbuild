import test from "ava";
import { join } from "path";
import { stat, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { FileContentProvider, ARCH } from "npm-pkgbuild";

test("arch default properties", async t => {
  const properties = {
    name: "abc",
    version: "1.0.0",
    description: "a description",
    license: "MIT"
  };

  const out = new ARCH(properties);

  t.deepEqual(out.properties, {
    ...properties,
    epoch: 0,
    arch: ["any"],
    pkgdesc: properties.description,
    pkgver: properties.version,
    pkgname: properties.name,
    release: 1
  });
});

test("arch", async t => {
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

  const out = new ARCH(properties);

  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const transformer = [];
  const dependencies = {
    "nginx-mainline": ">=1.21.4",
    konsum: ">=4.3.8"
  };
  const fileName = await out.execute(sources, transformer, dependencies, {
    destination
  });
  t.is(fileName, join(destination, "abc-1.0.0-1-any.pkg.tar.zst"));

  const s = await stat(fileName);
  t.true(s.size >= 800, `package file size ${s.size}`);
});
