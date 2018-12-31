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
  .option("-i --installdir <dir>", "install directory")
  .option("-w <dir>", "workspace directory", undefined, "build")
  .argument(
    "[stages...]",
    "stages to execute",
    /pkgbuild|makepkg|systemd/,
    "pkgbuild"
  )
  .action(async (args, options, logger) => {
    const stagingDir = options.w;
    await fs.promises.mkdir(stagingDir, { recursive: true });

    const context = await createContext(process.cwd(), options);

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
          const r = await execa("makepkg", ["-f"], { cwd: wd });
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
