import test from "ava";
import { Packager } from "npm-pkgbuild";

class MyPackager extends Packager {
  static get fields() {
    return { a: { detault: "av", mandatory: true }, b: { default: "bv" } };
  }

  static get workspaceLayout() {
    return {
      named: {
        staging: "BUILDROOT"
      },
      others: ["RPMS", "SRPMS", "SOURCES", "SPECS"]
    };
  }
}

test("packager fields", t => {
  const p = new MyPackager();
  t.truthy(p.fields.a);
});

test("packager properties", t => {
  const p = new MyPackager({ a: 1 });
  t.is(p.properties.a, 1);
  t.is(p.properties.b, "bv");
});

test("packager prepareExecute", async t => {
  const p = new MyPackager({ a: 1 });
  const out = await p.prepareExecute({});
  t.true(out.tmpdir.length > 4);
  t.is(out.tmpdir, out.destination);
});
