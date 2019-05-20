import globby from "globby";
import { join, basename } from "path";
import fs from "fs";
import { asArray } from "./util.mjs";

const encodingOptions = { encoding: "utf8" };

export async function cleanup(context, stagingDir) {
  for (const name of await globby(["**/package.json"], {
    cwd: stagingDir
  })) {
    const file = join(stagingDir, name);
    console.log(`cleanup ${file}`);

    const pkg = JSON.parse(await fs.promises.readFile(file, encodingOptions));

    //console.log(pkg);

    delete pkg.browser;
    delete pkg.files;
    delete pkg.directories;
    delete pkg.man;
    delete pkg.testling;

    delete pkg.devDependencies;
    delete pkg.bundleDependencies;
    delete pkg.peerDependencies;
    delete pkg.optionalDependencies;

    delete pkg.private;
    delete pkg.repository;
    delete pkg.license;
    delete pkg.changelog;
    delete pkg.keywords;
    delete pkg.homepage;
    delete pkg.bugs;
    delete pkg.scripts;
    delete pkg.types;
    delete pkg.deprecated;
    delete pkg.description;
    delete pkg.engines;
    delete pkg.author;
    delete pkg.contributors;
    delete pkg.maintainers;
    delete pkg.verb;
    delete pkg.xo;
    delete pkg.prettier;
    delete pkg.jest;
    delete pkg.remarkConfig;
    delete pkg.nyc;
    delete pkg.publishConfig;

    for (const key of Object.keys(pkg)) {
      if (key[0] === "_") {
        delete pkg[key];
      }
    }

    await fs.promises.writeFile(file, JSON.stringify(pkg), encodingOptions);
  }
}
