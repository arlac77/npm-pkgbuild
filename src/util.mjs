import { join, dirname } from "path";
import { mkdir } from "fs/promises";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { iterableStringInterceptor } from "iterable-string-interceptor";
import { ReadableStreamContentEntry } from "content-entry";
import { FileContentProvider } from "npm-pkgbuild";
import { packageWalker } from "npm-package-walker";

export const utf8StreamOptions = { encoding: "utf8" };

export function quote(v) {
  if (v === undefined) return "";

  if (Array.isArray(v)) {
    return "(" + v.map(x => quote(x)).join(" ") + ")";
  }
  if (typeof v === "number" || v instanceof Number) return v;

  if (typeof v === "string" || v instanceof String)
    return v.match(/^\w+$/) ? v : "'" + v + "'";
}

export function asArray(o) {
  return Array.isArray(o) ? o : [o];
}

/**
 *
 * @param {Object} properties
 * @param {Object} fields
 * @returns {Function}
 */
export function fieldProvider(properties, fields) {
  return function* controlProperties(k, v, presentKeys) {
    if (k === undefined) {
      for (const [name, field] of Object.entries(fields)) {
        if (!presentKeys.has(name)) {
          const value = properties[field.alias || name];
          if (value === undefined) {
            if (field.default === undefined) {
              if (field.mandatory) {
                console.log(`Missing value for mandatory field ${name}`);
              }
            } else {
              yield [name, field.default];
            }
          } else {
            yield [
              name,
              field.type.endsWith("]") && !Array.isArray(value)
                ? [value]
                : value
            ];
          }
        }
      }
    } else {
      yield [k, properties[k] || v];
    }
  };
}

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
    properties.source = pkg.repository.url;
  }

  let dependencies = { ...pkg.engines };
  let sources = [];
  let output = {};

  const processPkg = pkg => {
    if (pkg.pkg) {
      const pkgbuild = pkg.pkg;

      Object.assign(output, pkgbuild.output);

      Object.entries(pkgbuild)
        .filter(([k, v]) => typeof v === "string")
        .forEach(([k, v]) => (properties[k] = v));

      if (pkgbuild.content) {
        sources = Object.entries(pkgbuild.content).map(
          ([destination, value]) =>
            new FileContentProvider(value, { destination })
        );
      }

      Object.assign(dependencies, pkgbuild.depends);
    }
  };

  await packageWalker(async (pkg, base, modulePath) => {
    processPkg(pkg);
    return true;
  }, dir);

  processPkg(pkg);

  return { properties, sources, dependencies, output };
}

export function createModeTransformer(mode, match) {
  return {
    match,
    transform: async entry => Object.create(entry, { mode: { value: mode } })
  };
}

export function createExpressionTransformer(
  properties,
  match = entry => entry.name.match(/\.(conf|json|html|txt|service|socket)$/)
) {
  async function* transformer(expression, remainder, source, cb) {
    const value = properties[expression];
    yield value === undefined ? "" : value;
  }

  return {
    match,
    transform: async entry => {
      const ne = new ReadableStreamContentEntry(
        entry.name,
        iterableStringInterceptor(
          await entry.getReadStream(utf8StreamOptions),
          transformer
        )
      );
      ne.destination = entry.destination; // TODO all the other attributes ?
      return ne;
    }
  };
}

/**
 * Apply transformers.
 * @param {AsyncIterator<ContentEntry>} source
 * @param {Transformer[]} transformers
 * @param {Boolean]} onlyMatching filter out all none matching entries
 */
export async function* transform(source, transformers = [], onlyMatching) {
  const usedTransformers = new Set();

  for await (let entry of source) {
    for (const t of transformers) {
      if (t.match(entry)) {
        entry = await t.transform(entry);
        usedTransformers.add(t);

        if (onlyMatching) {
          yield entry;
        }
      }
    }

    if (!onlyMatching) {
      yield entry;
    }
  }

  for (const t of transformers) {
    if (!usedTransformers.has(t) && t.createEntryWhenMissing !== undefined) {
      yield t.transform(await t.createEntryWhenMissing());
    }
  }
}

/**
 * @typedef {Function} Expander
 * @param {string} path
 * @return {string}
 */

/**
 * Copy content from source into destinationDirectory.
 * @param {AsyncIterator<ContentEntry>} source
 * @param {string} destinationDirectory
 * @param {Expander} expander
 * @param {ContentEntryAttribute[]} attributes
 */
export async function copyEntries(
  source,
  destinationDirectory,
  expander = v => v
) {
  for await (let entry of source) {
    const destination = expander(
      entry.destination === undefined
        ? join(destinationDirectory, entry.name)
        : entry.destination.endsWith("/")
        ? join(destinationDirectory, entry.destination, entry.name)
        : join(destinationDirectory, entry.destination)
    );
    await mkdir(dirname(destination), { recursive: true });

    const options = { mode: entry.mode };

    await pipeline(
      await entry.readStream,
      createWriteStream(destination, options)
    );
  }
}
