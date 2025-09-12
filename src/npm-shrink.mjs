const nameAndVersion = ["name", "version"];

export function shrinkNPM(
  pkg,
  options = { removeKeys: nameAndVersion, removeDefaults: false }
) {
  const toBeRemoved = [
    "author",
    "authors",
    "auto-changelog",
    "ava",
    "browser",
    "bugs",
    "bundleDependencies",
    "bundlesize",
    "changelog",
    "ci",
    "commitlint",
    "component",
    "config",
    "contributors",
    "coordinates",
    "decription",
    "dependencies",
    "deprecated",
    "description",
    "devDependencies",
    "directories",
    "dojoBuild",
    "ender",
    "engine",
    "engines",
    "env",
    "eslintConfig",
    "eslintIgnore",
    "files",
    "funding",
    "gitHead",
    "greenkeeper",
    "gypfile",
    "hallmark",
    "homepage",
    "husky",
    "icon",
    "ignore",
    "jest",
    "jsdelivr",
    "jsnext:main",
    "jspm",
    "keywords",
    "license",
    "licenses",
    "lint-staged",
    "lintDeps",
    "lintStaged",
    "maintainers",
    "man",
    "node-gyp-build-optional",
    "node-gyp-build-test",
    "nyc",
    "optionalDependencies",
    "optionalDevDependencies",
    "os",
    "packageManager",
    "pacman",
    "peerDependencies",
    "peerDependenciesMeta",
    "pika",
    "pkg",
    "precommit.silent",
    "prettier",
    "private",
    "publishConfig",
    "react-native",
    "readme",
    "readmeFilename",
    "release",
    "remarkConfig",
    "repository",
    "scripts",
    "sharec",
    "shim",
    "sideEffects",
    "source",
    "spm",
    "standard",
    "standard-version",
    "support",
    "systemd",
    "tap",
    "template",
    "testling",
    "typeCoverage",
    "typeScriptVersion",
    "types",
    "typesPublisherContentHash",
    "typesVersions",
    "typings",
    "unpkg",
    "verb",
    "verbiage",
    "xo"
  ];

  toBeRemoved.map(key => delete pkg[key]);

  if (options?.removeKeys) {
    options.removeKeys.map(key => {
      delete pkg[key];
    });
  }

  if (options.removeDefaults) {
    switch (pkg.main) {
      case "index":
      case "./index":
      case "index.js":
      case "./index.js":
      case "":
        delete pkg.main;
    }
  }

  deleteKey(pkg.exports, "types");

  for (const key of Object.keys(pkg)) {
    if (key[0] === "_") {
      delete pkg[key];
    }
  }

  return Object.keys(pkg).length === 0 ? undefined : pkg;
}

/**
 * @param {object} object
 * @param {string} key
 */
function deleteKey(object, key) {
  if (object) {
    delete object[key];

    for (const value of Object.values(object)) {
      if (typeof value === "object" && !Array.isArray(value)) {
        deleteKey(value, key);
      }
    }
  }
}
