import test from "ava";
import { join } from "path";
import { stat, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { FileContentProvider, RPM } from "npm-pkgbuild";
import { requiresFromDependencies } from "../src/output/rpm.mjs";

test("requiresFromDependencies", t => {
  t.deepEqual(
    requiresFromDependencies({
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
    hooks: new URL("fixtures/pkg/pacman.install", import.meta.url).pathname
  };

  const out = new RPM(properties);

  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const transformer = [];
  const dependencies = {
    "nginx-mainline": ">=1.21.4",
    konsum: ">=4.3.8"
  };
  const fileName = await out.execute(sources, transformer, dependencies, {
    destination,
    verbose: true
  });
  t.is(fileName, join(destination, "abc-1.0.0-1.noarch.rpm"));

  const s = await stat(fileName);
  t.true(s.size >= 5000, `package file size ${s.size}`);
});
