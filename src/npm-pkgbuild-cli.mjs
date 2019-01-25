import { version, description } from "../package.json";
import { pkgbuild } from "./pkgbuild";
import { systemd } from "./systemd";
import { pacman } from "./pacman";
import { content } from "./content";
import fs, { createWriteStream } from "fs";
import program from "commander";
import { join } from "path";
import execa from "execa";
import { utf8StreamOptions } from "./util";
import { createContext } from "./context";

program
  .description(description)
  .version(version)
  .option("-p --package <dir>", "package directory")
  .option("-i --installdir <dir>", "install directory package content base")
  .option("-o --output <dir>", "output directory")
  .command(
    "[stages...]",
    "stages to execute",
    /pkgbuild|makepkg|content|systemd|pacman/,
    "pkgbuild"
  )
  .action(async (...stages) => {
    stages.pop();

    if (program.package === undefined) {
      program.package = process.cwd();
    }
    if (program.output === undefined) {
      program.output = "build";
    }

    const stagingDir = program.output;
    await fs.promises.mkdir(stagingDir, { recursive: true });

    const context = await createContext(program.package, program);

    for (const stage of stages) {
      console.log(`executing ${stage}...`);
      switch (stage) {
        case "pkgbuild":
          await pkgbuild(
            context,
            stagingDir,
            createWriteStream(join(stagingDir, "PKGBUILD"), utf8StreamOptions)
          );
          break;
        case "makepkg":
          const proc = execa("makepkg", ["-f"], { cwd: stagingDir });

          proc.stdout.pipe(process.stdout);
          proc.stderr.pipe(process.stderr);

          await proc;
          break;
        case "systemd":
          await systemd(context, stagingDir);
          break;
        case "pacman":
          await pacman(context, stagingDir);
          break;
        case "content":
          await content(context, stagingDir);
          break;

        default:
          console.error(`unknown stage ${stage}`);
      }
    }
  })
  .parse(process.argv);
