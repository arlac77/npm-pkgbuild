import { version } from "../package.json";
import { npm2pkgbuild } from "./npm-pkgbuild";
import { createWriteStream } from "fs";
import program from "caporal";

program
  .description("create arch linux package from npm")
  .version(version)
  .action(async (args, options, logger) => {
    npm2pkgbuild(process.cwd(), process.stdout);
  });

program.parse(process.argv);
