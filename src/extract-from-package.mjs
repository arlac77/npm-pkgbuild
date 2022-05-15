import { readFile } from "fs/promises";
import { join } from "path";
import { packageDirectory } from "pkg-dir";
import { packageWalker } from "npm-package-walker";
import { createContext } from "expression-expander";
import { asArray, utf8StreamOptions } from "./util.mjs";
import { NPMPackContentProvider } from "./content/npm-pack-content-provider.mjs";
import { NodeModulesContentProvider } from "./content/node-modules-content-provider.mjs";
import { FileContentProvider } from "./content/file-content-provider.mjs";
import { DEBIAN } from "./output/debian.mjs";
import { ARCH } from "./output/arch.mjs";
import { RPM } from "./output/rpm.mjs";

export const allInputs = [NPMPackContentProvider, NodeModulesContentProvider];
export const allOutputs = [DEBIAN, ARCH, RPM];

/**
 * Node architecture name to os native name mapping
 * {@see https://nodejs.org/dist/latest-v18.x/docs/api/process.html#processargv}
 */
export const npmArchMapping = {
  arm64: "aarch64",
  arm: "armv7h",
  mips: "mips",
  mipsel: "mipsel",
  ppc: "ppc",
  s390: "s390",
  s390x: "s390x",
  ia32: "x32",
  x64: "x86_64",
  ppc64: "ppc64"
};

const entryAttributeNames = ["owner", "group", "mode"];

function extractFromRootPackage(json) {
  const properties = Object.fromEntries(
    ["name", "version", "description", "homepage", "license"]
      .map(key => [key, json[key]])
      .filter(([k, v]) => v !== undefined)
  );

  if (properties.name) {
    properties.name = properties.name.replace(/^\@\w+\//, "");
  }

  if (json.bugs) {
    if (json.bugs.url) {
      properties.bugs = json.bugs.url;
    }
  }

  properties.access = "private";
  if (json.publishConfig) {
    properties.access = json.publishConfig.access;
  }

  Object.assign(properties, json.config);

  if (json.contributors) {
    properties.maintainer = json.contributors.map(
      c => `${c.name} <${c.email}>`
    )[0];
  }

  if (json.repository) {
    if (typeof json.repository === "string") {
      properties.source = json.repository;
    } else {
      if (json.repository.url) {
        properties.source = json.repository.url;
      }
    }
  }

  return { properties, dependencies: { ...json.engines } };
}

/**
 * @typedef {Object} PackageDefinition
 * @property {Object} properties values describing the package attributes
 * @property {ContentProvider[]} sources content providers
 * @property {Object} dependencies
 * @property {Object} output package type
 * @property {string} variant identifier of the variant
 */

/**
 * Extract package definition from package.json.
 * - for each architecture deliver a new result
 * - if not architecture is given one result set is provided nethertheless
 * - architectures are taken from cpu (node arch ids) and from pkgbuild.arch (raw arch ids)
 * - architecture given in a abstract definition are used to reduce the set of avaliable architectures
 * @param {Object} options
 * @param {Object} options.json package.json content
 * @param {string} options.pkgDir
 * @returns {AsyncIter<PackageDefinition>}
 */
export async function* extractFromPackage(options = {}) {
  let json = options.json;
  let dir = options.pkgDir;

  if (!json) {
    dir = await packageDirectory({ cwd: dir });

    json = JSON.parse(
      await readFile(join(dir, "package.json"), utf8StreamOptions)
    );
  }

  let variant = "default";

  const { properties, dependencies } = extractFromRootPackage(json);
  const context = createContext({ properties });

  let sources = [];
  let output = {};
  let arch = new Set();
  let restrictArch = new Set();

  const processPkg = (json, dir, modulePath) => {
    const pkg = json.pkgbuild;

    if (pkg) {
      if (!modulePath) {
        if (json.cpu) {
          for (const a of asArray(json.cpu)) {
            arch.add(npmArchMapping[a]);
          }
        }
        if (pkg.arch) {
          for (const a of asArray(pkg.arch)) {
            arch.add(a);
          }
        }
      }

      if (pkg.abstract || !modulePath) {
        if (pkg.variant) {
          variant = pkg.variant;
        }

        if (pkg.arch) {
          for (const a of asArray(pkg.arch)) {
            restrictArch.add(a);
          }
        }

        Object.assign(output, pkg.output);

        Object.entries(pkg)
          .filter(([k, v]) => typeof v === "string")
          .forEach(([k, v]) => (properties[k] = v));

        if (pkg.content && !modulePath) {
          Object.entries(pkg.content).forEach(([destination, definitions]) => {
            destination = context.expand(destination);
            definitions = context.expand(definitions);

            const allEntryProperties = {};

            for (const a of entryAttributeNames) {
              if (definitions[a] !== undefined) {
                allEntryProperties[a] = definitions[a];
                delete definitions[a];
              }
            }

            for (const definition of asArray(definitions)) {
              const entryProperties = { ...allEntryProperties, destination };

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
          });
        }
      }
      Object.assign(dependencies, pkg.depends);
    }
  };

  if (dir) {
    await packageWalker(async (json, base, modulePath) => {
      if (modulePath.length > 0) {
        processPkg(json, base, modulePath);
      }
      return true;
    }, dir);
  }

  processPkg(json, dir);

  properties.variant = variant;

  if (arch.size > 0) {
    // provide each arch separadly

    let numberOfArchs = 0;

    for (const a of arch) {
      if (!restrictArch.size || restrictArch.has(a)) {
        if (options.available && npmArchMapping[process.arch] !== a) {
          break;
        } else {
          numberOfArchs++;
          properties.arch = [a];
          yield {
            properties: context.expand(properties),
            sources,
            dependencies,
            output,
            variant,
            context
          };
        }
      }
    }
    if (numberOfArchs === 0) {
      console.warn(`No matching arch remaining was ${[...arch]}`);
    }
  } else {
    // or one set if no arch is given
    yield {
      properties: context.expand(properties),
      sources,
      dependencies,
      output,
      variant,
      context
    };
  }
}
