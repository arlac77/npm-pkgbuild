import test from "ava";
import { join } from "path";
import { stat, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { FileContentProvider, DEBIAN } from "npm-pkgbuild";

async function preparePacker(sourceDirs = [], dependencies = {}) {
  const sources = sourceDirs.map(source =>
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
  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const fileName = await out.execute(sources, transformer, dependencies, {
    destination,
    verbose: false
  });

  return { fileName, destination };
}

test("debian", async t => {
  const { fileName, destination } = await preparePacker(
    ["fixtures/content", "fixtures/pkg"],
    {
      "nginx-mainline": ">=1.21.4",
      konsum: ">=4.3.8"
    }
  );

  t.is(fileName, join(destination, "abc_1.0.0_all.deb"));

  const s = await stat(fileName);
  t.true(s.size >= 700, `package file size ${s.size}`);
});

test("debian without dependencies", async t => {
  const { fileName, destination } = await preparePacker(
    ["fixtures/content"],
    {}
  );

  t.is(fileName, join(destination, "abc_1.0.0_all.deb"));

  const s = await stat(fileName);
  t.true(s.size >= 620, `package file size ${s.size}`);
});
