import test from "ava";
import { join } from "path";
import { WritableStreamBuffer } from "stream-buffers";

import { npm2pkgbuild } from "../src/npm-pkgbuild";

test("npm2pkgbuild", async t => {
  const ws = new WritableStreamBuffer({ initialSize: 10240 });

  await npm2pkgbuild(join(__dirname, "..", "tests", "fixtures"), ws, {
    installdir: "/somewhere"
  });

  const c = ws.getContentsAsString("utf8");
  t.regex(c, /source=\('git/);
  t.regex(c, /depends=.*nodejs>=10.5/);
  t.regex(c, /backup=.*somewhere\/systemd\/npm-template/);
});
