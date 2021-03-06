#!/usr/bin/env node

import { readFileSync, createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import program from "commander";
import { pkgbuild } from "./pkgbuild.mjs";
import { rpmspec } from "./rpmspec.mjs";
import { systemd } from "./systemd.mjs";
import { pacman, makepkg } from "./pacman.mjs";
import { content } from "./content.mjs";
import { cleanup } from "./cleanup.mjs";
import { utf8StreamOptions } from "./util.mjs";
import { createContext } from "./context.mjs";

const cwd = process.cwd();

const { version, description } = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"),
    { endoding: "utf8" }
  )
);

program
  .description(description)
  .version(version)
  .option("--pkgrel <number>", "package release", 1)
  .option("--pkgver <version>", "package version")
  .option("-p --package <dir>", "package directory", cwd)
  .option("-i --installdir <dir>", "install directory package content base")
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
  .option("--npm-modules", "include npm modules")
  .option("--npm-dist", "include npm dist")
  .arguments("[stages...]", "stages to execute")
  .action(async (stages) => {
    try {
      const options = program.opts();
      const staging = options.staging;

      await mkdir(staging, { recursive: true });

      const context = await createContext(options.package, options);

      for (const stage of stages) {
        console.log(`Executing ${stage}...`);
        switch (stage) {
          case "rpmspec":
            await rpmspec(
              context,
              staging,
              createWriteStream(
                join(staging, `${context.properties.name}.spec`),
                utf8StreamOptions
              ),
              { npmDist: options.npmDist, npmModules: options.npmModules }
            );
            break;

          case "pkgbuild":
            await pkgbuild(
              context,
              staging,
              createWriteStream(join(staging, "PKGBUILD"), utf8StreamOptions),
              { npmDist: options.npmDist, npmModules: options.npmModules }
            );
            break;
          case "makepkg":
            makepkg(context, staging, {
              args: options.noextract ? ["-e"] : []
            });
            break;
          case "systemd":
            await systemd(context, staging);
            break;
          case "pacman":
            await pacman(context, staging);
            break;
          case "content":
            await content(context, staging);
            break;
          case "cleanup":
            await cleanup(context, staging);
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
