import test from "ava";
import { Packager } from "npm-pkgbuild";

class MyPackager extends Packager {
  static get fields() {
    return { a: { mandatory: true } };
  }
}

test("packager", t => {
  const p = new MyPackager();

  t.true(p.mandatoryFields.has("a"));
});
