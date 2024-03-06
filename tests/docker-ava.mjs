import test from "ava";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { FileContentProvider, DOCKER } from "npm-pkgbuild";

test("docker", async t => {
  const sources = ["fixtures/content"].map(source =>
    new FileContentProvider({
      base: new URL(source, import.meta.url).pathname
    })[Symbol.asyncIterator]()
  );

  const properties = {
    name: "ABC",
    version: "1.0.0",
    description: "a description",
    license: "MIT",
    workdir: "/abc"
  };

  const out = new DOCKER(properties);

  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const transformer = [];
  const dependencies = { node: ">=18" };

  const artifact = await out.execute(sources, transformer, dependencies, {
    destination,
    verbose: true
  });

  t.true(artifact != undefined);

  const messages = [];
  await out.publish(artifact, { url: "myregistry.com" }, properties, message =>
    messages.push(message)
  );

  //t.truthy(messages.find(m => m.match(/Publishing to/)));
});
