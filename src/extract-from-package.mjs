import { join, resolve } from "node:path";
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
 * @property {Object} variant identifier of the variant
 * @property {string} variant.name name of the variant
 */

/**
 * Extract package definition from package.json.
 * - for each architecture deliver a new result
 * - if no architecture is given one result set is provided nethertheless
 * - architectures are taken from cpu (node arch ids) and from pkgbuild.arch (raw arch ids)
 * - architecture given in a variant definition are used to restrict the set of avaliable architectures
 * @param {Object} options
 * @param {string} options.dir where to look for package.json
 * @param {Object} env as delared in process.env
 * @returns {AsyncIterator<PackageDefinition>}
 */
export async function* extractFromPackage(options = {}, env = {}) {
  const variants = {};
  const fragments = {};
  let root, parent;

  await packageWalker(async (packageContent, base, modulePath) => {
    let i = 0;
    for (const pkgbuild of Array.isArray(packageContent.pkgbuild)
      ? packageContent.pkgbuild
      : packageContent.pkgbuild
      ? [packageContent.pkgbuild]
      : []) {
      if (pkgbuild.requires?.environment) {
        if (env[pkgbuild.requires.environment.has] === undefined) {
          return;
        }
      }

      const fragment = {
        name: `${packageContent.name}[${i++}]`,
        depends: packageContent.engines || {},
        arch: new Set(),
        restrictArch: new Set()
      };

      if (packageContent.cpu) {
        for (const a of asArray(packageContent.cpu)) {
          fragment.arch.add(npmArchMapping[a]);
        }
      }
      if (pkgbuild.arch) {
        for (const a of asArray(pkgbuild.arch)) {
          fragment.arch.add(a);
          if (modulePath.length === 0) {
            fragment.restrictArch.add(a);
          }
        }
        delete pkgbuild.arch;
      }

      for (const k of ["hooks"]) {
        if(pkgbuild[k]) {
          pkgbuild[k] = resolve(base, pkgbuild[k]);
        }
      }
 
      for (const k of ["output", "content", "depends"]) {
        if (pkgbuild[k]) {
          fragment[k] = pkgbuild[k];
          delete pkgbuild[k];
        }
      }

      const properties = Object.assign(
        {
          access: packageContent.publishConfig?.access || "private"
        },
        packageContent.config,
        modulePath.length === 0 &&
        Object.fromEntries(
          ["name", "version", "description", "homepage", "license"]
            .map(key => [key, packageContent[key]])
            .filter(([k, v]) => v !== undefined)
        ),
        pkgbuild,
      );

      if (modulePath.length >= 1) {
        fragment.parent =
          modulePath.length === 1 ? parent : modulePath[modulePath.length - 2];
      } else {
        if (properties.name) {
          properties.name = properties.name.replace(/^\@[^\/]+\//, "");
        }

        if (packageContent.bugs?.url) {
          properties.bugs = packageContent.bugs.url;
        }

        if (packageContent.contributors) {
          properties.maintainer = packageContent.contributors.map(
            c => `${c.name} <${c.email}>`
          )[0];
        }

        if (typeof packageContent.repository === "string") {
          properties.source = packageContent.repository;
        } else {
          if (packageContent.repository?.url) {
            properties.source = packageContent.repository.url;
          }
        }
      }

      fragment.properties = properties;
      fragment.dir = join(base, ...modulePath.map(p => `node_modules/${p}`));

      fragments[packageContent.name] = fragment;

      if (pkgbuild.variant) {
        fragment.priority = 1;
        variants[pkgbuild.variant] = fragment;
      }

      if (modulePath.length === 0) {
        root = fragment;
      }
    }
    parent = packageContent.name;

    return true;
  }, await packageDirectory({ cwd: options.dir }));

  if (root && Object.keys(variants).length === 0) {
    variants.default = root;
  }

  //console.log(variants);

  for (const [name, variant] of Object.entries(variants)) {
    const arch = [...variant.arch].sort();
    const properties = {};
    const depends = {};
    const output = {};
    const sources = [];

    for (
      let fragment = variant;
      fragment;
      fragment = fragments[fragment.parent]
    ) {
      const context = createContext({ properties: fragment.properties });

      Object.assign(properties, fragment.properties);
      Object.assign(depends, fragment.depends);
      Object.assign(output, fragment.output);

      sources.push(
        ...content2Sources(context.expand(fragment.content), fragment.dir)
      );
    }

    properties.variant = name;

    const context = createContext({ properties });

    const result = {
      context,
      variant: { name },
      sources,
      output,
      dependencies: depends,
      properties: context.expand(properties)
      };

    if(arch.length === 0) {
      yield result;
    }
    else {
      for (const a of arch) {
        result.variant.arch = a;
        result.properties.arch = [a];
        yield result;
      }
    }
  }

  /*
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
  */
}
