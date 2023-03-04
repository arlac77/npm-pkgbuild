import test from "ava";
import { arch as hostArch } from "node:process";
import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import {
  FileContentProvider,
  NPMPackContentProvider,
  extractFromPackage,
  npmArchMapping
} from "npm-pkgbuild";

let id = 1;

async function efpt(t, json, expected) {
  let v = 0;

  const name = json.name
    ? json.name.replace(/\//g, "_").replace(/@/, "")
    : id++;
  let dir = new URL(`../build/efpt-${name}`, import.meta.url).pathname;

  const node_modules = json.node_modules;
  if (node_modules) {
    delete json.node_modules;

    json.dependencies = {};

    for (const [n, v] of Object.entries(node_modules)) {
      v.name = n;

      json.dependencies[n] = "*";

      const md = join(dir, "node_modules", n);

      await mkdir(md, { recursive: true });
      await writeFile(join(md, "package.json"), JSON.stringify(v), "utf8");
    }
  }

  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "package.json"), JSON.stringify(json), "utf8");

  for await (const {
    properties,
    sources,
    dependencies,
    output
  } of extractFromPackage({ dir })) {
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

  t.is(v, expected.length);
}

efpt.title = (providedTitle = "extractFromPackage", pkg, expected) =>
  ` ${providedTitle} ${JSON.stringify(pkg)} -> ${JSON.stringify(
    expected
  )}`.trim();

test(
  efpt,
  {
    name: "@some-org_new/n1",
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
    name: "n2",
    description: "d1",
    version: "1.2.3",
    license: "BSD",
    config: { c1: "value1" },
    repository: "github:/arlac77/npm-pkgbuild",
    pkgbuild: {
      arch: ["aarch64", "x86_64"],
      name: "n3",
      other: "o1",
      output: { deb: {} }
    }
  },
  [
    {
      properties: {
        name: "n3",
        description: "d1",
        version: "1.2.3",
        other: "o1",
        license: "BSD",
        access: "private",
        arch: ["aarch64"],
        c1: "value1",
        source: "github:/arlac77/npm-pkgbuild",
        variant: "default"
      },
      output: { deb: {} }
    },
    {
      properties: {
        name: "n3",
        description: "d1",
        version: "1.2.3",
        other: "o1",
        license: "BSD",
        access: "private",
        arch: ["x86_64"],
        c1: "value1",
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
    name: "n4",
    cpu: ["arm64", "x64"],
    pkgbuild: {
      install: "/n4"
    },
    node_modules: {
      v7: {
        pkgbuild: {
          output: {
            arch: { key: "is arch" },
            debian: { key: "is debian" }
          },
          install: "/v7",
          arch: ["x86_64", "aarch64", "armv7"],
          variant: "v7"
        }
      }
    }
  },
  [
    {
      properties: {
        name: "n4",
        arch: ["aarch64"],
        access: "private",
        variant: "v7",
        install: "/n4"
      },
      output: {
        arch: { key: "is arch" },
        debian: { key: "is debian" }
      }
    },
    {
      properties: {
        name: "n4",
        arch: ["x86_64"],
        access: "private",
        variant: "v7",
        install: "/n4"
      },
      output: {
        arch: { key: "is arch" },
        debian: { key: "is debian" }
      }
    }
  ]
);

test(
  efpt,
  {
    name: "n5",
    pkgbuild: { arch: "armhf" }
  },
  [
    {
      properties: {
        name: "n5",
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
    name: "n6",
    cpu: ["arm", "arm64", "x64"],
    pkgbuild: {
      variant: "v8",
      arch: ["aarch64", "armv7h", "x86_64"]
    }
  },
  [
    {
      properties: {
        name: "n6",
        access: "private",
        arch: ["aarch64"],
        variant: "v8"
      }
    },
    {
      properties: {
        name: "n6",
        access: "private",
        arch: ["armv7h"],
        variant: "v8"
      }
    },
    {
      properties: {
        name: "n6",
        access: "private",
        arch: ["x86_64"],
        variant: "v8"
      }
    }
  ]
);

test(
  efpt,
  {
    name: "n7",
    pkgbuild: {}
  },
  [
    {
      properties: {
        name: "n7",
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
  []
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
    },
    node_modules: {
      hosting: {
        pkgbuild: {
          output: {
            arch: {},
            debian: {}
          },
          arch: ["x86_64", "aarch64", "armv7"],
          variant: "mf",
          content: { "/usr/lib/systemd/system/myservice.service": "a.service"}
        }
      }
    }
  },
  [
    {
      properties: {
        access: "public",
        groups: "home automation",
        hooks: new URL(
          "../build/efpt-konsum-frontend/pkgbuild/hooks.sh",
          import.meta.url
        ).pathname,
        installdir: "/services/konsum/frontend/",
        name: "konsum-frontend",
        variant: "mf"
      },
      sources: [
        new FileContentProvider(
          {
            base: new URL(
              "../build/efpt-konsum-frontend/node_modules/hosting",
              import.meta.url
            ).pathname,
            pattern: ["a.service"]
          },
          { destination: "/usr/lib/systemd/system/myservice.service" }
        ),
        new NPMPackContentProvider(
          {
            dir: new URL("../build/efpt-konsum-frontend", import.meta.url)
              .pathname
          },
          { destination: "/services/konsum/frontend/" }
        ),
        new FileContentProvider(
          {
            base: new URL(
              "../build/efpt-konsum-frontend/build",
              import.meta.url
            ).pathname
          },
          { destination: "/services/konsum/frontend/" }
        ),
        new FileContentProvider(
          {
            base: new URL("../build/efpt-konsum-frontend/dist", import.meta.url)
              .pathname
          },
          { destination: "/services/konsum/frontend/" }
        ),
        new FileContentProvider(
          {
            name: "pkgbuild/nginx.conf",
            base: new URL("../build/efpt-konsum-frontend", import.meta.url)
              .pathname
          },
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

test(
  efpt,
  {
    name: "n12",
    pkgbuild: {
      variant: "v9",
      requires: {
        environment: {
          has: "FLAG1"
        }
      }
    }
  },
  []
);

test(
  efpt,
  {
    name: "n13",
    pkgbuild: {
      p1: true
    },
    node_modules: {
      hosting: {
        pkgbuild: {
          variant: "v10",
          requires: {
            properties: {
              p1: true
            }
          }
        }
      }
    }
  },
  [
    {
      properties: {
        access: "private",
        name: "n13",
        variant: "v10",
        p1: true
      }
    }
  ]
);

test(
  efpt,
  {
    name: "n14",
    pkgbuild: {
      p1: false
    },
    node_modules: {
      hosting: {
        pkgbuild: {
          variant: "v11",
          requires: {
            properties: {
              p1: true
            }
          }
        }
      }
    }
  },
  [
    {
      properties: {
        access: "private",
        name: "n14",
        variant: "default",
        p1: false
      }
    }
  ]
);
