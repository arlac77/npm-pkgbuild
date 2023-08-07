import { join, resolve } from "node:path";
import { packageDirectory } from "pkg-dir";
import { packageWalker } from "npm-package-walker";
import { createContext } from "expression-expander";
import { satisfies } from "compare-versions";
import { asArray } from "./util.mjs";
import { NPMPackContentProvider } from "./content/npm-pack-content-provider.mjs";
import { NodeModulesContentProvider } from "./content/node-modules-content-provider.mjs";
import { FileContentProvider } from "./content/file-content-provider.mjs";
import { NFTContentProvider } from "./content/nft-content-provider.mjs";
import { ContentProvider } from "./content/content-provider.mjs";
import { DEBIAN } from "./output/debian.mjs";
import { ARCH } from "./output/arch.mjs";
import { RPM } from "./output/rpm.mjs";
import { OCI } from "./output/oci.mjs";
import { DOCKER } from "./output/docker.mjs";
import { BUILDAH } from "./output/buildah.mjs";

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
export const allOutputs = [DEBIAN, ARCH, RPM, OCI, DOCKER, BUILDAH];

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
 * Delivers ContentProviders from pkgbuild.content definition.
 * @param {Object} content from pkgbuild.content
 * @returns {Iterator<ContentProvider>}
 */
function* content2Sources(content, dir) {
  for (const [destination, definitions] of Object.entries(content)) {
    const allEntryProperties = {};

    for (const a of entryAttributeNames) {
      if (definitions[a] !== undefined) {
        allEntryProperties[a] = definitions[a];
        delete definitions[a];
      }
    }

    for (let definition of asArray(definitions)) {
      const entryProperties = { ...allEntryProperties, destination };

      if (definition.type) {
        const type = allInputs.find(i => i.name === definition.type);
        if (type) {
          delete definition.type;
          yield new type({ ...definition, dir }, entryProperties);
        } else {
          console.error(`Unknown content provider '${type}'`);
        }
      } else {
        if (typeof definition === "object") {
          definition.base = definition.base ? join(dir, definition.base) : dir;
        } else {
          definition = join(dir, definition);
        }
        yield new FileContentProvider(definition, entryProperties);
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
 * @param {string} [options.dir] where to look for package.json
 * @param {boolean} [options.verbose] log
 * @param {Object} env as delared in process.env
 * @returns {AsyncIterator<PackageDefinition>}
 */
export async function* extractFromPackage(options = {}, env = {}) {
  const variants = {};
  const fragments = {};
  let root, parent;

  const packages = new Map();

  await packageWalker(async (packageContent, dir, modulePath) => {
    let i = 0;

    packages.set(packageContent.name, packageContent.version);

    for (const pkgbuild of asArray(packageContent.pkgbuild)) {
      if (modulePath.length > 0 && !pkgbuild.variant) {
        continue;
      }

      const requires = pkgbuild.requires;
      delete pkgbuild.requires;

      let name = `${packageContent.name}[${i++}]`;
      let priority = 1;

      if (requires) {
        let fullfilled = true;

        if (requires.properties) {
          for (const [k, v] of Object.entries(requires.properties)) {
            if (root.properties[k] !== v && options[k] !== v) {
              fullfilled = false;
              break;
            }

            priority += 1;
          }
        }

        if (requires.environment) {
          if (env[requires.environment.has] === undefined) {
            fullfilled = false;
          }
          priority += 10;
        }

        if (fullfilled) {
          if (options.verbose) {
            console.log(`${name}: requirement fullfilled`, requires);
          }
        } else {
          if (options.verbose) {
            console.log(`${name}: requirement not fullfilled`, requires);
          }
          continue;
        }
      } else {
        if (options.verbose) {
          console.log(`${name}: load`);
        }
      }

      const fragment = {
        name,
        requires,
        priority,
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
          if (modulePath.length === 0) {
            fragment.arch.add(a);
          } else {
            fragment.restrictArch.add(a);
          }
        }
        delete pkgbuild.arch;
      }

      for (const k of ["hooks"]) {
        if (pkgbuild[k]) {
          pkgbuild[k] = resolve(dir, pkgbuild[k]);
        }
      }

      for (const k of ["output", "content", "depends"]) {
        if (pkgbuild[k]) {
          fragment[k] = pkgbuild[k];
          delete pkgbuild[k];
        }
      }

      const properties = {};

      if (modulePath.length >= 1) {
        fragment.parent =
          modulePath.length === 1 ? parent : modulePath[modulePath.length - 2];
      } else {
        properties.access = packageContent.publishConfig?.access || "private";

        Object.assign(
          properties,
          packageContent.config,
          Object.fromEntries(
            ["name", "version", "description", "homepage", "license"]
              .map(key => [key, packageContent[key]])
              .filter(([k, v]) => v !== undefined)
          )
        );

        if (properties.name) {
          properties.name = properties.name.replace(/^\@[^\/]+\//, "");
        }

        if (packageContent.bugs?.url) {
          properties.bugs = packageContent.bugs.url;
        }

        if (packageContent.bin) {
          properties.entrypoints = packageContent.bin;
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

      fragment.properties = Object.assign(properties, pkgbuild);
      fragment.dir = dir;
      fragments[fragment.name] = fragment;

      if (pkgbuild.variant) {
        variants[pkgbuild.variant] = fragment;
      }

      if (modulePath.length === 0) {
        root = fragment;
      }
      parent = fragment.name;
    }

    return true;
  }, await packageDirectory({ cwd: options.dir }));

  if (root && Object.keys(variants).length === 0) {
    variants.default = root;
  }

  for (const [name, variant] of Object.entries(variants).sort(
    ([ua, a], [ub, b]) => b.priority - a.priority
  )) {
    let arch = variant.arch;
    let properties = {};
    const depends = {};
    const output = {};
    const content = [];

    for (
      let fragment = variant;
      fragment;
      fragment = fragments[fragment.parent]
    ) {
      let requirementsMet = true;

      const requires = fragment.requires;
      if (requires) {
        if (requires.output && !output[requires.output]) {
          requirementsMet = false;
          console.log("skipping output", requires.output, output);
        }
        if (requires.dependencies) {
          for (const [p, v] of Object.entries(requires.dependencies)) {
            const pkgVersion = packages.get(p);

            if (pkgVersion === undefined || !satisfies(pkgVersion, v)) {
              requirementsMet = false;
              break;
            }
          }
        }
      }

      if (requirementsMet) {
        arch = new Set([...arch, ...fragment.arch]);
        properties = Object.assign({}, fragment.properties, properties);
        Object.assign(depends, fragment.depends);
        Object.assign(output, fragment.output);
        if (fragment.content) {
          content.push([fragment.content, fragment.dir]);
        }
      } else {
        console.log("requirements not met", fragment.name);
      }
    }

    Object.assign(properties, root.properties);

    properties.variant = name;

    const context = createContext({ properties });
    const sources = context.expand(content).reduce((a, c) => {
      a.push(...content2Sources(c[0], c[1]));
      return a;
    }, []);

    const result = {
      context,
      variant: { name, priority: variant.priority },
      sources,
      output,
      dependencies: depends,
      properties: context.expand(properties)
    };

    /*
    console.log(
      "RESULT",
      result.variant,
      result.properties,
      sources.map(s => s.toString()).join("\n"),
      output,
      arch
    );*/

    if (arch.size === 0) {
      yield result;
    } else {
      for (const a of [...arch].sort()) {
        if (variant.restrictArch.size === 0 || variant.restrictArch.has(a)) {
          result.variant.arch = a;
          result.properties.arch = [a];
          yield result;
        }
      }
    }
  }
}
