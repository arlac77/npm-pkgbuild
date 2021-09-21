import test from "ava";
import { copyFiles, copyModules } from "../src/util.mjs";

const FILE_NUMBER = 8;

test("copy files", async t => {
  const fixturesDir = new URL("fixtures", import.meta.url).pathname;
  const tmpDir = new URL("../build/copy-test", import.meta.url).pathname;

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
  const fixturesDir = new URL("fixtures", import.meta.url).pathname;
  const tmpDir = new URL("../build/copy-test", import.meta.url).pathname;

  const files = [];
  for await (const file of copyModules(fixturesDir, tmpDir, { dry: true })) {
    files.push(file);
    t.log(file);
  }

  t.is(files.length, FILE_NUMBER);
});
