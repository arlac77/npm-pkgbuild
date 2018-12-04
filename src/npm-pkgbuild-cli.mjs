import { version } from "../package.json";
import { npm2pkgbuild } from "./npm-pkgbuild";
import { createWriteStream } from "fs";
import program from "caporal";
import { join } from "path";
import execa from "execa";
const { promises } = require("fs");

program
  .description("create arch linux package from npm")
  .version(version)
  .option("-w <dir>")
  .action(async (args, options, logger) => {
    if (options.w !== undefined) {
      const wd = options.w;
      const dest = createWriteStream(join(wd, "PKGBUILD"));
      promises.mkdir(wd, { recursive: true });

      npm2pkgbuild(process.cwd(), dest);

      const r = await execa("makepkg", ["-f"], { cwd: wd });
      console.log(r.stderr);
      console.log(r.stdout);
    }
    else {
      npm2pkgbuild(process.cwd(), process.stdout);
    }
  });

program.parse(process.argv);
