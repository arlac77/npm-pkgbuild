import { join } from "path";
import fs from "fs";
import { createContext as ee } from "expression-expander";
import { utf8StreamOptions } from "./util.mjs";

export async function loadPackage(dir) {
  const pkgFile = join(dir, "package.json");
  return JSON.parse(await fs.promises.readFile(pkgFile, utf8StreamOptions));
}

export async function createContext(dir, properties = {}) {
  Object.keys(properties).forEach(k => {
    if (properties[k] === undefined) {
      delete properties[k];
    }
  });

  const pkg = await loadPackage(dir);

  properties = Object.assign({ arch: "any", installdir: "" }, pkg);

  function evaluate(expression) {
    let value = properties[expression];
    return value;
  }

  const eeContext = ee({ evaluate });

  properties = Object.assign(properties, eeContext.expand(pkg.pacman));

  return {
    dir,
    pkg: eeContext.expand(pkg),
    properties,
    evaluate,
    expand: object => eeContext.expand(object)
  };
}
