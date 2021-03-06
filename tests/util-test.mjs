import test from "ava";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { copyFiles, copyModules } from "../src/util.mjs";


const here = dirname(fileURLToPath(import.meta.url));


const FILE_NUMBER = 8;

test("copy files", async t => {
  const fixturesDir = join(here, "..", "tests", "fixtures");
  const tmpDir = join(here, "..", "build", "copy-test");

  const files = [];
  for await (const file of copyFiles(fixturesDir, tmpDir, [
    "**/*",
    "!**/file2.json",
    "!**/module_files.txt"
  ])) {
    files.push(file);
    t.log(file);
  }

  t.is(files.length, FILE_NUMBER);
});

test.skip("copy modules", async t => {
  const fixturesDir = join(here, ".." /*, "tests", "fixtures"*/);
  const tmpDir = join(here, "..", "build", "copy-test");

  const files = [];
  for await (const file of copyModules(fixturesDir, tmpDir, {dry: true})) {
    files.push(file);
    t.log(file);
  }

  t.is(files.length, FILE_NUMBER);
});