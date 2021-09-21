import { readFileSync, createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { join } from "path";
import program from "commander";
import { pkgbuild } from "./pkgbuild.mjs";
import { rpmspec } from "./rpmspec.mjs";
import { pacman, makepkg } from "./pacman.mjs";
import { utf8StreamOptions } from "./util.mjs";
import { createContext } from "./context.mjs";
import { utf8StreamOptions } from "./util.mjs";

const { version, description } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url).pathname),
  utf8StreamOptions
);

const cwd = process.cwd();

program
  .description(description)
  .version(version)
  .option("--pkgrel <number>", "package release", 1)
  .option("--pkgver <version>", "package version")
  .option("-p --package <dir>", "package directory", cwd)
  .option("-s --staging <dir>", "staging directory", "build")
  .option(
    "-e --noextract",
    "staging Do not extract source files (use existing $srcdir/ dir)"
  )
  .option(
    "--publish <url>",
    "publishing url of the package (may also be given as env: PACMAN_PUBLISH)",
    process.env.PACMAN_PUBLISH
  )
  .command("[stages...]", "stages to execute")
  .action(async (...stages) => {
    stages.pop();

    try {
      const staging = program.staging;

      await mkdir(staging, { recursive: true });

      const context = await createContext(program.package, program);

      for (const stage of stages) {
        console.log(`Executing ${stage}...`);
        switch (stage) {
          case "rpmspec":
            await rpmspec(
              context,
              staging,
              createWriteStream(
                join(staging, `${context.pkg.name}.spec`),
                utf8StreamOptions
              ),
              { npmDist: program.npmDist, npmModules: program.npmModules }
            );
            break;

          case "pkgbuild":
            await pkgbuild(
              context,
              staging,
              createWriteStream(join(staging, "PKGBUILD"), utf8StreamOptions),
              { npmDist: program.npmDist, npmModules: program.npmModules }
            );
            break;
          case "makepkg":
            makepkg(context, staging, {
              args: program.noextract ? ["-e"] : []
            });
            break;
          case "pacman":
            await pacman(context, staging);
            break;
          default:
            console.error(`Unknown stage ${stage}`);
        }
      }
    } catch (e) {
      console.log(e);
      process.exit(-1);
    }
  })
  .parse(process.argv);
