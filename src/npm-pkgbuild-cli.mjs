#!/usr/bin/env node

import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import program from "commander";
import { aggregateFifo } from "aggregate-async-iterator";
import { packageDirectory } from "pkg-dir";
import { utf8StreamOptions } from "./util.mjs";
import { FileContentProvider, Deb, PKG, RPM } from "npm-pkgbuild";

const { version, description } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url).pathname),
  utf8StreamOptions
);

const cwd = process.cwd();

const outputs = [Deb, PKG, RPM];

program.description(description).version(version);

outputs.forEach(o =>
  program.option(`--${o.name}`, `generate ${o.name} package`)
);

program
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
  .addOption(
    new program.Option("--publish <url>", "publishing url of the package").env(
      "PACMAN_PUBLISH"
    )
  )
  .action(async options => {
    try {
      for (const outputFactory of outputs.filter(
        o => options[o.name] === true
      )) {
        const pkg = JSON.parse(
          await readFile(
            join(await packageDirectory(), "package.json"),
            utf8StreamOptions
          )
        );

        const properties = Object.fromEntries(
          ["name", "version", "description", "homepage"].map(key => [
            key,
            pkg[key]
          ]).filter(([k,v]) => v !== undefined )
        );

        const sources = [...options.content, ...options.meta]
          .filter(x => x)
          .map(source =>
            new FileContentProvider({
              base: source
            }).entries()
          );

        const output = new outputFactory(aggregateFifo(sources), properties);

        const fileName = await output.execute();

        console.log(fileName);
      }
    } catch (e) {
      console.log(e);
      process.exit(-1);
    }
  })
  .parse(process.argv);
