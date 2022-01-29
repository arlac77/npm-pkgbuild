export function shrinkNPM(pkg) {
  [
    "version",
    "name",
    "dependencies",
    "sideEffects",
    "jspm",
    "jsnext:main",
    "man",
    "files",
    "directories",
    "devDependencies",
    "bundleDependencies",
    "peerDependencies",
    "peerDependenciesMeta",
    "optionalDependencies",
    "optionalDevDependencies",
    "sideEffects",
    "pika",
    "private",
    "publishConfig",
    "repository",
    "license",
    "licenses",
    "changelog",
    "keywords",
    "homepage",
    "bugs",
    "scripts",
    "types",
    "deprecated",
    "description",
    "decription",
    "engine",
    "engines",
    "author",
    "authors",
    "contributors",
    "maintainers",
    "verb",
    "xo",
    "prettier",
    "jest",
    "remarkConfig",
    "nyc",
    "ava",
    "publishConfig",
    "typeScriptVersion",
    "typesPublisherContentHash",
    "typings",
    "systemd",
    "pacman",
    "pkg",
    "lintDeps",
    "icon",
    "config",
    "release",
    "template",
    "spm",
    "precommit.silent",
    "greenkeeper",
    "bundlesize",
    "standard",
    "ignore",
    "ender",
    "dojoBuild",
    "component",
    "eslintConfig",
    "env",
    "commitlint",
    "standard-version",
    "lint-staged",
    "lintStaged",
    "ci",
    "husky",
    "verbiage",
    "os",
    "gypfile",
    "coordinates",
    "tap",
    "typesVersions",
    "typeCoverage",
    "node-gyp-build-optional",
    "node-gyp-build-test",
    "gitHead",
    "hallmark",
    "funding",
    "eslintIgnore",
    "react-native",
    "sharec",
    "source",
    "support",
    "auto-changelog",
    "readmeFilename",
    "readme",
    "node-gyp-build-optional",
    "node-gyp-build-test"
  ].map(key => {
    delete pkg[key];
  });

  switch (pkg.main) {
    case "index":
    case "./index":
    case "index.js":
    case "./index.js":
    case "":
      delete pkg.main;
  }

  for (const key of Object.keys(pkg)) {
    if (key[0] === "_") {
      delete pkg[key];
    }
  }

  for (const toBeRemoved of ["types", "unpkg", "shim", "browser", "testling"]) {
    // TODO mark files as to be skipped

    delete pkg[toBeRemoved];
  }

  return Object.keys(pkg).length === 0 ? undefined : pkg
}

