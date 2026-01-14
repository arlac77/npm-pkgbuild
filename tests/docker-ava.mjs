import test from "ava";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  FileContentProvider,
  createPublishingDetails,
  DOCKER
} from "npm-pkgbuild";

test("docker", async t => {
  const publishingDetails = createPublishingDetails([
    "https://unknown-registry.com"
  ]);

  const sources = ["fixtures/content"].map(source =>
    new FileContentProvider({
      dir: new URL(source, import.meta.url).pathname
    })[Symbol.asyncIterator]()
  );

  const properties = {
    name: "abc",
    version: "1.0.0",
    description: "a description",
    license: "MIT",
    workdir: "/abc",
    maintainer: ["a <a>", "b <b>"],
    dependencies: { node: "lts-slim" }
  };

  const out = new DOCKER(properties);

  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const transformer = [];

  const artifact = await out.create(
    sources,
    transformer,
    publishingDetails,
    {
      destination,
      verbose: true
    },
    x => x
  );

  t.true(artifact !== undefined);

  const messages = [];
  await out.publish(artifact, publishingDetails[0], message =>
    messages.push(message)
  );

  //t.truthy(messages.find(m => m.match(/Publishing to/)));
});
