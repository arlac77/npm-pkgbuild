import { join } from "path";
import fs from "fs";
import { createContext as ee } from "expression-expander";
import { utf8StreamOptions } from "./util.mjs";

export async function loadPackage(dir) {
  const pkgFile = join(dir, "package.json");
  return JSON.parse(await fs.promises.readFile(pkgFile, utf8StreamOptions));
}

/**
 * Used as a reference througout the runtime of the npm-pkgbuild
 * @param {string} dir
 * @param {Object} properties
 */
export async function createContext(dir, properties = {}) {
  Object.keys(properties).forEach(k => {
    if (properties[k] === undefined) {
      delete properties[k];
    }
  });

  const pkg = { pacman: {}, ...(await loadPackage(dir)) };

  properties = {
    arch: "any",
    installdir: "",
    pkgver: pkg.version,
    ...pkg,
    ...properties
  };

  function evaluate(expression) {
    expression = expression.trim();
    let value = properties[expression];
    if (value !== undefined) {
      return value;
    }

    if (pkg.config !== undefined) {
      value = pkg.config;

      for (const p of expression.split(/\./)) {
        value = value[p];

        if (value === undefined) {
          break;
        }
      }
    }

    if (typeof value === "string") {
      return eeContext.expand(value);
    }

    return value;
  }

  const eeContext = ee({ evaluate });

  properties = Object.assign(
    properties,
    eeContext.expand(pkg.pacman),
    eeContext.expand(pkg.pacman.properties)
  );

  return {
    dir,
    pkg: eeContext.expand(pkg),
    properties,
    evaluate,
    expand: object => eeContext.expand(object)
  };
}
