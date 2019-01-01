import test from "ava";
import { join } from "path";
import { pacman } from "../src/pacman";
import { readFileSync } from "fs";
import { createContext, utf8StreamOptions } from "../src/util";

const fixturesDir = join(__dirname, "..", "tests", "fixtures");

test("pacman simple", async t => {
  const context = await createContext(fixturesDir);

  const tmpDir = join(__dirname, "..", "build");
  await pacman(context, tmpDir);

  const d = readFileSync(join(tmpDir, "myservice.install"), utf8StreamOptions);

  t.regex(d, /systemctl start myservice/);
});
