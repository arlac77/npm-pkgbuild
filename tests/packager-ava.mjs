import test from "ava";
import { Packager } from "npm-pkgbuild";

class MyPackager extends Packager {
  static attributes = {
    a: { detault: "av", mandatory: true },
    b: { default: "bv", set: value => value.toLowerCase() }
  };

  static get workspaceLayout() {
    return {
      named: {
        staging: "BUILDROOT"
      },
      others: ["RPMS", "SRPMS", "SOURCES", "SPECS"]
    };
  }
}

test("packager attributes", t => {
  const p = new MyPackager();
  t.truthy(p.attributes.a);
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

test("makeDepends", t => {
  const out = new MyPackager({});

  t.deepEqual(out.makeDepends({}), []);
  t.deepEqual(out.makeDepends([]), []);
  t.deepEqual(out.makeDepends(), []);

  t.deepEqual(out.makeDepends({ a: "=1.2.3", b: "", c: undefined, d: ">=1" }), [
    "a=1.2.3",
    "b",
    "c",
    "d>=1"
  ]);
  t.deepEqual(out.makeDepends(["a=1.2.3", "b"]), ["a=1.2.3", "b"]);
});
