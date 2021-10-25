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

test(
  efpt,
  { name: "n1", description: "d1", version: "1.2.3" },
  { name: "n1", description: "d1", version: "1.2.3" }
);
test(
  efpt,
  {
    name: "n1",
    description: "d1",
    version: "1.2.3",
    pkgbuild: {
      name: "n2"
    }
  },
  { name: "n2", description: "d1", version: "1.2.3" }
);

test(
  efpt,
  {
    contributors: [
      {
        name: "Markus Felten",
        email: "markus.felten@gmx.de"
      }
    ]
  },
  { maintainer: "Markus Felten <markus.felten@gmx.de>" }
);

test(
  efpt,
  {
    pkgbuild: {
      content: {
        "/opt/install": { pattern: "**/*.mjs" }
      }
    }
  },
  {}
);
