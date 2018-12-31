import { version } from "../package.json";
import { npm2pkgbuild } from "./npm-pkgbuild";
import { createWriteStream } from "fs";
import program from "caporal";
import { join } from "path";
import execa from "execa";
import { utf8StreamOptions } from "./util";
import fs from "fs";

program
  .description("create arch linux package from npm")
  .version(version)
  .option("-i --installdir <dir>", "install directory", undefined, "/")
  .option("-w <dir>", "workspace directory", undefined, "build")
  .action(async (args, options, logger) => {
    if (options.w !== undefined) {
      const wd = options.w;
      await fs.promises.mkdir(wd, { recursive: true });

      const dest = createWriteStream(join(wd, "PKGBUILD"), utf8StreamOptions);

      await npm2pkgbuild(process.cwd(), wd, dest, {
        installdir: options.installdir
      });

      const r = await execa("makepkg", ["-f"], { cwd: wd });
      console.log(r.stderr);
      console.log(r.stdout);
    } else {
      npm2pkgbuild(process.cwd(), process.stdout);
    }
  });

program.parse(process.argv);
