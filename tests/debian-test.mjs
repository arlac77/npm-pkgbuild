import test from "ava";
import { join } from "path";
import { stat, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { FileContentProvider, DEBIAN } from "npm-pkgbuild";

test("debian", async t => {
  const sources = ["fixtures/content", "fixtures/pkg"].map(source =>
    new FileContentProvider({
      base: new URL(source, import.meta.url).pathname
    })[Symbol.asyncIterator]()
  );

  const properties = {
    name: "abc",
    version: "1.0.0",
    description: "a description",
    license: "MIT",
    maintainer: "hugo",
    hooks: new URL("fixtures/pkg/pacman.install", import.meta.url).pathname
  };

  const out = new DEBIAN(properties);

  const transformer = [];
  const dependencies = {
    "nginx-mainline": ">=1.21.4",
    konsum: ">=4.3.8"
  };
  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const fileName = await out.execute(sources, transformer, dependencies, {
    destination,
    verbose: false
  });
  t.is(fileName, join(destination, "abc_1.0.0_all.deb"));

  const s = await stat(fileName);
  t.true(s.size >= 700, `package file size ${s.size}`);
});
