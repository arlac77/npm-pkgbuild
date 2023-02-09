import test from "ava";
import { join } from "path";
import { stat, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { FileContentProvider, DOCKER } from "npm-pkgbuild";

test.skip("docker", async t => {
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

  const out = new DOCKER(properties);

  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const transformer = [];
  const dependencies = { node: ">=18", "nginx-mainline": "1.2.3", "other": "2.3.4" };
  
  const fileName = await out.execute(sources, transformer, dependencies, {
    destination,
    verbose: true
  });

  t.is(fileName, join(destination, "abc-1.0.0-1.noarch.rpm"));

  const s = await stat(fileName);
  t.true(s.size >= 5000, `package file size ${s.size}`);
});
