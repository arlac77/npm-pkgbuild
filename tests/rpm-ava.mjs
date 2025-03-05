import test from "ava";
import { join } from "node:path";
import { stat, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { FileContentProvider, createPublishingDetails, RPM } from "npm-pkgbuild";

test("makeDepends", t => {

  const out = new RPM({});

  t.deepEqual(
    out.makeDepends({
      A0: "1.2.3",
      A1: "=1.2.3",
      A2: "<=1.2.3",
      A3: ">=1.2.3",
      A4: "<1.2.3",
      A5: ">1.2.3",
      B: "",
      C: " "
    }),
    [
      "A0 = 1.2.3",
      "A1 = 1.2.3",
      "A2 <= 1.2.3",
      "A3 >= 1.2.3",
      "A4 < 1.2.3",
      "A5 > 1.2.3",
      "B",
      "C"
    ]
  );
});

test("rpm", async t => {
  const publishingDetails = createPublishingDetails(["https://myregistry.com"]);

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
    hooks: new URL("fixtures/pkg/pacman.install", import.meta.url).pathname,
    maintainer: ["a <a>","b <b>"],
    dependencies: {
      "nginx-mainline": ">=1.21.4",
      konsum: ">=4.3.8"
    }
  };

  const out = new RPM(properties);

  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const transformer = [];
  const fileName = await out.create(sources, transformer, publishingDetails, {
    destination,
    verbose: true
  });
  t.is(fileName, join(destination, "abc-1.0.0-1.noarch.rpm"));

  const s = await stat(fileName);
  t.true(s.size >= 5000, `package file size ${s.size}`);
});
