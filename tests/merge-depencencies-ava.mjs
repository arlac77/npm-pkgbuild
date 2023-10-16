import test from "ava";
import { mergeDependencies } from "../src/util.mjs";

test("mergeDependencies", t => {
  const a = { a: "1.2.3" };
  const b = { b: "3.4.5" };
  t.deepEqual(mergeDependencies(a, b), { a: "1.2.3", b: "3.4.5" });
});

test("mergeDependencies remove", t => {
  const a = { a: "1.2.3", a2: "1.0.0" };
  const b = { a: "-" };
  t.deepEqual(mergeDependencies(a, b), { a2: "1.0.0" });
});
