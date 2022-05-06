import { arch as hostArch } from "process";
import { packageWalker } from "npm-package-walker";
import { createContext } from "expression-expander";
import { asArray } from "./util.mjs";
import { NPMPackContentProvider } from "./content/npm-pack-content-provider.mjs";
import { NodeModulesContentProvider } from "./content/node-modules-content-provider.mjs";
import { FileContentProvider } from "./content/file-content-provider.mjs";
import { DEBIAN } from "./output/debian.mjs";
import { ARCH } from "./output/arch.mjs";
import { RPM } from "./output/rpm.mjs";

export const allInputs = [NPMPackContentProvider, NodeModulesContentProvider];
export const allOutputs = [DEBIAN, ARCH, RPM];

/**
 * Node architecture name to os native name
 * {@see https://nodejs.org/dist/latest-v18.x/docs/api/process.html#processargv}
 */
export const npmArchMapping = {
  arm64: "aarch64",
  arm: "armv7h",
  mips : "mips",
  mipsel: "mipsel",
  ppc: "ppc",
  s390: "s390",
  s390x: "s390x"
  ia32 : "x32",
  x64: "x86_64"
  ppc64: "ppc64"
};

export const archMapping = Object.fromEntries(
  Object.entries(npmArchMapping).map(a => [a[1], a[0]])
);

const entryAttributeNames = ["owner", "group", "mode"];

/**
 * Extract package definition from package.json.
 * @param {Object} pkg package.json content
 * @param {string} dir
 * @returns {Object}
 */
export async function * extractFromPackage(json, dir) {

  const properties = Object.fromEntries(
    ["name", "version", "description", "homepage", "license"]
      .map(key => [key, json[key]])
      .filter(([k, v]) => v !== undefined)
  );

  let variant = "default";

  if (json.bugs) {
    if (json.bugs.url) {
      properties.bugs = json.bugs.url;
    }
  }

  Object.assign(properties, json.config);

  if (properties.name) {
    properties.name = properties.name.replace(/^\@\w+\//, "");
  }

  properties.access = "private";
  if (json.publishConfig) {
    properties.access = json.publishConfig.access;
  }

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

  const context = createContext({ properties });

  let dependencies = { ...json.engines };
  let sources = [];
  let output = {};
  let arch = new Set();

  const processPkg = (json, dir, modulePath) => {
    const pkg = json.pkgbuild;

    if (pkg) {
      if (json.cpu) {
        for (const a of asArray(json.cpu)) {
          arch.add(npmArchMapping[a]);
        }
      }

      if (pkg.abstract || !modulePath) {
        if(pkg.variant) {
          variant = pkg.variant;
        }

        if (pkg.arch) {
          for (const a of asArray(pkg.arch)) {
            arch.add(a);
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

  await packageWalker(async (json, base, modulePath) => {
    if (modulePath.length > 0) {
      processPkg(json, base, modulePath);
    }
    return true;
  }, dir);

  processPkg(json, dir);

  if (arch.size > 0) {
    properties.arch = [...arch].filter(a => a === npmArchMapping[hostArch]);
  }

  properties.variant = variant;
  
  yield { properties, sources, dependencies, output, variant };
}
