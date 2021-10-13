import { unlink, readFile, writeFile } from "fs/promises";
import { globby} from "globby";
import { join, dirname } from "path";
import { utf8StreamOptions } from "./util.mjs";

async function rm(file) {
  try {
    console.log("rm", file);
    return await unlink(file);
  } catch (error) {
    console.log(error);
  }
}

async function iterate(o, cb) {
  switch (typeof o) {
    case "string":
      return cb(o);
  }

  if (Array.isArray(o)) {
    for (const x of o) {
      await iterate(x, cb);
    }
  }
  for (const k in o) {
    await iterate(o[k], cb);
  }
}

const blacklist = new Set(["parse-client-options", "@octokit/rest"]);

export async function cleanup(context, stagingDir) {
  for (const name of await globby(["**/package.json"], {
    cwd: stagingDir
  })) {
    const pkgFile = join(stagingDir, name);
    const pkg = JSON.parse(await readFile(pkgFile, utf8StreamOptions));

    if (!blacklist.has(pkg.name)) {
      console.log(`cleanup ${pkgFile}`);

      // unused files may also be deleted
      await Promise.all(
        ["types", "unpkg", "shim", "browser", "testling", "source"].map(
          async key => {
            await iterate(pkg[key], async o => rm(join(dirname(pkgFile), o)));
            delete pkg[key];
          }
        )
      );

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
        "optionalDependencies",
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
        "node-gyp-build-optional",
        "node-gyp-build-test",
        "gitHead",
        "hallmark",
        "funding",
        "eslintIgnore",
        "react-native",
        "sharec"
      ].map(key => {
        delete pkg[key];
      });

      for (const key of Object.keys(pkg)) {
        if (key[0] === "_") {
          delete pkg[key];
        }
      }

      switch (pkg.main) {
        case "index":
        case "./index":
        case "index.js":
        case "./index.js":
        case "":
          delete pkg.main;
      }

      if (Object.keys(pkg).length === 0 || pkg.type === "module") {
        await unlink(pkgFile);
      } else {
        await writeFile(pkgFile, JSON.stringify(pkg), utf8StreamOptions);
      }
    }
  }
}
