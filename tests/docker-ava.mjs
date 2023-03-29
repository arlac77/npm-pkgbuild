import test from "ava";
import { join } from "node:path";
import { stat, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { FileContentProvider, DOCKER } from "npm-pkgbuild";

test("docker", async t => {
  const sources = ["fixtures/content"].map(source =>
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

  const out = new DOCKER(properties);

  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const transformer = [];
  const dependencies = { node: ">=18" };

  const fileName = await out.execute(sources, transformer, dependencies, {
    destination,
    verbose: true
  });

  t.true(fileName != undefined);
  
//  t.is(fileName, "sha256:f20abce055cd18ef7fd72bdc062720c266b27ba0c6e56bd07248811a6c2b455d");
});
