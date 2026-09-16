import test from "ava";
import { join } from "node:path";
import { stat, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  FileContentProvider,
  createPublishingDetails,
  ALPM
} from "npm-pkgbuild";

test("alpm extension", async t => {
  await ALPM.prepare({ verbose: false }, { arch: "aarch64" });
  t.true(ALPM.fileNameExtension.startsWith(".pkg.tar."));
});

test("alpm default properties", async t => {
  const properties = {
    name: "abc",
    version: "1.0.0-semantic-release",
    description: "a description",
    license: "MIT"
  };

  const out = new ALPM(properties);

  t.deepEqual(out.externalProperties, {
    epoch: 0,
    arch: ["any"],
    pkgdesc: properties.description,
    pkgver: "1.0.0",
    pkgname: ["abc"],
    pkgrel: 1,
    md5sums: ["SKIP"],
    license: ["MIT"],
  });
});

test("alpm aarch64 default properties", async t => {
  const properties = {
    name: "abc",
    arch: ["aarch64"],
    version: "1.0.0",
    description: "a description",
    license: "MIT"
  };

  const out = new ALPM(properties);

  t.deepEqual(out.externalProperties, {
    epoch: 0,
    arch: ["aarch64"],
    pkgdesc: "a description",
    pkgver: "1.0.0",
    pkgname: ["abc"],
    pkgrel: 1,
    license: ["MIT"],
    md5sums: ["SKIP"],
  });
});

test("alpm", async t => {
  const publishingDetails = createPublishingDetails(["somewhere"]);
  const sources = ["fixtures/content", "fixtures/pkg"].map(source =>
    new FileContentProvider({
      dir: new URL(source, import.meta.url).pathname + "/",
      group: "wheel",
      // mode: 0o666,
      permissions: {
        "**/*.txt": { mode: 0o600 }
      }
    })[Symbol.asyncIterator]()
  );

  const properties = {
    name: "abc",
    version: "1.0.0",
    description: "a description",
    //   license: "MIT",
    maintainer: ["Herber Müller <herber.mueller@mail.com>"],
    provides: ["a=1", "b=2"],
    replaces: {
      "abc-old": true,
      "abc-very-old": ">0.0.1"
    },
    dependencies: {
      "nginx-mainline": ">=1.21.4"
    }
  };

  const out = new ALPM(properties);

  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const transformer = [];
  const fileName = await out.create(sources, transformer, publishingDetails, {
    destination,
    verbose: true
  });
  t.is(fileName, join(destination, "abc-1.0.0-1-any" + ALPM.fileNameExtension));

  const s = await stat(fileName);
  t.true(s.size >= 800, `package file size ${s.size}`);
});
