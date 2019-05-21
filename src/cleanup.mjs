import globby from "globby";
import { join, basename } from "path";
import fs from "fs";
import { asArray, utf8StreamOptions } from "./util.mjs";

async function rm(file) {
  try {
    console.log("rm", file);
    return await fs.promises.unlink(file);
  } catch (error) {
    console.log(error);
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
      ["unpkg", "jspm", "shim", "browser", "testling", "source"].map(
        async key => {
          if (pkg[key] !== undefined) {
            if (typeof pkg[key] !== "string") {
              const o = pkg[key];
              for (const k of o) {
                await rm(join(stagingDir, o[k]));
              }
              delete pkg[key];
            } else {
              const file = join(stagingDir, pkg[key]);
              delete pkg[key];
              return rm(file);
            }
          }
        }
      )
    );

    [
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
      "precommit.silent"
    ].map(key => {
      delete pkg[key];
    });

    for (const key of Object.keys(pkg)) {
      if (key[0] === "_") {
        delete pkg[key];
      }
    }

    await fs.promises.writeFile(
      pkgFile,
      JSON.stringify(pkg),
      utf8StreamOptions
    );
  }
}
