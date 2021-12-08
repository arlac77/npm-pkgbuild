import { join, dirname } from "path";
import { mkdir } from "fs/promises";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";

import { FileContentProvider } from "npm-pkgbuild";

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
 * @param {Object} pkg package.json content
 * @returns {Object}
 */
export function extractFromPackage(pkg) {
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

  let sources = [];

  if (pkg.pkgbuild) {
    Object.entries(pkg.pkgbuild)
      .filter(([k, v]) => typeof v === "string")
      .forEach(([k, v]) => (properties[k] = v));

    if (pkg.pkgbuild.content) {
      sources = Object.entries(pkg.pkgbuild.content).map(
        ([destination, value]) => [new FileContentProvider(value), destination]
      );
    }
  }

  return { properties, sources };
}

/**
 * Copy content from source into destinationDirectory
 * @param {AsyncIterator<ContentEntry>} source
 * @param {string} destinationDirectory
 * @param {Transformer[]} transformers
 */
export async function copyEntries(source, destinationDirectory, transformers) {
  for await (let entry of source) {
    const destName = join(destinationDirectory, entry.name);
    await mkdir(dirname(destName), { recursive: true });

    for (const t of transformers) {
      if (t.match(entry)) {
        entry = await t.transform(entry);
      }
    }

    await pipeline(await entry.readStream, createWriteStream(destName));
  }
}
