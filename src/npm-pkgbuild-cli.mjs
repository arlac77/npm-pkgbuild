#!/usr/bin/env node

import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import program from "commander";
import { aggregateFifo } from "aggregate-async-iterator";
import { createContext } from "expression-expander";
import { packageDirectory } from "pkg-dir";
import { utf8StreamOptions, extractFromPackage } from "./util.mjs";
import { FileContentProvider, DEB, PKG, RPM } from "npm-pkgbuild";

const { version, description } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url).pathname),
  utf8StreamOptions
);

const cwd = process.cwd();

const allOutputs = [DEB, PKG, RPM];

program.description(description).version(version);

allOutputs.forEach(o =>
  program.option(`--${o.name}`, `generate ${o.name} package`)
);

program
  .option("-D --define <a=b>", "define property", str => {
    const kv = str.split(/=/);
    return Object.fromEntries([kv]);
  })
  .option("-d --destination <dir>", "where to put the package(s)", cwd)
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
      const pkgDir = await packageDirectory();

      const { properties, sources, output } = await extractFromPackage(
        JSON.parse(
          await readFile(
            join(pkgDir, "package.json"),
            utf8StreamOptions
          )
        ),
        pkgDir
      );

      for (const outputFactory of allOutputs.filter(
        o => options[o.name] === true || output[o.name] !== undefined
      )) {
        Object.assign(properties, options.define);

        sources.push(
          ...[...options.content, ...options.meta]
            .filter(x => x)
            .map(
              source =>
                new FileContentProvider({
                  base: source
                })
            )
        );

        const context = createContext({ properties });
        const output = new outputFactory(properties);

        const fileName = await output.execute(
          aggregateFifo(sources.map(c => c[Symbol.asyncIterator]())),
          options,
          object => context.expand(object)
        );

        console.log(fileName);
      }
    } catch (e) {
      console.log(e);
      process.exit(-1);
    }
  })
  .parse(process.argv);
