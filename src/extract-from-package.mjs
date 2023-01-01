import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { packageDirectory } from "pkg-dir";
import { packageWalker } from "npm-package-walker";
import { createContext } from "expression-expander";
import { asArray, utf8StreamOptions } from "./util.mjs";
import { NPMPackContentProvider } from "./content/npm-pack-content-provider.mjs";
import { NodeModulesContentProvider } from "./content/node-modules-content-provider.mjs";
import { FileContentProvider } from "./content/file-content-provider.mjs";
import { NFTContentProvider } from "./content/nft-content-provider.mjs";
import { DEBIAN } from "./output/debian.mjs";
import { ARCH } from "./output/arch.mjs";
import { RPM } from "./output/rpm.mjs";
import { OCI } from "./output/oci.mjs";

/**
 * All content providers
 */
export const allInputs = [
  NPMPackContentProvider,
  NodeModulesContentProvider,
  NFTContentProvider
];

/**
 * All output formats
 */
export const allOutputs = [DEBIAN, ARCH, RPM, OCI];

/**
 * Node architecture name to os native arch name mapping
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

/**
 * Deliver basic properties from the root package.
 * @param {Object} content of root package.json
 * @returns {Object} key value pairs extracted from package
 */
function extractFromRootPackage(json) {
  const properties = Object.fromEntries(
    ["name", "version", "description", "homepage", "license"]
      .map(key => [key, json[key]])
      .filter(([k, v]) => v !== undefined)
  );

  if (properties.name) {
    properties.name = properties.name.replace(/^\@[^\/]+\//, "");
  }

  if (json.bugs?.url) {
    properties.bugs = json.bugs.url;
  }

  properties.access = json.publishConfig
    ? json.publishConfig.access
    : "private";

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

  return {
    properties,
    dependencies: { ...json.engines },
    context: createContext({ properties })
  };
}

const entryAttributeNames = ["owner", "group", "mode"];

/**
 * Delivers ContentProviders from pkgbuild.content
 * @param {Object} content from pkgbuild.content
 * @returns {Iterator<ContentProvider>}
 */
function* content2Sources(content, dir) {
  if (content) {
    for (const [destination, definitions] of Object.entries(content)) {
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
            yield new type({ ...definition, dir }, entryProperties);
          } else {
            console.error(`Unknown type '${type}'`);
          }
        } else {
          yield new FileContentProvider(definition, entryProperties);
        }
      }
    }
  }
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
 * - if no architecture is given one result set is provided nethertheless
 * - architectures are taken from cpu (node arch ids) and from pkgbuild.arch (raw arch ids)
 * - architecture given in a abstract definition are used to restrict the set of avaliable architectures
 * @param {Object} options
 * @param {Object} options.json package.json content
 * @param {string} options.dir where to look for package.json
 * @returns {AsyncIterator<PackageDefinition>}
 */
export async function* extractFromPackage(options = {}, env = {}) {
  let variant = "default";
  let sources = [];
  let output = {};
  let arch = new Set();
  let restrictArch = new Set();
  let groups;

  function processPkg(json, dir, modulePath) {
    const pkgbuild = json.pkgbuild;

    if (pkgbuild) {
      if(pkgbuild?.requires?.environment) {
        if(env[pkgbuild.requires.environment.has] === undefined) {
          return;
        }
      }

      if (modulePath) {
        if (!pkgbuild.abstract) {
          if (pkgbuild.groups === groups) {
            dependencies[pkgbuild.name || json.name] = ">=" + json.version;
          }
        }
      } else {
        groups = pkgbuild.groups;

        if (json.cpu) {
          for (const a of asArray(json.cpu)) {
            arch.add(npmArchMapping[a]);
          }
        }
        if (pkgbuild.arch) {
          for (const a of asArray(pkgbuild.arch)) {
            arch.add(a);
          }
        }
      }

      if (pkgbuild.abstract || !modulePath) {
        if (pkgbuild.variant) {
          variant = pkgbuild.variant;
        }

        if (pkgbuild.arch) {
          for (const a of asArray(pkgbuild.arch)) {
            restrictArch.add(a);
          }
        }

        Object.assign(output, pkgbuild.output);

        Object.entries(pkgbuild)
          .filter(([k, v]) => typeof v === "string")
          .forEach(([k, v]) => (properties[k] = v));

        sources.push(...content2Sources(context.expand(pkgbuild.content), dir));
      }
      Object.assign(dependencies, pkgbuild.depends);
    }
  }

  let json = options.json;
  let dir = options.dir;

  if (!json) {
    dir = await packageDirectory({ cwd: dir });

    json = JSON.parse(
      await readFile(join(dir, "package.json"), utf8StreamOptions)
    );
  }

  const { properties, dependencies, context } = extractFromRootPackage(json);

  await packageWalker(async (packageContent, base, modulePath) => {
    if (modulePath.length > 0) {
      processPkg(packageContent, base, modulePath);
    }
    return true;
  }, dir);

  processPkg(json, dir);

  properties.variant = variant;

  if (arch.size > 0) {
    // provide each arch separadly

    let numberOfArchs = 0;

    for (const a of arch) {
      if (!restrictArch.size || restrictArch.has(a)) {
         if (!options.prepare || npmArchMapping[process.arch] === a) {
          numberOfArchs++;
          properties.arch = [a];
          yield {
            properties: context.expand(properties),
            sources,
            dependencies,
            output,
            variant: { name: variant, arch, type: Object.keys(output) },
            context
          };
        }
      }
    }
    if (numberOfArchs === 0) {
      console.warn(
        `No arch remaining, ${[...arch]} : ${[...restrictArch]} : ${
          process.arch
        }`
      );
    }
  } else {
    // or one set if no arch is given
    yield {
      properties: context.expand(properties),
      sources,
      dependencies,
      output,
      variant: { name: variant, type: Object.keys(output) },
      context
    };
  }
}
