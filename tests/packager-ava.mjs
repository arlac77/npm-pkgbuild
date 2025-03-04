import test from "ava";
import { Packager } from "npm-pkgbuild";
import { compileFields } from "../src/util.mjs";

class MyPackager extends Packager {
  static get fields() {
    return compileFields({ a: { detault: "av", mandatory: true }, b: { default: "bv", set: value => value.toLowerCase() } });
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

test("packager property set", t => {
  const p = new MyPackager({ b: "ABC" });
  t.is(p.properties.b, "abc");
});

test("packager properties", t => {
  const p = new MyPackager({ a: 1 });
  t.is(p.properties.a, 1);
  t.is(p.properties.b, "bv");
  t.is(p.properties.type, "MyPackager");
});

test("packager prepareExecute", async t => {
  const p = new MyPackager({ a: 1 });
  const out = await p.prepare({});
  t.true(out.tmpdir.length > 4);
  t.is(out.tmpdir, out.destination);
});
