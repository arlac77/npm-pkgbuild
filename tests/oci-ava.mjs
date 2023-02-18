import test from "ava";
import { join } from "node:path";
import { stat, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { extract } from "tar-stream";
import { execa } from "execa";
import { FileContentProvider, OCI } from "npm-pkgbuild";

test("oci", async t => {
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

  const out = new OCI(properties);

  const destination = await mkdtemp(join(tmpdir(), out.constructor.name));
  const transformer = [];
  const dependencies = {};

  const fileName = await out.execute(sources, transformer, dependencies, {
    destination
  });

  t.is(fileName, join(destination, "abc-1.0.0.oci.tar.gz"));

  const s = await stat(fileName);
  t.true(s.size >= 10, `package file size (${s.size})`);

  const ex = extract();

  const entries = {};

  ex.on("entry", async (header, stream, next) => {
    stream.on("end", () => next());

    let bytes = 0;
    for await (const chunk of await stream) {
      bytes += chunk.length;
    }

    entries[header.name] = header;
  //  console.log(header.name, bytes);
  });

  await pipeline(createReadStream(fileName), createGunzip(), ex);

  t.is(entries["file1.txt"].size, 93);
  t.is(entries["file2.json"].size, 23);

  const p = await execa("tar", ["tvfz", fileName]);

  t.truthy(p.stdout.match(/file2.json/));
});
