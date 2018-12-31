import test from "ava";
import { join } from "path";
import { WritableStreamBuffer } from "stream-buffers";

import { npm2pkgbuild } from "../src/npm-pkgbuild";

const fixturesDir = join(__dirname, "..", "tests", "fixtures");

test("npm2pkgbuild simple", async t => {
  const ws = new WritableStreamBuffer({ initialSize: 10240 });

  await npm2pkgbuild(fixturesDir, fixturesDir, ws, {
    installdir: "/somewhere"
  });

  const c = ws.getContentsAsString("utf8");
  t.regex(c, /source=\('git/);
  t.regex(c, /depends=.*nodejs>=10.5/);
  t.regex(c, /backup=.*somewhere\/systemd\/myunit.service/);
});

test("npm2pkgbuild systemd service", async t => {
  const ws = new WritableStreamBuffer({ initialSize: 10240 });

  await npm2pkgbuild(fixturesDir, fixturesDir, ws, {
    installdir: "/somewhere"
  });

  const c = ws.getContentsAsString("utf8");
  t.true(c.indexOf("cp ${srcdir}/pkgname/systemd/myunit*") > 100);
});
