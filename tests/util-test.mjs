import test from "ava";
import { copyFiles } from "../src/util.mjs";

test("copy files", async t => {
  const fixturesDir = new URL("fixtures",import.meta.url).pathname;
  const tmpDir = new URL("../build/copy-test",import.meta.url).pathname;

  const files = [];
  for await (const file of copyFiles(fixturesDir, tmpDir, [
    "**/*",
    "!**/file2.json"
  ])) {
    files.push(file);
    t.log(file);
  }

  t.is(files.length, 8);
});
