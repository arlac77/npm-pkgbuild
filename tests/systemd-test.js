import test from "ava";
import { join } from "path";
import { prepareSystemdUnits } from "../src/systemd";
import fs from "fs";

const fixturesDir = join(__dirname, "..", "tests", "fixtures");

test("systemd simple", async t => {
  const pkgFile = join(fixturesDir, "package.json");
  const pkg = JSON.parse(
    await fs.promises.readFile(pkgFile, { encoding: "utf-8" })
  );

  const tmpDir = join(__dirname, "..", "build");
  await prepareSystemdUnits(pkg, fixturesDir, tmpDir, {
    installdir: "/services/myunit"
  });

  const d = fs.readFileSync(
    join(tmpDir, "/usr/lib/systemd/system", "myunit.service"),
    {
      encoding: "utf8"
    }
  );

  t.regex(d, /ExecStart=\/services\/myunit\/bin\/myunit/);
});
