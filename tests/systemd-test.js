import test from "ava";
import { join } from "path";
import { systemd } from "../src/systemd";
import { readFileSync } from "fs";
import { createContext, utf8StreamOptions } from "../src/util";

const fixturesDir = join(__dirname, "..", "tests", "fixtures");

test("systemd simple", async t => {
  const context = await createContext(fixturesDir, {
    installdir: "/services/myservice"
  });

  const tmpDir = join(__dirname, "..", "build");
  await systemd(context, tmpDir);

  const d = readFileSync(
    join(tmpDir, "/usr/lib/systemd/system", "myservice.service"),
    utf8StreamOptions
  );

  t.regex(d, /ExecStart=\/services\/myservice\/bin\/myservice/);
});
