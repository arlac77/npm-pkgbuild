import test from "ava";
import { join, dirname } from "path";
import WritableStreamBuffer from "stream-buffers/lib/writable_streambuffer.js";
import { fileURLToPath } from "url";
import { FileContentProvider, PKG } from "npm-pkgbuild";

const here = dirname(fileURLToPath(import.meta.url));

const fixturesDir = join(here, "..", "tests", "fixtures");
const fixturesSkeletonDir = join(here, "..", "tests", "fixtures", "skeleton");

test.skip("pkgbuild", async t => {
  const sources = ["fixtures/content", "fixtures/pkg"].map(source =>
    new FileContentProvider({
      base: new URL(source, import.meta.url).pathname
    }).entries()
  );

  const properties = { name: "abc", version: "1.0.0" };

  const deb = new PKG(aggregateFifo(sources), properties);

  const destination = "/tmp";
  const fileName = await deb.execute({ destination });
  t.is(fileName, join(destination, "abc_1.0.0_any.deb"));

/*
  const ws = new WritableStreamBuffer({ initialSize: 10240 });

  const c = ws.getContentsAsString("utf8");

  t.regex(c, /pkgver='1.2.3'/);
  t.regex(c, /source=\('git/);
  t.regex(c, /depends=.*nodejs>=10.5/);
  t.regex(c, /depends=\("redis>=5.0.3"\s+"systemd>=241"\)/);
  t.regex(c, /backup=.*etc\/myservice\/myservice.json/);
  t.regex(c, /install=.*myservice.install/);
  t.regex(c, /arch=.*\(aarch64 armv7h\)/);
  */
});

test.skip("pkgbuild skeleton package", async t => {
  const ws = new WritableStreamBuffer({ initialSize: 10240 });

  const context = await createContext(fixturesSkeletonDir, {
    installdir: "/somewhere"
  });

  await pkgbuild(context, fixturesSkeletonDir, ws);

  const c = ws.getContentsAsString("utf8");

  //console.log(c);
  t.regex(c, /pkgver='1.2.3'/);
  //t.regex(c, /source=\('git/);
  t.regex(c, /depends=.*nodejs>=10.5/);
  t.regex(c, /\s+depends=.*redis>=5.0.3/);
});
