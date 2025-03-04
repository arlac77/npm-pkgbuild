import test from "ava";
import { join } from "node:path";
import { stat, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  FileContentProvider,
  createPublishingDetails,
  DEBIAN
} from "npm-pkgbuild";

test("debian lowercase names", t => {
  const out = new DEBIAN({
    name: "ABC",
    license: "MIT",
    version: "1.0.0",
    maintainer: "hugo"
  });

  t.is(out.properties.name, "abc");

  t.is(out.packageFileName, "abc_1.0.0_all.deb");
});

async function preparePacker(sourceDirs = [], dependencies = {}, props) {
  const publishingDetails = createPublishingDetails([], process.env);

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
    hooks: new URL("fixtures/pkg/pacman.install", import.meta.url).pathname,
    dependencies,
    ...props
  };

  const out = new DEBIAN(properties);

  const transformer = [];
  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const fileName = await out.create(sources, transformer, publishingDetails, {
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

test("debian aarch64 -> arm64", async t => {
  const { fileName, destination } = await preparePacker(
    ["fixtures/content"],
    {},
    {
      arch: "aarch64"
    }
  );

  t.is(fileName, join(destination, "abc_1.0.0_arm64.deb"));
});
