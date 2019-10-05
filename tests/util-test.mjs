import test from "ava";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { copyFiles, copyNodeModules } from "../src/util.mjs";


const here = dirname(fileURLToPath(import.meta.url));

test("copy files", async t => {
  const fixturesDir = join(here, "..", "tests", "fixtures");
  const tmpDir = join(here, "..", "build", "copy-test");

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

test("copy modules", async t => {
  const fixturesDir = join(here, ".." , "tests", "fixtures");
  const tmpDir = join(here, "..", "build", "copy-test");

  const files = [];
  for await (const file of copyNodeModules(fixturesDir, tmpDir, {dry: true})) {
    files.push(file);
    t.log(file);
  }

  t.is(files.length, 8);
});