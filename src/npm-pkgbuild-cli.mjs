import { version, description } from "../package.json";
import { pkgbuild } from "./pkgbuild";
import { systemd } from "./systemd";
import { pacman } from "./pacman";
import { content } from "./content";
import fs, { createReadStream, createWriteStream } from "fs";
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
  .option("-t --target <dir>", "target directory of the package")
  .option("--npm-modules", "include npm modules")
  .option("--npm-dist", "include npm dist")
  .command("[stages...]", "stages to execute")
  .action(async (...stages) => {
    stages.pop();

    if (program.package === undefined) {
      program.package = process.cwd();
    }
    const staging = program.staging === undefined ? "build" : program.staging;
    let target = program.target;

    await fs.promises.mkdir(staging, { recursive: true });

    const context = await createContext(program.package, program);

    for (const stage of stages) {
      console.log(`executing ${stage}...`);
      switch (stage) {
        case "pkgbuild":
          await pkgbuild(
            context,
            staging,
            createWriteStream(join(staging, "PKGBUILD"), utf8StreamOptions),
            { npmDist: program.npmDist, npmModules: program.npmModules }
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
              name = m[1];
              version = m[2];
            }
          }

          await proc;

          if (target !== undefined) {
            let arch = "any";

            for await (const chunk of createReadStream(
              join(staging, `pkg/${name}/.PKGINFO`),
              {
                encoding: "utf-8"
              }
            )) {
              const r = chunk.match(/arch\s+=\s+(\w+)/);
              if (r) {
                arch = r[1];
              }
            }

            context.properties["arch"] = arch;

            target = target.replace(/\{\{(\w+)\}\}/m,  (match, key, offset, string)  => context.evaluate(key));

            console.log(
              `cp ${name}-${version}-${arch}.pkg.tar.xz ${target}`
            );

            await execa(
              "cp",
              [`${name}-${version}-${arch}.pkg.tar.xz`, target],
              {
                cwd: staging
              }
            );
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
