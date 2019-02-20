import test from "ava";
import { join, dirname } from "path";
import { systemd } from "../src/systemd";
import { readFileSync } from "fs";
import { utf8StreamOptions } from "../src/util";
import { createContext } from "../src/context";
import { fileURLToPath } from "url";

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
