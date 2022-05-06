import test from "ava";
import { arch as hostArch } from "process";
import { dirname } from "path";
import {
  FileContentProvider,
  NPMPackContentProvider,
  extractFromPackage,
  npmArchMapping
} from "npm-pkgbuild";

async function efpt(t, pkg, expected) {
  let v = 0;

  for await (const {
    properties,
    sources,
    dependencies,
    output
  } of extractFromPackage(pkg, dirname(new URL(import.meta.url).pathname))) {
    t.deepEqual(properties, expected[v].properties, "properties");

    if (expected[v].content) {
      t.deepEqual(sources, expected[v].content, "content");
    }

    if (expected[v].dependencies) {
      t.deepEqual(dependencies, expected[v].dependencies, "dependencies");
    }

    if (expected[v].output) {
      t.deepEqual(output, expected[v].output, "output");
    }

    v++;
  }
}
efpt.title = (providedTitle = "extractFromPackage", pkg, expected) =>
  ` ${providedTitle} ${JSON.stringify(pkg)} -> ${JSON.stringify(
    expected
  )}`.trim();

test(
  efpt,
  {
    name: "n1",
    description: "d1",
    version: "1.2.3",
    cpu: hostArch,
    pkgbuild: {}
  },
  [
    {
      properties: {
        name: "n1",
        description: "d1",
        version: "1.2.3",
        access: "private",
        arch: [npmArchMapping[hostArch]],
        variant: "default"
      }
    }
  ]
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
    pkgbuild: {
      arch: ["aarch64", "x86_64"],
      name: "n2",
      other: "o1",
      output: { deb: {} }
    }
  },
  [
    {
      properties: {
        name: "n2",
        description: "d1",
        version: "1.2.3",
        other: "o1",
        license: "BSD",
        access: "private",
        arch: [npmArchMapping[hostArch] /*"aarch64","x86_64"*/],
        c1: "v1",
        source: "github:/arlac77/npm-pkgbuild",
        variant: "default"
      },
      output: { deb: {} }
    }
  ]
);

test(
  efpt,
  {
    cpu: ["arm64", "x64"],
    pkgbuild: {}
  },
  [
    {
      properties: {
        access: "private",
        arch: [npmArchMapping[hostArch] /*"aarch64","x86_64"*/],
        variant: "default"
      },
      output: {}
    }
  ]
);

test.skip(
  efpt,
  {
    pkgbuild: { arch: "armhf" }
  },
  [
    {
      properties: {
        arch: ["armvhf"],
        access: "private",
        variant: "default"
      },
      output: {}
    }
  ]
);

test(
  efpt,
  {
    pkgbuild: {}
  },
  [
    {
      properties: {
        access: "private",
        variant: "default"
      },
      output: {}
    }
  ]
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
  [
    {
      properties: {
        access: "private",
        variant: "default",
        maintainer: "Markus Felten <markus.felten@gmx.de>"
      }
    }
  ]
);

test(
  efpt,
  {
    name: "konsum-frontend",
    publishConfig: {
      access: "public"
    },
    pkgbuild: {
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
        //      "/etc/nginx/sites/common/${name}.conf": "pkgbuild/nginx.conf",
        "/etc/nginx/sites/common/${name}.conf": {
          name: "pkgbuild/nginx.conf",
          owner: "root"
        }
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
  [
    {
      properties: {
        access: "public",
        groups: "home automation",
        hooks: "pkgbuild/hooks.sh",
        installdir: "/services/konsum/frontend",
        name: "konsum-frontend",
        variant: "default"
      },
      content: [
        new NPMPackContentProvider(
          { dir: dirname(new URL(import.meta.url).pathname) },
          { destination: "/services/konsum/frontend" }
        ),
        new FileContentProvider(
          { base: "build" },
          { destination: "/services/konsum/frontend" }
        ),
        new FileContentProvider(
          { base: "dist" },
          { destination: "/services/konsum/frontend" }
        ),

        /*new FileContentProvider(
      { base: "pkgbuild", pattern: ["other.conf"] },
      { destination: "/etc/nginx/sites/common/other.conf", owner: "root" }
    ),*/
        new FileContentProvider(
          { name: "pkgbuild/nginx.conf" },
          {
            destination: "/etc/nginx/sites/common/konsum-frontend.conf",
            owner: "root"
          }
        )
      ],
      dependencies: {
        "nginx-mainline": ">=1.21.1",
        konsum: ">=4.1.0"
      }
    }
  ]
);
