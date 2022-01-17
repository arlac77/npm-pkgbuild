#!/usr/bin/env node

import { readFileSync } from "fs";
import { readFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import program from "commander";
import { aggregateFifo } from "aggregate-async-iterator";
import { createContext } from "expression-expander";
import { packageDirectory } from "pkg-dir";
import {
  createExpressionTransformer,
  nameExtensionMatcher
} from "content-entry-transform";
import { utf8StreamOptions } from "./util.mjs";
import {
  FileContentProvider,
  allInputs,
  allOutputs,
  extractFromPackage
} from "npm-pkgbuild";

const { version, description } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url).pathname),
  utf8StreamOptions
);

const cwd = process.cwd();

program.description(description).version(version);

allOutputs.forEach(o => program.option(`--${o.name}`, o.description));
allInputs.forEach(i => program.option(`--${i.name}`, i.description));

program
  .option("--verbose", "be more verbose", false)
  .option("-D --define <a=b>", "define property", str =>
    Object.fromEntries([str.split(/=/)])
  )
  .option(
    "-d --destination <dir>",
    "where to put the package(s)",
    join(cwd, "dist")
  )
  .option("-p --pkgdir <dir>", "which package to use", process.cwd())
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
      const pkgDir = await packageDirectory({ cwd: options.pkgdir });

      if (options.verbose) {
        console.log(`pkgdir: ${pkgDir}`);
      }

      const { properties, sources, output, dependencies } =
        await extractFromPackage(
          JSON.parse(
            await readFile(join(pkgDir, "package.json"), utf8StreamOptions)
          ),
          pkgDir
        );

      for (const inputFactory of allInputs.filter(
        inputFactory => options[inputFactory.name] === true
      )) {
        sources.push(new inputFactory());
      }

      await mkdir(dirname(options.destination), { recursive: true });

      for (const outputFactory of allOutputs.filter(
        o => options[o.name] === true || output[o.name] !== undefined
      )) {
        Object.assign(properties, options.define);

        for (const [k, v] of Object.entries(properties)) {
          if (typeof v === "string") {
            properties[k] = v.replace(
              /\$\{([^\}]+)\}/m,
              (m, k) => properties[k]
            );
          }
        }

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
        const output = new outputFactory(context.expand(properties));
        const transformer = [
          createExpressionTransformer(
            nameExtensionMatcher([
              ".conf",
              ".json",
              ".html",
              ".txt",
              ".service",
              ".socket"
            ]),
            properties
          )
        ];

        if (options.verbose) {
          console.log(output.properties);
        }

        const fileName = await output.execute(
          aggregateFifo(sources.map(c => c[Symbol.asyncIterator]())),
          transformer,
          dependencies,
          options,
          path => context.expand(path)
        );

        /*
        console.log(`#<CI>publish ${fileName}`);

        if (publish !== undefined) {
          context.properties.arch = arch;
      
          publish = publish.replace(/\{\{(\w+)\}\}/m, (match, key, offset, string) =>
            context.evaluate(key)
          );
      */
      }
    } catch (e) {
      console.log(e);
      process.exit(-1);
    }
  })
  .parse(process.argv);
