import test from "ava";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import execa from "execa";

import { createContext } from "../src/context.mjs";
import { cleanup } from "../src/cleanup.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const fixturesDir = join(here, "..", "tests", "fixtures");

test("cleanp", async t => {
  const context = await createContext(fixturesDir);

  const staging = join(here, "..", "build", "staging");
  await fs.promises.mkdir(staging, { recursive: true });

  await execa("cp", ["-r", fixturesDir, staging]);
  await cleanup(context, staging);


  const pkg = JSON.parse(
    await fs.promises.readFile(join(staging,'package.json'), utf8StreamOptions)
  );

  t.is(Object.keys(pkg).length, 4);
});
