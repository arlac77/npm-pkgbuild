import test from "ava";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import execa from "execa";
import { utf8StreamOptions } from "../src/util.mjs";
import { createContext } from "../src/context.mjs";
import { cleanup } from "../src/cleanup.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const fixturesDir = join(here, "..", "tests", "fixtures");

test("cleanup", async t => {
  const context = await createContext(fixturesDir);

  const staging = join(here, "..", "build", "staging");
  await fs.promises.mkdir(staging, { recursive: true });

  await execa("cp", ["-r", fixturesDir, staging]);
  await cleanup(context, join(staging, 'fixtures'));

  const error = await t.throwsAsync(async () => {
    await fs.promises.access(join(staging, 'fixtures', 'package.json'), fs.constants.R_OK);
  }, Error);

/*
  let pkg = JSON.parse(
    await fs.promises.readFile(join(staging, 'fixtures', 'package.json'), utf8StreamOptions)
  );

  t.is(Object.keys(pkg).length, 0);
*/

  /*
  await execa("cp", ["-r", join(here, '..', 'node_modules', '@octokit'), join(staging, 'fixtures')]);

  pkg = JSON.parse(
    await fs.promises.readFile(join(staging, 'fixtures', '@octokit', 'endpoint', 'package.json'), utf8StreamOptions)
  );

  await execa("rm", ["-r", staging]);
  */
});
