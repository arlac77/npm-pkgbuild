import test from "ava";
import { FileContentProvider, Deb } from "npm-pkgbuild";

test("deb", async t => {
  const content = new FileContentProvider({
    base: new URL("fixtures/skeleton", import.meta.url).pathname
  });

  const deb = new Deb(content);

  await deb.execute();
});
