import test from "ava";
import { join } from "node:path";
import { stat, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { FileContentProvider, createPublishingDetails, ARCH } from "npm-pkgbuild";

test("arch extension", async t => {
  await ARCH.prepare({ verbose: false }, { arch: "aarch64" });
  t.true(ARCH.fileNameExtension.startsWith(".pkg.tar."));
});

test("arch default properties", async t => {
  const properties = {
    name: "abc",
    arch: [],
    version: "1.0.0-semantic-release",
    description: "a description",
    license: "MIT"
  };

  const out = new ARCH(properties);

  t.deepEqual(out.properties, {
    type: "arch",
    ...properties,
    epoch: 0,
    arch: ["any"],
    pkgdesc: properties.description,
    pkgver: "1.0.0",
    pkgname: properties.name,
    release: 1
  });
});

test("arch aarch64 default properties", async t => {
  const properties = {
    name: "abc",
    arch: ["aarch64"],
    version: "1.0.0",
    description: "a description",
  };

  const out = new ARCH(properties);

  t.deepEqual(out.properties, {
    type: "arch",
    ...properties,
    epoch: 0,
    arch: ["aarch64"],
    pkgdesc: properties.description,
    pkgver: properties.version,
    pkgname: properties.name,
    release: 1
  });
});

test("arch", async t => {
  const publishingDetails = createPublishingDetails(["somewhere"]);
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
    maintainer: ["Herber Müller <herber.mueller@mail.com>"]
  };

  const out = new ARCH(properties);

  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const transformer = [];
  const dependencies = {
    "nginx-mainline": ">=1.21.4",
    konsum: ">=4.3.8"
  };
  const fileName = await out.create(sources, transformer, dependencies, publishingDetails, {
    destination,
    verbose: true
  });
  t.is(fileName, join(destination, "abc-1.0.0-1-any" + ARCH.fileNameExtension));

  const s = await stat(fileName);
  t.true(s.size >= 800, `package file size ${s.size}`);
});
