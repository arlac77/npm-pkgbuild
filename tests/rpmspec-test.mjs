import test from "ava";
import { join, dirname } from "path";
import WritableStreamBuffer from "stream-buffers/lib/writable_streambuffer";
import { fileURLToPath } from "url";
import { createContext } from "../src/context.mjs";
import { rpmspec } from "../src/rpmspec.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const fixturesDir = join(here, "..", "tests", "fixtures");
const fixturesSkeletonDir = join(here, "..", "tests", "fixtures", "skeleton");

test("pkgbuild", async t => {
  const ws = new WritableStreamBuffer({ initialSize: 10240 });

  const context = await createContext(fixturesDir, {
    installdir: "/somewhere"
  });

  await rpmspec(context, fixturesDir, ws, { npmDist: true, npmModules: true });

  const c = ws.getContentsAsString("utf8");

  console.log(c);

  t.regex(c, /Version:\s*1.2.3/);
});
