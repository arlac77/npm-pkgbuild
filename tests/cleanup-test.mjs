import test from "ava";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdir, access } from "fs/promises";
import execa from "execa";
import { createContext } from "../src/context.mjs";
import { cleanup } from "../src/cleanup.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const fixturesDir = join(here, "..", "tests", "fixtures");

test.skip("cleanup", async t => {
  const context = await createContext(fixturesDir);

  const staging = join(here, "..", "build", "staging");
  await mkdir(staging, { recursive: true });

  await execa("cp", ["-r", fixturesDir, staging]);
  await cleanup(context, join(staging, "fixtures"));

  const error = await t.throwsAsync(async () => {
    await access(join(staging, "fixtures", "package.json"), fs.constants.R_OK);
  });

  /*
  let pkg = JSON.parse(
    await readFile(join(staging, 'fixtures', 'package.json'), utf8StreamOptions)
  );

  t.is(Object.keys(pkg).length, 0);
*/

  /*
  await execa("cp", ["-r", join(here, '..', 'node_modules', '@octokit'), join(staging, 'fixtures')]);

  pkg = JSON.parse(
    await readFile(join(staging, 'fixtures', '@octokit', 'endpoint', 'package.json'), utf8StreamOptions)
  );

  await execa("rm", ["-r", staging]);
  */
});
