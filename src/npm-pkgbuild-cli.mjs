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
  .option("-p --package <dir>", "package directory defaults to cwd")
  .option("-i --installdir <dir>", "install directory package content base")
  .option("-s --staging <dir>", "staging directory defaults to build")
  .option("-t --target <dir>", "target directory")
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
    const staging = program.staging === undefined ? "build" : program.staging;

    await fs.promises.mkdir(staging, { recursive: true });

    const context = await createContext(program.package, program);

    for (const stage of stages) {
      console.log(`executing ${stage}...`);
      switch (stage) {
        case "pkgbuild":
          await pkgbuild(
            context,
            staging,
            createWriteStream(join(staging, "PKGBUILD"), utf8StreamOptions)
          );
          break;
        case "makepkg":
          const proc = execa("makepkg", ["-f"], { cwd: staging });

          proc.stdout.pipe(process.stdout);
          //proc.stderr.pipe(process.stderr);

          let name, version;

          for await (const chunk of proc.stderr) {
            const s = chunk.toString("utf8");

            console.log(s);

            const m = s.match(/Finished making:\s+([^\s]+)\s+([^\s]+)/);
            if (m) {
              console.log("VERSION", name, version);
              name = m[1];
              version = m[2];
            }
          }

          await proc;

          if (process.target !== undefined) {
            execa("cp", [`${name}-${version}-any.pkg.tar.xz`, process.target], {
              cwd: staging
            });
          }

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

        default:
          console.error(`unknown stage ${stage}`);
      }
    }
  })
  .parse(process.argv);
