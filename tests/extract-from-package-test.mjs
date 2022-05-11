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
    const e = expected[v];

    t.truthy(e, `expected ${v}`);

    if (e.properties) {
      t.deepEqual(properties, e.properties, `properties[${v}]`);
    }

    if (e.sources) {
      t.deepEqual(sources, e.sources, `sources[${v}]`);
    }

    if (e.dependencies) {
      t.deepEqual(dependencies, e.dependencies, `dependencies[${v}]`);
    }

    if (e.output) {
      t.deepEqual(output, e.output, `output[${v}]`);
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
        arch: ["aarch64"],
        c1: "v1",
        source: "github:/arlac77/npm-pkgbuild",
        variant: "default"
      },
      output: { deb: {} }
    },
    {
      properties: {
        name: "n2",
        description: "d1",
        version: "1.2.3",
        other: "o1",
        license: "BSD",
        access: "private",
        arch: ["x86_64"],
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
        arch: ["aarch64"],
        variant: "default"
      }
    },
    {
      properties: {
        access: "private",
        arch: ["x86_64"],
        variant: "default"
      }
    }
  ]
);

test(
  efpt,
  {
    pkgbuild: { arch: "armhf" }
  },
  [
    {
      properties: {
        arch: ["armhf"],
        access: "private",
        variant: "default"
      }
    }
  ]
);

test(
  efpt,
  {
    cpu: ["arm", "arm64", "x64"],
    pkgbuild: {
      variant: "v1",
      arch: ["aarch64", "arm", "x86_64"]
    }
  },
  [
    {
      properties: {
        access: "private",
        arch: ["aarch64"],
        variant: "v1"
      }
    },
    {
      properties: {
        access: "private",
        arch: ["x86_64"],
        variant: "v1"
      }
    },
    {
      properties: {
        access: "private",
        arch: ["arm"],
        variant: "v1"
      }
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
      }
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
      installdir: "/services/konsum/frontend/"
    }
  },
  [
    {
      properties: {
        access: "public",
        groups: "home automation",
        hooks: "pkgbuild/hooks.sh",
        installdir: "/services/konsum/frontend/",
        name: "konsum-frontend",
        variant: "default"
      },
      sources: [
        new NPMPackContentProvider(
          { dir: dirname(new URL(import.meta.url).pathname) },
          { destination: "/services/konsum/frontend/" }
        ),
        new FileContentProvider(
          { base: "build" },
          { destination: "/services/konsum/frontend/" }
        ),
        new FileContentProvider(
          { base: "dist" },
          { destination: "/services/konsum/frontend/" }
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
