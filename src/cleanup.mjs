import globby from "globby";
import { join, dirname } from "path";
import fs from "fs";
import { utf8StreamOptions } from "./util.mjs";

async function rm(file) {
  try {
    console.log("rm", file);
    return await fs.promises.unlink(file);
  } catch (error) {
    console.log(error);
  }
}

async function iterate(o, cb) {
  switch (typeof o) {
    case 'string':
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

export async function cleanup(context, stagingDir) {
  for (const name of await globby(["**/package.json"], {
    cwd: stagingDir
  })) {
    const pkgFile = join(stagingDir, name);
    console.log(`cleanup ${pkgFile}`);

    const pkg = JSON.parse(
      await fs.promises.readFile(pkgFile, utf8StreamOptions)
    );

    // unused files may also be deleted
    await Promise.all(
      ["types", "unpkg", "shim", "browser", "testling", "source"].map(
        async key => {
          await iterate(pkg[key], async o => { rm(join(dirname(pkgFile), o)) });
          delete pkg[key];
        }
      )
    );

    [
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
      "engines",
      "author",
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
      "component"
    ].map(key => {
      delete pkg[key];
    });

    for (const key of Object.keys(pkg)) {
      if (key[0] === "_") {
        delete pkg[key];
      }
    }

    if (pkg.dependencies && Object.keys(pkg.dependencies).length === 0) {
      delete pkg.dependencies;
    }

    //console.log(pkg, pkgFile);

    await fs.promises.writeFile(
      pkgFile,
      JSON.stringify(pkg),
      utf8StreamOptions
    );
  }
}
