import test from "ava";
import { extractFromPackage } from "../src/util.mjs";
import { FileContentProvider } from "npm-pkgbuild";

async function efpt(t, pkg, expectedProperties, expectedContent) {
  const { properties, sources } = extractFromPackage(pkg);

  t.deepEqual(properties, expectedProperties);

  if (expectedContent) {
    t.deepEqual(sources, expectedContent);
  }
}
efpt.title = (
  providedTitle = "extractFromPackage",
  pkg,
  expectedProperties,
  expectedContent
) =>
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
        "/opt/install": { pattern: "**/*.mjs" },
        "${installdir}/": {
          base: "build"
        }
      },
      installdir: "/services/konsum/frontend"
    }
  },
  { installdir: "/services/konsum/frontend" },
  [
    [new FileContentProvider({ pattern: "**/*.mjs" }), "/opt/install"],
    [new FileContentProvider({ base: "build" }), "${installdir}/"]
  ]
);
