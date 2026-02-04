import { join, resolve } from "node:path";
import { packageDirectory } from "package-directory";
import { packageWalker } from "npm-package-walker";
import { expand } from "pacc";
import { satisfies } from "compare-versions";
import { asArray, mergeDependencies } from "./util.mjs";
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
 * All content providers (input)
 */
export const allInputs = [
  NPMPackContentProvider,
  NodeModulesContentProvider,
  NFTContentProvider,
  FileContentProvider
];

/**
 * All output formats
 */
export const allOutputs = [ARCH, RPM, OCI, DOCKER, BUILDAH, DEBIAN];

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

function mergeArchs(a, b) {
  if (a) {
    if (b) {
      return [...a, ...b];
    }
    return a;
  }
  return b;
}

/**
 * Delivers ContentProviders from pkgbuild.content definition.
 * @param {Object} content from pkgbuild.content
 * @returns {Iterable<ContentProvider>}
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
          throw new Error(`Unknown content provider '${type}'`);
        }
      } else {
        switch (typeof definition) {
          case "object":
            definition.dir = definition.dir ? join(dir, definition.dir) : dir;
            break;
          case "string":
            definition = join(dir, definition);
            break;
          default:
            throw new Error(`Unsupported content value '${definition}'`);
        }
        yield new FileContentProvider(definition, entryProperties);
      }
    }
  }
}

/**
 * @typedef {Object} PackageDefinition
 * @property {Object} properties values describing the package attributes
 * @property {Object} properties.dependencies
 * @property {Object} properties.replaces
 * @property {Object} properties.conficts
 * @property {ContentProvider[]} sources content providers
 * @property {Object} output package type
 * @property {Object} variant identifier of the variant
 * @property {string} variant.name name of the variant
 * @property {string} variant.arch name of the architecture
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
 * @returns {AsyncIterable<PackageDefinition>}
 */
export async function* extractFromPackage(options = {}, env = {}) {
  const variants = {};
  const fragments = {};
  let root, parent;

  const packages = new Map();

  await packageWalker(
    async (packageContent, dir, modulePath) => {
      let i = 0;

      packages.set(packageContent.name, packageContent.version);

      for (const pkgbuild of asArray(packageContent.pkgbuild)) {
        if (modulePath.length > 0 && !pkgbuild.variant) {
          continue;
        }

        let name = `${packageContent.name}[${i++}]`;

        const fragment = {
          dir,
          name,
          priority: 1,
          dependencies: packageContent.engines || {},
          replaces: {},
          conflicts: {},
          arch: new Set(),
          restrictArch: new Set()
        };

        const requires = pkgbuild.requires;

        if (requires) {
          fragment.requires = requires;
          delete pkgbuild.requires;

          let fullfilled = true;

          if (requires.properties) {
            for (const [k, v] of Object.entries(requires.properties)) {
              if (root?.properties[k] !== v && options[k] !== v) {
                fullfilled = false;
                break;
              }

              fragment.priority += 1;
            }
          }

          if (requires.environment) {
            if (env[requires.environment.has] === undefined) {
              fullfilled = false;
            }
            fragment.priority += 10;
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

        for (const k of [
          "output",
          "content",
          "dependencies",
          "replaces",
          "conflicts"
        ]) {
          if (pkgbuild[k]) {
            fragment[k] = pkgbuild[k];
            delete pkgbuild[k];
          }
        }

        const properties = {};

        if (modulePath.length >= 1) {
          fragment.parent =
            modulePath.length === 1
              ? parent
              : modulePath[modulePath.length - 2];
        } else {
          properties.access =
            packageContent?.publishConfig?.access || "private";

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
              c => c.name + (c.email ? ` <${c.email}>` : "")
            );
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
    },
    await packageDirectory({ cwd: options.dir })
  );

  if (root && Object.keys(variants).length === 0) {
    // @ts-ignore
    variants.default = root;
  }

  for (const [name, variant] of Object.entries(variants).sort(
    ([ua, a], [ub, b]) => b.priority - a.priority
  )) {
    let arch = variant.arch;
    let properties = {};
    let dependencies = {};
    let replaces = {};
    let conflicts = {};
    const output = {};
    const content = [];

    for (
      let fragment = variant;
      fragment;
      fragment = fragments[fragment.parent]
    ) {
      const missedRequirements = [];

      const requires = fragment.requires;
      if (requires) {
        if (requires.output && !output[requires.output]) {
          missedRequirements.push(`output ${requires.output} not avaliable`);
        }
        if (requires.dependencies) {
          for (const [p, v] of Object.entries(requires.dependencies)) {
            const pkgVersion = packages.get(p);

            if (pkgVersion === undefined || !satisfies(pkgVersion, v)) {
              missedRequirements.push(`package not present ${p} ${v}`);
              break;
            }
          }
        }
      }

      if (missedRequirements.length === 0) {
        arch = new Set([...arch, ...fragment.arch]);
        properties = { ...fragment.properties, ...properties };
        dependencies = mergeDependencies(dependencies, fragment.dependencies);
        replaces = mergeDependencies(replaces, fragment.replaces);
        conflicts = mergeDependencies(conflicts, fragment.conflicts);
        Object.assign(output, fragment.output);
        for (const def of Object.values(output)) {
          if (def.content && !def.dir) {
            def.dir = fragment.dir;
          }
        }
        if (fragment.content) {
          content.push(fragment);
        }
      } else {
        console.log("requirements not met", fragment.name, missedRequirements);
      }
    }

    // @ts-ignore
    Object.assign(properties, root.properties);
    delete properties.dependencies;
    delete properties.replaces;
    delete properties.conflicts;

    properties.variant = name;

    const result = {
      variant: { name, priority: variant.priority },
      content,
      output,
      dependencies,
      replaces,
      conflicts,
      properties
    };

    function* forEachOutput(result) {
      if (Object.entries(result.output).length === 0) {
        result.sources = [];
        yield result;
      }

      for (const [name, output] of Object.entries(result.output)) {
        const content = [...result.content];
        const arch = mergeArchs(
          result.properties.arch,
          output.properties?.arch
        );
        if (arch !== undefined) {
          result.properties.arch = arch;
        }

        if (output.content) {
          content.push(output);
        }

        const properties = {
          type: name,
          ...result.properties,
          ...output.properties,
          dependencies: mergeDependencies(
            result.dependencies,
            output.dependencies
          ),
          replaces: mergeDependencies(result.replaces, output.replaces),
          conflicts: mergeDependencies(result.conflicts, output.conflicts)
        };

        const context = { root: properties };

        const sources = [];
        expand(content, context).reduce((a, { content, dir }) => {
          a.push(...content2Sources(content, dir));
          return a;
        }, sources);

        yield {
          variant: { ...result.variant, output: name },
          output: { [name]: output },
          sources,
          properties: expand(properties, context)
        };
      }
    }

    if (arch.size === 0) {
      yield* forEachOutput(result);
    } else {
      for (const a of [...arch].sort()) {
        if (variant.restrictArch.size === 0 || variant.restrictArch.has(a)) {
          result.variant.arch = a;
          result.properties.arch = [a];
          yield* forEachOutput(result);
        }
      }
    }
  }
}
