import test from "ava";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { copyNodeModule } from "../src/package.mjs";

const here = dirname(fileURLToPath(import.meta.url));

test.skip("copy module", async t => {
  const fixturesDir = join(here, "..", "tests", "fixtures");
  const tmpDir = join(here, "..", "build", "copy-test");

  const files = new Set();
  for await (const file of copyNodeModule(fixturesDir, tmpDir, {
    dry: true
  })) {
    files.add(file.substring(tmpDir.length + 1));
    t.log(file);
  }

  t.is(files.size, 8);
  t.deepEqual(
    [...files].sort(),
    [
      "content/file1.txt",
      "content/file2.json",
      "pacman/pacman.install",
      "pacman/tmpfiles.conf",
      "systemd/myservice.service",
      "systemd/myservice.socket"
    ].sort()
  );
});
