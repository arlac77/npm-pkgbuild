import test from "ava";
import { arch as hostArch } from "process";
import { dirname } from "path";
import {
  FileContentProvider,
  NPMPackContentProvider,
  extractFromPackage,
  npmArchMapping
} from "npm-pkgbuild";

async function efpt(
  t,
  pkg,
  expectedProperties,
  expectedContent,
  expectedDependencies,
  expectedOutput
) {
  const { properties, sources, dependencies, output } =
    await extractFromPackage(pkg, dirname(new URL(import.meta.url).pathname));

  t.deepEqual(properties, expectedProperties, "properties");

  if (expectedContent) {
    t.deepEqual(sources, expectedContent, "content");
  }

  if (expectedDependencies) {
    t.deepEqual(dependencies, expectedDependencies, "dependencies");
  }

  if (expectedOutput) {
    t.deepEqual(output, expectedOutput, "output");
  }
}
efpt.title = (
  providedTitle = "extractFromPackage",
  pkg,
  expectedProperties,
  expectedContent,
  expectedOutput
) =>
  ` ${providedTitle} ${JSON.stringify(pkg)} -> ${JSON.stringify(
    expectedProperties
  )}`.trim();

test(
  efpt,
  { name: "n1", description: "d1", version: "1.2.3", cpu: hostArch, pkg: {} },
  {
    name: "n1",
    description: "d1",
    version: "1.2.3",
    arch: [npmArchMapping[hostArch]]
  }
);

test(
  efpt,
  {
    name: "n1",
    description: "d1",
    version: "1.2.3",
    license: "BSD",
    config: { c1: "v1" },
    repository: "github:/arlac77/npm-pkgbuild",
    pkg: {
      arch: ["aarch64", "x86_64"],
      name: "n2",
      other: "o1",
      output: { dep: {} }
    }
  },
  {
    name: "n2",
    description: "d1",
    version: "1.2.3",
    other: "o1",
    license: "BSD",
    arch: [npmArchMapping[hostArch] /*"aarch64","x86_64"*/],
    c1: "v1",
    source: "github:/arlac77/npm-pkgbuild"
  },
  undefined,
  undefined,
  { dep: {} }
);

test(
  efpt,
  {
    cpu: ["arm64", "x64"],
    pkg: {}
  },
  {
    arch: [npmArchMapping[hostArch] /*"aarch64","x86_64"*/]
  },
  undefined,
  undefined,
  {  }
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
    pkg: {
      content: {
        "${installdir}": [
          {
            type: "npm-pack"
          },
          {
            base: "build"
          },
          {
            base: "dist"
          }
        ],
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
    new NPMPackContentProvider(
      { dir: dirname(new URL(import.meta.url).pathname) },
      { destination: "${installdir}" }
    ),
    new FileContentProvider(
      { base: "build" },
      { destination: "${installdir}" }
    ),
    new FileContentProvider({ base: "dist" }, { destination: "${installdir}" }),

    new FileContentProvider(
      { base: "pkgbuild", pattern: ["nginx.conf"] },
      { destination: "/etc/nginx/sites/common/${name}.conf" }
    )
  ],
  {
    "nginx-mainline": ">=1.21.1",
    konsum: ">=4.1.0"
  }
);
