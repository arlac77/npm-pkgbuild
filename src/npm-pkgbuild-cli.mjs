import { version } from "../package.json";
import { pkgbuild } from "./pkgbuild";
import { systemd } from "./systemd";
import { createWriteStream } from "fs";
import program from "caporal";
import { join } from "path";
import execa from "execa";
import { utf8StreamOptions, createContext } from "./util";
import fs from "fs";

program
  .description("create arch linux package from npm")
  .version(version)
  .option("-p --package <dir>", "package directory", undefined, process.cwd())
  .option("-i --installdir <dir>", "install directory package content base")
  .option("-o --output <dir>", "output directory", undefined, "build")
  .argument(
    "[stages...]",
    "stages to execute",
    /pkgbuild|makepkg|systemd/,
    "pkgbuild"
  )
  .action(async (args, options, logger) => {
    const stagingDir = options.output;
    await fs.promises.mkdir(stagingDir, { recursive: true });

    const context = await createContext(options.package, options);

    for (const stage of args.stages) {
      logger.info(`executing ${stage}...`);
      switch (stage) {
        case "pkgbuild":
          await pkgbuild(
            context,
            stagingDir,
            createWriteStream(join(stagingDir, "PKGBUILD"), utf8StreamOptions)
          );
          break;
        case "makepkg":
          await execa("ln", ["-s", "..", "src"], { cwd: stagingDir });
          const r = await execa("makepkg", ["-s", "-f"], { cwd: stagingDir });
          console.log(r.stderr);
          console.log(r.stdout);
          break;
        case "systemd":
          await systemd(context, stagingDir);
          break;

        default:
          logger.error(`unknown stage ${stage}`);
      }
    }
  });

program.parse(process.argv);
