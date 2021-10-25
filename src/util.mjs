export const utf8StreamOptions = { encoding: "utf8" };
import { FileContentProvider } from "npm-pkgbuild";

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
 * @returns
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

  let content = [];

  if (pkg.pkgbuild) {
    if (pkg.pkgbuild.content) {
      for (const [name, value] of Object.entries(pkg.pkgbuild.content)) {
        content.push(new FileContentProvider(value));
      }
    }
  }

  return { properties, content };
}
