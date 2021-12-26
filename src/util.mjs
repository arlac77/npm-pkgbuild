import { join, dirname } from "path";
import { mkdir } from "fs/promises";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { iterableStringInterceptor } from "iterable-string-interceptor";
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
 * Extract package definition from package.json.
 * @param {Object} pkg package.json content
 * @param {string} dir
 * @returns {Object}
 */
export async function extractFromPackage(pkg, dir) {
  const properties = Object.fromEntries(
    ["name", "version", "description", "homepage"]
      .map(key => [key, pkg[key]])
      .filter(([k, v]) => v !== undefined)
  );

  if (pkg.bugs) {
    properties.bugs = pkg.bugs.url;
  }

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
    if (pkg.pkgbuild) {
      const pkgbuild = pkg.pkgbuild;

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
    processPkg(pkg)
    return true;
  }, dir);

  processPkg(pkg);

  return { properties, sources, dependencies, output };
}

export function createPropertyTransformer(properties) {
  async function* transformer(expression, remainder, source, cb) {
    console.log("EXPRESSION", expression);
    yield properties[expression];
  }

  return {
    match: entry => true, //entry.name.match(/(conf|json)$/),
    transform: async entry =>
      new ReadableStreamContentEntry(
        entry.name,
        iterableStringInterceptor(transformer)
      )
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
 * Copy content from source into destinationDirectory.
 * @param {AsyncIterator<ContentEntry>} source
 * @param {string} destinationDirectory
 * @param {Function} expander
 * @param {ContentEntryAttribute[]} attributes
 */
export async function copyEntries(
  source,
  destinationDirectory,
  expander = v => v,
  attributes = []
) {
  for await (let entry of source) {
    const destName = expander(
      entry.destination === undefined
        ? join(destinationDirectory, entry.name)
        : entry.destination.endsWith("/")
        ? join(destinationDirectory, entry.destination, entry.name)
        : join(destinationDirectory, entry.destination)
    );
    await mkdir(dirname(destName), { recursive: true });

    const options = { mode: entry.mode };

    for (const a of attributes) {
      if (entry.name.match(a.pattern)) {
        options.mode = a.mode;
      }
    }

    console.log(destName);
    await pipeline(
      await entry.readStream,
      createWriteStream(destName, options)
    );
  }
}
