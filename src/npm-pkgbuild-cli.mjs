#!/usr/bin/env node

import { readFileSync } from "fs";
import program from "commander";
import { aggregateFifo } from "aggregate-async-iterator";
import { utf8StreamOptions } from "./util.mjs";
import { FileContentProvider, Deb } from "npm-pkgbuild";

const { version, description } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url).pathname),
  utf8StreamOptions
);

const cwd = process.cwd();

program
  .description(description)
  .version(version)
  .option("--pkgver <version>", "package version")
  .option("-p --package <dir>", "where to put the package(s)", cwd)
  .option("-s --staging <dir>", "staging directory", "build")
  .option("-c --content <dir>", "content directory")
  .option("-m --meta <dir>", "meta directory")
  .option(
    "--publish <url>",
    "publishing url of the package (may also be given as env: PACMAN_PUBLISH)",
    process.env.PACMAN_PUBLISH
  )
  .action(async (options, ...args) => {
    try {
      const sources = [options.content, options.meta]
        .filter(x => x)
        .map(
          source =>
            new FileContentProvider({
              base: source
            }).entries()
        );

      const output = new Deb(aggregateFifo(sources));

      await output.execute();
    } catch (e) {
      console.log(e);
      process.exit(-1);
    }
  })
  .parse(process.argv);
