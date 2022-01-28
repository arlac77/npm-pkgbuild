import { arch as hostArch } from "process";
import { packageWalker } from "npm-package-walker";
import { asArray } from "./util.mjs";
import { NPMPackContentProvider } from "./content/npm-pack-content-provider.mjs";
import { NodeModulesContentProvider } from "./content/node-modules-content-provider.mjs";
import { FileContentProvider } from "./content/file-content-provider.mjs";
import { DEB } from "./output/deb.mjs";
import { ARCH } from "./output/arch.mjs";
import { RPM } from "./output/rpm.mjs";

export const allInputs = [NPMPackContentProvider, NodeModulesContentProvider];
export const allOutputs = [DEB, ARCH, RPM];

export const npmArchMapping = {
  arm64: "aarch64",
  arm: "armv7h",
  x64: "x86_64"
};

export const archMapping = Object.fromEntries(
  Object.entries(npmArchMapping).map(a => [a[1], a[0]])
);

/**
 * Extract package definition from package.json.
 * @param {Object} pkg package.json content
 * @param {string} dir
 * @returns {Object}
 */
export async function extractFromPackage(pkg, dir) {
  const properties = Object.fromEntries(
    ["name", "version", "description", "homepage", "license"]
      .map(key => [key, pkg[key]])
      .filter(([k, v]) => v !== undefined)
  );

  if (pkg.bugs) {
    if (pkg.bugs.url) {
      properties.bugs = pkg.bugs.url;
    }
  }

  Object.assign(properties, pkg.config);

  if (properties.name) {
    properties.name = properties.name.replace(/^\@\w+\//, "");
  }

  if (pkg.contributors) {
    properties.maintainer = pkg.contributors.map(
      c => `${c.name} <${c.email}>`
    )[0];
  }

  if (pkg.repository) {
    if (typeof pkg.repository === "string") {
      properties.source = pkg.repository;
    } else {
      if (pkg.repository.url) {
        properties.source = pkg.repository.url;
      }
    }
  }

  let dependencies = { ...pkg.engines };
  let sources = [];
  let output = {};
  let arch = new Set();

  const processPkg = (pkg, dir, modulePath) => {
    if (pkg.pkg) {
      const pkgbuild = pkg.pkg;

      if (pkgbuild.abstract || !modulePath) {
        if (pkgbuild.arch) {
          for (const a of asArray(pkgbuild.arch)) {
            if (npmArchMapping[hostArch] === a) {
              arch.add(a);
            }
          }
        }

        if (pkg.cpu) {
          for (const a of asArray(pkg.cpu)) {
            arch.add(npmArchMapping[a]);
          }
        }

        Object.assign(output, pkgbuild.output);

        Object.entries(pkgbuild)
          .filter(([k, v]) => typeof v === "string")
          .forEach(([k, v]) => (properties[k] = v));

        if (pkgbuild.content && !modulePath) {
          Object.entries(pkgbuild.content).forEach(
            ([destination, definitions]) => {
              for (const definition of asArray(definitions)) {
                const entryProperties = { destination };

                if (definition.type) {
                  const type = allInputs.find(i => i.name === definition.type);
                  if (type) {
                    delete definition.type;
                    sources.push(
                      new type({ ...definition, dir }, entryProperties)
                    );
                  } else {
                    console.error(`Unknown type '${type}'`);
                  }
                } else {
                  sources.push(
                    new FileContentProvider(definition, entryProperties)
                  );
                }
              }
            }
          );
        }
      }
      Object.assign(dependencies, pkgbuild.depends);
    }
  };

  await packageWalker(async (pkg, base, modulePath) => {
    if (modulePath.length > 0) {
      processPkg(pkg, base, modulePath);
    }
    return true;
  }, dir);

  processPkg(pkg, dir);

  if (arch.size > 0) {
    properties.arch = [...arch];
  }

  return { properties, sources, dependencies, output };
}
