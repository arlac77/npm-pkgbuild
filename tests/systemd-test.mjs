import test from "ava";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { systemd } from "../src/systemd.mjs";
import { utf8StreamOptions } from "../src/util.mjs";
import { createContext } from "../src/context.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const fixturesDir = join(here, "..", "tests", "fixtures");

test("systemd simple", async t => {
  const context = await createContext(fixturesDir);

  const tmpDir = join(here, "..", "build");
  await systemd(context, tmpDir);

  const d = readFileSync(
    join(tmpDir, "/usr/lib/systemd/system", "myservice.service"),
    utf8StreamOptions
  );

  t.regex(d, /Description=a description/);
  t.regex(d, /ExecStart=\/services\/myservice\/bin\/myservice/);
});
