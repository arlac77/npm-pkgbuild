import test from "ava";
import { Packager } from "npm-pkgbuild";

class MyPackager extends Packager {
  static get fields() {
    return { a: { mandatory: true } };
  }
}
test("packager fields", t => {
  const p = new MyPackager();
  t.truthy(p.fields.a);
});
