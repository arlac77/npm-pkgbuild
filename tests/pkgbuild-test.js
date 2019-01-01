import test from "ava";
import { join } from "path";
import { WritableStreamBuffer } from "stream-buffers";
import { createContext } from "../src/util";
import { pkgbuild } from "../src/pkgbuild";

const fixturesDir = join(__dirname, "..", "tests", "fixtures");

test("pkgbuild", async t => {
  const ws = new WritableStreamBuffer({ initialSize: 10240 });

  const context = await createContext(fixturesDir, {
    installdir: "/somewhere"
  });

  await pkgbuild(context, fixturesDir, ws);

  const c = ws.getContentsAsString("utf8");
  t.regex(c, /pkgver='1.2.3'/);
  t.regex(c, /source=\('git/);
  t.regex(c, /depends=.*nodejs>=10.5/);
  t.regex(c, /backup=.*somewhere\/systemd\/myunit.service/);
});
