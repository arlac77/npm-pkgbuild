import test from "ava";
import { extractFromPackage } from "../src/util.mjs";

async function efpt(t, pkg, expectedProperties) {
  const { properties } = extractFromPackage(pkg);

  t.deepEqual(properties, expectedProperties);
}
efpt.title = (providedTitle = "extractFromPackage", pkg, expectedProperties) =>
  ` ${providedTitle} ${JSON.stringify(pkg)} -> ${JSON.stringify(
    expectedProperties
  )}`.trim();

test(efpt, { name: "n1" }, { name: "n1" });
