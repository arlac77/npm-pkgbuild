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
    name: "konsum-frontend",
    pkgbuild: {
      content: {
        "${installdir}": {
          base: "build"
        },
        "/etc/nginx/sites/common/${name}.conf": "pkgbuild/nginx.conf"
      },
      depends: {
        "nginx-mainline": ">=1.21.1",
        konsum: ">=4.1.0"
      },
      groups: "home automation",
      hooks: "pkgbuild/hooks.sh",
      installdir: "/services/konsum/frontend"
    }
  },
  {
    groups: "home automation",
    hooks: "pkgbuild/hooks.sh",
    installdir: "/services/konsum/frontend",
    name: "konsum-frontend"
  },
  [
    [new FileContentProvider({ base: "build" }), "${installdir}"],
    [
      new FileContentProvider({ base: "pkgbuild", pattern: ["nginx.conf"] }),
      "/etc/nginx/sites/common/${name}.conf"
    ]
  ]
);
