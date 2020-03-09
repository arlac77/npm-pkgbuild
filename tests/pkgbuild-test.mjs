import test from "ava";
import { join, dirname } from "path";
import WritableStreamBuffer from "stream-buffers/lib/writable_streambuffer.js";
import { fileURLToPath } from "url";
import { createContext } from "../src/context.mjs";
import { pkgbuild } from "../src/pkgbuild.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const fixturesDir = join(here, "..", "tests", "fixtures");
const fixturesSkeletonDir = join(here, "..", "tests", "fixtures", "skeleton");

test("pkgbuild", async t => {
  const ws = new WritableStreamBuffer({ initialSize: 10240 });

  const context = await createContext(fixturesDir, {
    installdir: "/somewhere"
  });

  await pkgbuild(context, fixturesDir, ws, { npmDist: true, npmModules: true });

  const c = ws.getContentsAsString("utf8");

  //console.log(c);

  t.regex(c, /pkgver='1.2.3'/);
  t.regex(c, /source=\('git/);
  t.regex(c, /depends=.*nodejs>=10.5/);
  t.regex(c, /depends=\("redis>=5.0.3"\s+"systemd>=241"\)/);
  t.regex(c, /backup=.*etc\/myservice\/myservice.json/);
  t.regex(c, /install=.*myservice.install/);
  t.regex(c, /arch=.*\(aarch64 armv7h\)/);
});

test("pkgbuild skeleton package", async t => {
  const ws = new WritableStreamBuffer({ initialSize: 10240 });

  const context = await createContext(fixturesSkeletonDir, {
    installdir: "/somewhere"
  });

  await pkgbuild(context, fixturesSkeletonDir, ws);

  const c = ws.getContentsAsString("utf8");

  t.regex(c, /pkgver='1.2.3'/);
  //t.regex(c, /source=\('git/);
  t.regex(c, /depends=.*nodejs>=10.5/);
  t.regex(c, /\s+depends=.*redis>=5.0.3/);
  t.regex(c, /find\s+\.\s+/);
});

test("pkgbuild empty package", async t => {
  const fixturesEmptyDir = join(here, "..", "tests", "fixtures", "empty");

  const ws = new WritableStreamBuffer({ initialSize: 10240 });

  const context = await createContext(fixturesEmptyDir, {
    installdir: "/somewhere"
  });

  await pkgbuild(context, fixturesEmptyDir, ws);

  const c = ws.getContentsAsString("utf8");

  t.regex(c, /pkgver='1.2.3'/);
  t.regex(c, /depends=.*nodejs>=13.0.1/);
});
