import test from "ava";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { constants } from "fs";
import { access, readFile, writeFile } from "fs/promises";
import { execa } from "execa";
import { copyModules } from "../src/util.mjs";


const here = dirname(fileURLToPath(import.meta.url));

test.skip("compare", async t => {
  const pkgDir = join(here, "..", "build", "package");

  const expectedFiles = (await readFile(join(here,'fixtures','module_files.txt'),{encoding:'utf8'} )).split(/\n/).sort();

  try {
    await access(pkgDir, constants.F_OK);
  } catch (e) {
    await execa("git", [
      "clone",
      "https://github.com/arlac77/hook-ci.git",
      pkgDir
    ]);

    await execa("npm", ["install"], { cwd: pkgDir });
    await execa("npm", ["prune", "--production"], { cwd: pkgDir });
  }

  const tmpDir = join(here, "..", "build", "copy-test");

  const files = [];

  for await (const file of copyModules(pkgDir, tmpDir)) {
    files.push(file);
  }

  await writeFile('/tmp/files.txt',files.join('\n'), {encoding:'utf8'});

  t.deepEqual(files.sort(), expectedFiles);
});
