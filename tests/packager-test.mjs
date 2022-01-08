import test from "ava";
import { Packager } from "npm-pkgbuild";

class MyPackager extends Packager {
  static get fields() {
    return { a: { detault: "av", mandatory: true }, b: { default: "bv" } };
  }
}

test("packager fields", t => {
  const p = new MyPackager();
  t.truthy(p.fields.a);
});

test("packager properties", t => {
  const p = new MyPackager({ a : 1 });
  t.is(p.properties.a, 1);
  t.is(p.properties.b, "bv" );
} );
