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

const outputs = { debian : Deb };


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
  .option("--rpm", "generate rpm package")
  .addOption(
    new program.Option("--publish <url>", "publishing url of the package").env(
      "PACMAN_PUBLISH"
    )
  )
  .action(async options => {
    try {
      for(const on of Object.keys(outputs).filter(on => options[on] === true)) {
        const of = outputs[on];

	    console.log(of);

      const pkg = JSON.parse(
        await readFile(
          join(await packageDirectory(), "package.json"),
          utf8StreamOptions
        )
      );

      const properties = Object.fromEntries(
        ["name", "version", "description"].map(key => [key, pkg[key]])
      );

      const sources = [...options.content, ...options.meta]
        .filter(x => x)
        .map(source =>
          new FileContentProvider({
            base: source
          }).entries()
        );

      const output = new of(aggregateFifo(sources), properties);

      const fileName = await output.execute();

      console.log(fileName);
      }
    } catch (e) {
      console.log(e);
      process.exit(-1);
    }
  })
  .parse(process.argv);
