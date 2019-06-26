import test from "ava";
import { join, dirname } from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { pacman, makepkg } from "../src/pacman.mjs";
import { utf8StreamOptions } from "../src/util.mjs";
import { createContext } from "../src/context.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const fixturesDir = join(here, "..", "tests", "fixtures");

test("pacman simple", async t => {
  const context = await createContext(fixturesDir);

  const tmpDir = join(here, "..", "build");
  await pacman(context, tmpDir);

  const d = readFileSync(join(tmpDir, "myservice.install"), utf8StreamOptions);

  t.regex(d, /systemctl start myservice/);
});

test("makepkg simple", async t => {
  const context = await createContext(fixturesDir, { publish: "/tmp/" });

  const tmpDir = join(here, "..", "build");

  const error = await t.throwsAsync(async () => {
    await makepkg(context, tmpDir);
  }, Error);

  //console.log(error);

  t.regex(error.message, /Command failed|ENOENT|SIGUSR1/);
});
