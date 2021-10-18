#!/usr/bin/env node

import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import program from "commander";
import { aggregateFifo } from "aggregate-async-iterator";
import { packageDirectory } from "pkg-dir";
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
  .option(
    "-c --content <dir>",
    "content directory",
    (c, a) => a.concat([c]),
    []
  )
  .option("-m --meta <dir>", "meta directory", (c, a) => a.concat([c]), [])
  .option("--debian", "generate debian package")
  .addOption(
    new program.Option("--publish <url>", "publishing url of the package").env(
      "PACMAN_PUBLISH"
    )
  )
  .action(async options => {
    try {
      const pkg = JSON.parse(
        await readFile(
          join(await packageDirectory(), "package.json"),
          utf8StreamOptions
        )
      );

      const properties = Object.fromEntries(
        ["name", "version", "description"].map(key => [key, pkg[key]])
      );

      console.log(properties);

      const sources = [...options.content, ...options.meta]
        .filter(x => x)
        .map(source =>
          new FileContentProvider({
            base: source
          }).entries()
        );

      const output = new Deb(aggregateFifo(sources), properties);

      await output.execute();
    } catch (e) {
      console.log(e);
      process.exit(-1);
    }
  })
  .parse(process.argv);
